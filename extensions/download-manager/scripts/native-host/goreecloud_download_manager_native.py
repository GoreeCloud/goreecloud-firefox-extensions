#!/usr/bin/env python3
import concurrent.futures
import json
import os
import re
import shutil
import struct
import sys
import threading
import time
import urllib.parse
import urllib.request
from pathlib import Path

VERSION = "0.2.0"
USER_AGENT = f"GoreeCloudDownloadManager/{VERSION}"
WRITE_LOCK = threading.Lock()
DESTINATION_LOCK = threading.Lock()
JOBS = {}


def send(obj):
    raw = json.dumps(obj, separators=(",", ":")).encode("utf-8")
    with WRITE_LOCK:
        sys.stdout.buffer.write(struct.pack("=I", len(raw)))
        sys.stdout.buffer.write(raw)
        sys.stdout.buffer.flush()


def recv():
    header = sys.stdin.buffer.read(4)
    if not header:
        return None
    length = struct.unpack("=I", header)[0]
    if length <= 0 or length > 16 * 1024 * 1024:
        return None
    payload = sys.stdin.buffer.read(length)
    if len(payload) != length:
        return None
    return json.loads(payload.decode("utf-8"))


def safe_filename(name):
    name = os.path.basename(name or "download.bin")
    name = re.sub(r"[\x00-\x1f<>:\"/\\|?*]", "_", name).strip(" .")
    return name or "download.bin"


def safe_job_id(value):
    return re.sub(r"[^A-Za-z0-9._-]", "_", str(value))[:160] or "job"


def name_from_url(url):
    path = urllib.parse.urlparse(url).path
    return safe_filename(urllib.parse.unquote(os.path.basename(path)) or "download.bin")


def content_disposition_name(value):
    if not value:
        return None
    match = re.search(r"filename\*=UTF-8''([^;]+)", value, re.I)
    if match:
        return safe_filename(urllib.parse.unquote(match.group(1)))
    match = re.search(r'filename="?([^";]+)', value, re.I)
    return safe_filename(match.group(1)) if match else None


def filtered_request_headers(value):
    if not isinstance(value, dict):
        return {}
    allowed = {"cookie": "Cookie", "referer": "Referer"}
    out = {}
    for key, raw in value.items():
        canonical = allowed.get(str(key).lower())
        if not canonical:
            continue
        text = str(raw)
        if "\r" in text or "\n" in text:
            continue
        out[canonical] = text
    return out


def probe(url, request_headers=None):
    headers = {"User-Agent": USER_AGENT, "Accept-Encoding": "identity", **(request_headers or {})}
    req = urllib.request.Request(url, method="HEAD", headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            size = int(response.headers.get("Content-Length", "-1"))
            ranges = response.headers.get("Accept-Ranges", "").lower() == "bytes"
            return {
                "size": size,
                "ranges": ranges,
                "etag": response.headers.get("ETag"),
                "last_modified": response.headers.get("Last-Modified"),
                "content_disposition": response.headers.get("Content-Disposition"),
            }
    except Exception:
        req = urllib.request.Request(url, headers={**headers, "Range": "bytes=0-0"})
        with urllib.request.urlopen(req, timeout=30) as response:
            content_range = response.headers.get("Content-Range", "")
            match = re.search(r"/(\d+)$", content_range)
            size = int(match.group(1)) if match else int(response.headers.get("Content-Length", "-1"))
            return {
                "size": size,
                "ranges": response.status == 206,
                "etag": response.headers.get("ETag"),
                "last_modified": response.headers.get("Last-Modified"),
                "content_disposition": response.headers.get("Content-Disposition"),
            }


def uniquify_path(path):
    with DESTINATION_LOCK:
        reserved = {
            str(job.destination)
            for job in JOBS.values()
            if getattr(job, "destination", None) is not None
        }
        if not path.exists() and str(path) not in reserved:
            return path
        stem, suffix = path.stem, path.suffix
        for index in range(1, 10000):
            candidate = path.with_name(f"{stem} ({index}){suffix}")
            if not candidate.exists() and str(candidate) not in reserved:
                return candidate
    raise RuntimeError("Unable to choose a unique destination filename")


class DownloadJob:
    def __init__(self, msg):
        self.id = str(msg["jobId"])
        self.url = str(msg["url"])
        self.requested_name = msg.get("filename")
        self.directory = Path(msg.get("directory") or (Path.home() / "Downloads")).expanduser()
        self.segments = max(1, min(32, int(msg.get("segments") or 8)))
        self.retry_count = max(0, min(10, int(msg.get("retryCount") or 3)))
        self.request_headers = filtered_request_headers(msg.get("headers"))
        self.pause_event = threading.Event()
        self.cancel_event = threading.Event()
        self.bytes_lock = threading.Lock()
        self.bytes_received = 0
        self.total_size = -1
        self.started_at = time.monotonic()
        self.last_speed_time = self.started_at
        self.last_speed_bytes = 0
        self.speed_bps = 0.0
        self.thread = None
        self.filename = None
        self.destination = None
        self.effective_segments = 1
        self.staging = self.directory / ".goreecloud-downloads" / safe_job_id(self.id)
        self.metadata_path = self.staging / "metadata.json"

    def emit(self, state, **extra):
        now = time.monotonic()
        with self.bytes_lock:
            current_bytes = self.bytes_received
        delta_t = now - self.last_speed_time
        if delta_t >= 0.25:
            instant = max(0.0, (current_bytes - self.last_speed_bytes) / delta_t)
            self.speed_bps = instant if self.speed_bps <= 0 else self.speed_bps * 0.65 + instant * 0.35
            self.last_speed_time = now
            self.last_speed_bytes = current_bytes
        speed = 0 if state in {"paused", "complete", "cancelled", "error"} else int(max(0, self.speed_bps))
        send({
            "type": "progress",
            "jobId": self.id,
            "state": state,
            "bytesReceived": current_bytes,
            "totalBytes": self.total_size,
            "speedBps": speed,
            "filename": self.filename,
            "destination": str(self.destination) if self.destination else None,
            "effectiveSegments": self.effective_segments,
            **extra,
        })

    def wait_if_paused(self):
        while self.pause_event.is_set() and not self.cancel_event.is_set():
            time.sleep(0.15)

    def load_metadata(self):
        try:
            return json.loads(self.metadata_path.read_text(encoding="utf-8"))
        except Exception:
            return None

    def write_metadata(self, info):
        self.staging.mkdir(parents=True, exist_ok=True)
        data = {
            "version": 1,
            "job_id": self.id,
            "url": self.url,
            "filename": self.filename,
            "destination": str(self.destination),
            "size": self.total_size,
            "etag": info.get("etag"),
            "last_modified": info.get("last_modified"),
            "created_at": time.time(),
        }
        temp = self.metadata_path.with_suffix(".tmp")
        temp.write_text(json.dumps(data, indent=2, sort_keys=True), encoding="utf-8")
        os.replace(temp, self.metadata_path)

    def source_changed(self, metadata, info):
        if not metadata or metadata.get("url") != self.url:
            return False
        old_size = int(metadata.get("size", -1))
        if old_size > 0 and info.get("size", -1) > 0 and old_size != info["size"]:
            return True
        old_etag, new_etag = metadata.get("etag"), info.get("etag")
        if old_etag and new_etag and old_etag != new_etag:
            return True
        old_modified, new_modified = metadata.get("last_modified"), info.get("last_modified")
        if not (old_etag and new_etag) and old_modified and new_modified and old_modified != new_modified:
            return True
        return False

    def clear_staging_parts(self):
        if self.staging.exists():
            for child in self.staging.iterdir():
                if child.name != "metadata.json":
                    if child.is_dir():
                        shutil.rmtree(child, ignore_errors=True)
                    else:
                        child.unlink(missing_ok=True)

    def cleanup_staging(self):
        shutil.rmtree(self.staging, ignore_errors=True)
        parent = self.staging.parent
        try:
            parent.rmdir()
        except OSError:
            pass

    def choose_destination(self, info, metadata):
        self.filename = safe_filename(
            self.requested_name
            or content_disposition_name(info.get("content_disposition"))
            or name_from_url(self.url)
        )
        if metadata and metadata.get("url") == self.url and metadata.get("destination"):
            previous = Path(metadata["destination"])
            if previous.parent == self.directory:
                self.destination = previous
                self.filename = previous.name
                return
        self.destination = uniquify_path(self.directory / self.filename)
        self.filename = self.destination.name

    def run(self):
        try:
            self.directory.mkdir(parents=True, exist_ok=True)
            self.staging.mkdir(parents=True, exist_ok=True)
            metadata = self.load_metadata()
            info = probe(self.url, self.request_headers)
            self.total_size = info["size"]
            if self.source_changed(metadata, info):
                self.clear_staging_parts()
                metadata = None
            self.choose_destination(info, metadata)
            self.write_metadata(info)

            if self.total_size > 0 and info["ranges"] and self.segments > 1:
                self._run_segmented(info)
            else:
                self._run_single(info)

            if self.cancel_event.is_set():
                self.cleanup_staging()
                self.emit("cancelled")
                return
            self.cleanup_staging()
            self.emit("complete")
        except Exception as exc:
            if self.cancel_event.is_set():
                self.cleanup_staging()
                self.emit("cancelled")
            else:
                self.emit("error", error=f"{type(exc).__name__}: {exc}")

    def request_base_headers(self, info):
        headers = {
            "User-Agent": USER_AGENT,
            "Accept-Encoding": "identity",
            **self.request_headers,
        }
        if info.get("etag"):
            headers["If-Range"] = info["etag"]
        elif info.get("last_modified"):
            headers["If-Range"] = info["last_modified"]
        return headers

    def single_part_path(self):
        return self.staging / "single.part"

    def segment_part_path(self, index):
        return self.staging / f"segment-{index:03d}.part"

    def _run_single(self, info):
        self.effective_segments = 1
        part = self.single_part_path()
        existing = part.stat().st_size if part.exists() else 0
        if self.total_size > 0 and existing > self.total_size:
            part.unlink(missing_ok=True)
            existing = 0

        headers = self.request_base_headers(info)
        resumable = existing > 0 and info.get("ranges")
        if resumable:
            headers["Range"] = f"bytes={existing}-"
        request = urllib.request.Request(self.url, headers=headers)
        mode = "ab" if resumable else "wb"
        with self.bytes_lock:
            self.bytes_received = existing if resumable else 0
        self.last_speed_bytes = self.bytes_received
        self.emit("downloading")

        with urllib.request.urlopen(request, timeout=60) as response, open(part, mode) as output:
            if mode == "ab" and response.status != 206:
                output.seek(0)
                output.truncate()
                with self.bytes_lock:
                    self.bytes_received = 0
                self.last_speed_bytes = 0
            last_emit = 0.0
            while True:
                if self.cancel_event.is_set():
                    return
                self.wait_if_paused()
                if self.cancel_event.is_set():
                    return
                chunk = response.read(256 * 1024)
                if not chunk:
                    break
                output.write(chunk)
                with self.bytes_lock:
                    self.bytes_received += len(chunk)
                now = time.monotonic()
                if now - last_emit >= 0.35:
                    self.emit("paused" if self.pause_event.is_set() else "downloading")
                    last_emit = now

        if self.total_size > 0 and part.stat().st_size != self.total_size:
            raise RuntimeError(f"Download ended at {part.stat().st_size} bytes; expected {self.total_size}")
        os.replace(part, self.destination)

    def _run_segmented(self, info):
        size = self.total_size
        count = min(self.segments, max(1, size // (2 * 1024 * 1024) or 1))
        self.effective_segments = count
        span = (size + count - 1) // count
        ranges = []
        for index in range(count):
            start = index * span
            end = min(size - 1, start + span - 1)
            if start <= end:
                ranges.append((index, start, end))

        restored = 0
        for index, start, end in ranges:
            part = self.segment_part_path(index)
            expected = end - start + 1
            if part.exists() and part.stat().st_size > expected:
                part.unlink(missing_ok=True)
            if part.exists():
                restored += min(part.stat().st_size, expected)
        with self.bytes_lock:
            self.bytes_received = restored
        self.last_speed_bytes = restored
        self.emit("downloading")

        def worker(item):
            index, start, end = item
            part = self.segment_part_path(index)
            expected = end - start + 1
            have = part.stat().st_size if part.exists() else 0
            if have >= expected:
                return

            attempt = 0
            while attempt <= self.retry_count:
                try:
                    self.wait_if_paused()
                    if self.cancel_event.is_set():
                        return
                    have = part.stat().st_size if part.exists() else 0
                    headers = self.request_base_headers(info)
                    headers["Range"] = f"bytes={start + have}-{end}"
                    request = urllib.request.Request(self.url, headers=headers)
                    with urllib.request.urlopen(request, timeout=60) as response:
                        if response.status != 206:
                            raise RuntimeError(f"Server stopped honoring byte ranges (HTTP {response.status})")
                        with open(part, "ab") as output:
                            while have < expected:
                                if self.cancel_event.is_set():
                                    return
                                self.wait_if_paused()
                                if self.cancel_event.is_set():
                                    return
                                chunk = response.read(min(256 * 1024, expected - have))
                                if not chunk:
                                    break
                                output.write(chunk)
                                have += len(chunk)
                                with self.bytes_lock:
                                    self.bytes_received += len(chunk)
                    if have >= expected:
                        return
                    raise RuntimeError("Segment ended before its byte range completed")
                except Exception:
                    attempt += 1
                    if attempt > self.retry_count:
                        raise
                    time.sleep(min(2 ** attempt, 8))

        stop_reporter = threading.Event()

        def reporter():
            while not stop_reporter.wait(0.4):
                self.emit("paused" if self.pause_event.is_set() else "downloading")

        reporter_thread = threading.Thread(target=reporter, daemon=True)
        reporter_thread.start()
        try:
            with concurrent.futures.ThreadPoolExecutor(max_workers=len(ranges)) as pool:
                futures = [pool.submit(worker, item) for item in ranges]
                for future in concurrent.futures.as_completed(futures):
                    future.result()
            if self.cancel_event.is_set():
                return

            with open(self.destination, "wb") as output:
                for index, start, end in ranges:
                    part = self.segment_part_path(index)
                    expected = end - start + 1
                    if not part.exists() or part.stat().st_size != expected:
                        raise RuntimeError(f"Segment {index} is incomplete")
                    with open(part, "rb") as source:
                        while True:
                            chunk = source.read(1024 * 1024)
                            if not chunk:
                                break
                            output.write(chunk)
            if self.destination.stat().st_size != size:
                raise RuntimeError("Assembled file size does not match the source size")
        finally:
            stop_reporter.set()

    def pause(self):
        self.pause_event.set()
        self.emit("paused")

    def resume(self):
        self.pause_event.clear()
        self.last_speed_time = time.monotonic()
        self.last_speed_bytes = self.bytes_received
        self.speed_bps = 0.0
        self.emit("downloading")

    def cancel(self):
        self.cancel_event.set()
        self.pause_event.clear()
        self.emit("cancelled")


def start_job(msg):
    job = DownloadJob(msg)
    JOBS[job.id] = job
    thread = threading.Thread(target=job.run, name=f"goreecloud-download-{safe_job_id(job.id)}", daemon=True)
    job.thread = thread
    thread.start()


def main():
    send({"type": "hello", "version": VERSION})
    while True:
        msg = recv()
        if msg is None:
            return
        typ = msg.get("type")
        job_id = str(msg.get("jobId")) if msg.get("jobId") is not None else None
        if typ == "ping":
            send({"type": "hello", "version": VERSION})
        elif typ == "start":
            start_job(msg)
        elif typ == "pause" and job_id in JOBS:
            JOBS[job_id].pause()
        elif typ == "resume" and job_id in JOBS:
            JOBS[job_id].resume()
        elif typ == "resume" and job_id not in JOBS and msg.get("url"):
            start_job(msg)
        elif typ == "cancel" and job_id in JOBS:
            JOBS[job_id].cancel()


if __name__ == "__main__":
    main()
