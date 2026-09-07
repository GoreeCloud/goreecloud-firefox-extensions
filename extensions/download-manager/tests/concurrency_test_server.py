#!/usr/bin/env python3
"""Controlled HTTP/Range server for GoreeCloud Download Manager concurrency acceptance.

This server exposes eight deterministic 64 MiB downloads with distinct filenames.
Ordinary full-body GETs are throttled separately from HTTP Range requests so both
Firefox-engine and native segmented jobs remain active long enough to inspect queue
behavior. The /status endpoint exposes request concurrency evidence and /reset clears
only the in-memory counters.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import threading
import time
from collections import Counter
from email.utils import formatdate
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit

DEFAULT_HOST = "127.0.0.1"
DEFAULT_PORT = 8767
DEFAULT_SIZE = 64 * 1024 * 1024
CHUNK_SIZE = 64 * 1024
FULL_GET_DELAY = 0.03
RANGE_GET_DELAY = 0.12
DOWNLOAD_COUNT = 8

COUNTER_LOCK = threading.Lock()
ACTIVE_REQUESTS = 0
PEAK_REQUESTS = 0
ACTIVE_PATHS: Counter[str] = Counter()
REQUEST_COUNTS: Counter[str] = Counter()
REQUEST_SEQUENCE = 0


def reset_counters() -> None:
    global ACTIVE_REQUESTS, PEAK_REQUESTS, REQUEST_SEQUENCE
    with COUNTER_LOCK:
        ACTIVE_REQUESTS = 0
        PEAK_REQUESTS = 0
        ACTIVE_PATHS.clear()
        REQUEST_COUNTS.clear()
        REQUEST_SEQUENCE = 0


def begin_request(path: str) -> tuple[int, int]:
    global ACTIVE_REQUESTS, PEAK_REQUESTS, REQUEST_SEQUENCE
    with COUNTER_LOCK:
        REQUEST_SEQUENCE += 1
        request_id = REQUEST_SEQUENCE
        ACTIVE_REQUESTS += 1
        PEAK_REQUESTS = max(PEAK_REQUESTS, ACTIVE_REQUESTS)
        ACTIVE_PATHS[path] += 1
        REQUEST_COUNTS[path] += 1
        return request_id, ACTIVE_REQUESTS


def finish_request(path: str) -> int:
    global ACTIVE_REQUESTS
    with COUNTER_LOCK:
        ACTIVE_REQUESTS = max(0, ACTIVE_REQUESTS - 1)
        ACTIVE_PATHS[path] -= 1
        if ACTIVE_PATHS[path] <= 0:
            ACTIVE_PATHS.pop(path, None)
        return ACTIVE_REQUESTS


def snapshot() -> dict:
    with COUNTER_LOCK:
        return {
            "activeRequests": ACTIVE_REQUESTS,
            "peakRequests": PEAK_REQUESTS,
            "activePaths": dict(sorted(ACTIVE_PATHS.items())),
            "requestCounts": dict(sorted(REQUEST_COUNTS.items())),
        }


def parse_range(value: str | None, size: int) -> tuple[int, int] | None:
    if not value:
        return None
    value = value.strip()
    if not value.startswith("bytes=") or "," in value:
        raise ValueError("unsupported Range header")
    spec = value[6:]
    if "-" not in spec:
        raise ValueError("invalid Range header")
    left, right = spec.split("-", 1)
    if not left and not right:
        raise ValueError("invalid Range header")

    if left:
        start = int(left)
        end = int(right) if right else size - 1
    else:
        suffix = int(right)
        if suffix <= 0:
            raise ValueError("invalid suffix range")
        start = max(0, size - suffix)
        end = size - 1

    if start < 0 or start >= size or end < start:
        raise ValueError("unsatisfiable range")
    return start, min(end, size - 1)


class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"
    server_version = "GoreeCloudConcurrencyTest/1.0"

    @property
    def payload(self) -> Path:
        return self.server.payload  # type: ignore[attr-defined]

    @property
    def payload_size(self) -> int:
        return self.server.payload_size  # type: ignore[attr-defined]

    @property
    def payload_sha256(self) -> str:
        return self.server.payload_sha256  # type: ignore[attr-defined]

    def log_message(self, fmt: str, *args) -> None:
        return

    def do_HEAD(self) -> None:
        path = urlsplit(self.path).path
        if self._download_number(path) is None:
            self.send_error(404)
            return
        self._serve_download(path, head_only=True)

    def do_GET(self) -> None:
        path = urlsplit(self.path).path
        if path == "/status":
            self._send_json(snapshot())
            return
        if path == "/reset":
            reset_counters()
            self._send_json({"reset": True})
            return
        if self._download_number(path) is None:
            self.send_error(404)
            return
        self._serve_download(path, head_only=False)

    def _download_number(self, path: str) -> int | None:
        prefix = "/goreecloud-concurrency-"
        suffix = ".bin"
        if not path.startswith(prefix) or not path.endswith(suffix):
            return None
        token = path[len(prefix) : -len(suffix)]
        if not token.isdigit():
            return None
        number = int(token)
        return number if 1 <= number <= DOWNLOAD_COUNT else None

    def _send_json(self, value: dict) -> None:
        body = (json.dumps(value, indent=2, sort_keys=True) + "\n").encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _common_headers(self, filename: str) -> None:
        self.send_header("Accept-Ranges", "bytes")
        self.send_header("ETag", f'"{self.payload_sha256}"')
        self.send_header("Last-Modified", formatdate(self.payload.stat().st_mtime, usegmt=True))
        self.send_header("Content-Type", "application/octet-stream")
        self.send_header("Content-Disposition", f'attachment; filename="{filename}"')
        self.send_header("Cache-Control", "no-store")

    def _serve_download(self, path: str, head_only: bool) -> None:
        filename = path.lstrip("/")
        range_header = self.headers.get("Range")
        try:
            byte_range = parse_range(range_header, self.payload_size)
        except (TypeError, ValueError):
            self.send_response(416)
            self.send_header("Content-Range", f"bytes */{self.payload_size}")
            self.send_header("Content-Length", "0")
            self.end_headers()
            return

        if byte_range is None:
            start, end = 0, self.payload_size - 1
            status = 200
        else:
            start, end = byte_range
            status = 206

        length = end - start + 1
        self.send_response(status)
        self._common_headers(filename)
        self.send_header("Content-Length", str(length))
        if status == 206:
            self.send_header("Content-Range", f"bytes {start}-{end}/{self.payload_size}")
        self.end_headers()

        if head_only:
            print(
                f"HEAD {path} status={status} range={range_header or '-'}",
                flush=True,
            )
            return

        request_id, active = begin_request(path)
        print(
            f"START #{request_id} {path} status={status} range={range_header or '-'} "
            f"active={active}",
            flush=True,
        )

        remaining = length
        delay = RANGE_GET_DELAY if status == 206 else FULL_GET_DELAY
        try:
            with self.payload.open("rb") as handle:
                handle.seek(start)
                while remaining:
                    chunk = handle.read(min(CHUNK_SIZE, remaining))
                    if not chunk:
                        break
                    self.wfile.write(chunk)
                    remaining -= len(chunk)
                    if remaining:
                        time.sleep(delay)
        except (BrokenPipeError, ConnectionResetError):
            pass
        finally:
            active_after = finish_request(path)
            print(
                f"END   #{request_id} {path} sent={length - remaining}/{length} "
                f"active={active_after}",
                flush=True,
            )


def ensure_payload(path: Path, size: int) -> str:
    path.parent.mkdir(parents=True, exist_ok=True)
    if not path.exists() or path.stat().st_size != size:
        with path.open("wb") as handle:
            handle.truncate(size)

    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--host", default=DEFAULT_HOST)
    parser.add_argument("--port", type=int, default=DEFAULT_PORT)
    parser.add_argument("--size", type=int, default=DEFAULT_SIZE)
    parser.add_argument(
        "--payload",
        type=Path,
        default=Path("/tmp/goreecloud-download-manager-concurrency-test/payload.bin"),
    )
    args = parser.parse_args()

    sha256 = ensure_payload(args.payload, args.size)
    server = ThreadingHTTPServer((args.host, args.port), Handler)
    server.payload = args.payload  # type: ignore[attr-defined]
    server.payload_size = args.size  # type: ignore[attr-defined]
    server.payload_sha256 = sha256  # type: ignore[attr-defined]

    print(f"Payload: {args.payload}", flush=True)
    print(f"Size: {args.size} bytes", flush=True)
    print(f"SHA-256: {sha256}", flush=True)
    print(f"Status: http://{args.host}:{args.port}/status", flush=True)
    print(f"Reset:  http://{args.host}:{args.port}/reset", flush=True)
    print("Batch URLs:", flush=True)
    for number in range(1, DOWNLOAD_COUNT + 1):
        print(
            f"  http://{args.host}:{args.port}/goreecloud-concurrency-{number:02d}.bin",
            flush=True,
        )
    print("Press Ctrl+C to stop.", flush=True)
    server.serve_forever()


if __name__ == "__main__":
    main()
