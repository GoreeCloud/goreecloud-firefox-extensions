#!/usr/bin/env python3
"""Controlled HTTP range server for GoreeCloud Download Manager acceptance tests."""

from __future__ import annotations

import argparse
import hashlib
import re
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

DEFAULT_SIZE = 256 * 1024 * 1024
CHUNK = 64 * 1024
DELAY_SECONDS = 0.05
ROUTE = "/goreecloud-range-test.bin"


def ensure_payload(path: Path, size: int) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists() and path.stat().st_size == size:
        return
    with path.open("wb") as output:
        output.truncate(size)


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for block in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def handler_for(path: Path, delay: float):
    size = path.stat().st_size
    etag = f'"{sha256_file(path)}"'

    class RangeHandler(BaseHTTPRequestHandler):
        protocol_version = "HTTP/1.1"

        def common_headers(self) -> None:
            self.send_header("Accept-Ranges", "bytes")
            self.send_header("ETag", etag)
            self.send_header("Content-Type", "application/octet-stream")
            self.send_header("Content-Disposition", 'attachment; filename="goreecloud-range-test.bin"')
            self.send_header("Cache-Control", "no-store")

        def do_HEAD(self) -> None:
            if self.path != ROUTE:
                self.send_error(404)
                return
            self.send_response(200)
            self.common_headers()
            self.send_header("Content-Length", str(size))
            self.end_headers()

        def do_GET(self) -> None:
            if self.path != ROUTE:
                self.send_error(404)
                return

            start = 0
            end = size - 1
            status = 200
            raw_range = self.headers.get("Range")
            if raw_range:
                match = re.fullmatch(r"bytes=(\d+)-(\d*)", raw_range.strip())
                if not match:
                    self.send_error(400, "Unsupported Range header")
                    return
                start = int(match.group(1))
                if start >= size:
                    self.send_response(416)
                    self.send_header("Content-Range", f"bytes */{size}")
                    self.send_header("Content-Length", "0")
                    self.end_headers()
                    return
                if match.group(2):
                    end = min(int(match.group(2)), size - 1)
                if end < start:
                    self.send_error(416)
                    return
                status = 206

            length = end - start + 1
            self.send_response(status)
            self.common_headers()
            self.send_header("Content-Length", str(length))
            if status == 206:
                self.send_header("Content-Range", f"bytes {start}-{end}/{size}")
            self.end_headers()

            with path.open("rb") as source:
                source.seek(start)
                remaining = length
                while remaining:
                    block = source.read(min(CHUNK, remaining))
                    if not block:
                        break
                    self.wfile.write(block)
                    self.wfile.flush()
                    remaining -= len(block)
                    if delay:
                        time.sleep(delay)

        def log_message(self, fmt: str, *args) -> None:
            print(f"[{self.log_date_time_string()}] {self.address_string()} {fmt % args}", flush=True)

    return RangeHandler


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8765)
    parser.add_argument("--size-mib", type=int, default=256)
    parser.add_argument("--delay", type=float, default=DELAY_SECONDS)
    parser.add_argument("--file", type=Path, default=Path("/tmp/goreecloud-download-manager-range-test/goreecloud-range-test.bin"))
    args = parser.parse_args()

    size = max(8, args.size_mib) * 1024 * 1024
    ensure_payload(args.file, size)
    digest = sha256_file(args.file)
    server = ThreadingHTTPServer((args.host, args.port), handler_for(args.file, max(0.0, args.delay)))

    print(f"Serving {args.file} ({size} bytes)")
    print(f"SHA-256: {digest}")
    print(f"URL: http://{args.host}:{args.port}{ROUTE}")
    print("Press Ctrl+C to stop.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
