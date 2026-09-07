#!/usr/bin/env python3
import concurrent.futures
import errno
import json
import os
import re
import shutil
import stat
import struct
import sys
import threading
import time
import urllib.parse
import urllib.request
from pathlib import Path

VERSION = "0.2.10"
PROTOCOL_VERSION = 2
PROTOCOL_CAPABILITIES = [
    "segmented-range-integrity",
    "same-job-recovery",
    "no-overwrite-publish",
    "ephemeral-request-headers",
    "staging-link-rejection",
]
USER_AGENT = f"GoreeCloudDownloadManager/{VERSION}"
WRITE_LOCK = threading.Lock()
DESTINATION_LOCK = threading.Lock()
JOBS_LOCK = threading.Lock()
JOBS = {}
DESTINATION_RESERVATIONS = {}
TERMINAL_NATIVE_STATES = {"complete", "cancelled", "error"}
IMMUTABLE_NATIVE_STATES = {"complete", "cancelled"}
CONTENT_RANGE_RE = re.compile(r"^bytes\s+(\d+)-(\d+)/(\d+|\*)$", re.I)


def hello_message():
    return {
        "type": "hello",
        "version": VERSION,
        "protocolVersion": PROTOCOL_VERSION,
        "capabilities": list(PROTOCOL_CAPABILITIES),
    }


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


def validate_download_url(value):
    url = str(value or "").strip()
    parsed = urllib.parse.urlparse(url)
    if parsed.scheme.lower() not in {"http", "https"} or not parsed.netloc:
        raise ValueError("Only HTTP and HTTPS download URLs are supported")
    return url


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
        if len(text.encode("utf-8")) > 64 * 1024:
            continue
        out[canonical] = text
    return out


def parse_content_range(value):
    match = CONTENT_RANGE_RE.match(str(value or "").strip())
    if not match:
        return None
    start = int(match.group(1))
    end = int(match.group(2))
    total = None if match.group(3) == "*" else int(match.group(3))
    if end < start:
        return None
    return start, end, total


def validate_partial_response(response, expected_start, expected_end=None, total_size=-1):
    if getattr(response, "status", None) != 206:
        raise RuntimeError(f"Server stopped honoring byte ranges (HTTP {getattr(response, 'status', 'unknown')})")
    content_range = parse_content_range(response.headers.get("Content-Range"))
    if content_range is None:
        raise RuntimeError("Partial response is missing a valid Content-Range header")
    start, end, total = content_range
    if start != expected_start:
        raise RuntimeError(f"Partial response started at byte {start}; expected {expected_start}")
    if expected_end is not None and end != expected_end:
        raise RuntimeError(f"Partial response ended at byte {end}; expected {expected_end}")
    if total_size > 0 and total != total_size:
        raise RuntimeError(f"Partial response reports source size {total}; expected {total_size}")
    return content_range


def probe(url, request_headers=None):
    url = validate_download_url(url)
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
            parsed = parse_content_range(content_range)
            size = parsed[2] if parsed and parsed[2] is not None else int(response.headers.get("Content-Length", "-1"))
            return {
                "size": size,
                "ranges": response.status == 206 and parsed is not None and parsed[0] == 0,
                "etag": response.headers.get("ETag"),
                "last_modified": response.headers.get("Last-Modified"),
                "content_disposition": response.headers.get("Content-Disposition"),
            }


def _candidate_available_locked(path, job_id):
    owner = DESTINATION_RESERVATIONS.get(str(path))
    return not path.exists() and (owner is None or owner == job_id)


def reserve_unique_path(path, job_id):
    path = Path(path)
    with DESTINATION_LOCK:
        if _candidate_available_locked(path, job_id):
            DESTINATION_RESERVATIONS[str(path)] = job_id
            return path
        stem, suffix = path.stem, path.suffix
        for index in range(1, 10000):
            candidate = path.with_name(f"{stem} ({index}){suffix}")
            if _candidate_available_locked(candidate, job_id):
                DESTINATION_RESERVATIONS[str(candidate)] = job_id
                return candidate
    raise RuntimeError("Unable to choose a unique destination filename")


def reserve_existing_path(path, job_id):
    path = Path(path)
    with DESTINATION_LOCK:
        if not _candidate_available_locked(path, job_id):
            return False
        DESTINATION_RESERVATIONS[str(path)] = job_id
        return True


def release_destination(job_id, path):
    if path is None:
        return
    with DESTINATION_LOCK:
        if DESTINATION_RESERVATIONS.get(str(path)) == job_id:
            DESTINATION_RESERVATIONS.pop(str(path), None)


def thread_is_alive(job):
    thread = getattr(job, "thread", None)
    return bool(thread and thread.is_alive())


def lstat_or_none(path):
    try:
        return Path(path).lstat()
    except FileNotFoundError:
        return None


def require_plain_directory(path, label):
    path = Path(path)
    info = lstat_or_none(path)
    if info is None:
        return False
    if stat.S_ISLNK(info.st_mode):
        raise RuntimeError(f"Refusing symbolic-link {label}: {path}")
    if not stat.S_ISDIR(info.st_mode):
        raise RuntimeError(f"Expected directory for {label}: {path}")
    return True


def require_plain_file(path, label, allow_missing=True):
    path = Path(path)
    info = lstat_or_none(path)
    if info is None:
        if allow_missing:
            return None
        raise RuntimeError(f"Missing {label}: {path}")
    if stat.S_ISLNK(info.st_mode):
        raise RuntimeError(f"Refusing symbolic-link {label}: {path}")
    if not stat.S_ISREG(info.st_mode):
        raise RuntimeError(f"Expected regular file for {label}: {path}")
    return info


def open_nofollow(path, mode, permissions=0o600):
    """Open a regular file while refusing a symlink as the final path component."""
    path = Path(path)
    flags = 0
    if "r" in mode and all(marker not in mode for marker in "wa+"):
        flags |= os.O_RDONLY
    else:
        flags |= os.O_WRONLY
    if "w" in mode:
        flags |= os.O_CREAT | os.O_TRUNC
    if "a" in mode:
        flags |= os.O_CREAT | os.O_APPEND
    if "x" in mode:
        flags |= os.O_CREAT | os.O_EXCL
    if "+" in mode:
        flags = (flags & ~os.O_WRONLY) | os.O_RDWR
    if hasattr(os, "O_NOFOLLOW"):
        flags |= os.O_NOFOLLOW
    try:
        fd = os.open(path, flags, permissions)
    except OSError as exc:
        if exc.errno in {errno.ELOOP, errno.EMLINK}:
            raise RuntimeError(f"Refusing symbolic-link staging file: {path}") from exc
        raise
    return os.fdopen(fd, mode)


class DownloadJob:
    def __init__(self, msg):
        self.id = str(msg["jobId"])
        self.url = validate_download_url(msg["url"])
        self.requested_name = msg.get("filename")
        self.directory = Path(msg.get("directory") or (Path.home() / "Downloads")).expanduser()
        self.segments = max(1, min(32, int(msg.get("segments") or 8)))
        self.retry_count = max(0, min(10, int(msg.get("retryCount") or 3)))
        self.request_headers = filtered_request_headers(msg.get("headers"))
        self.pause_event = threading.Event()
        self.cancel_event = threading.Event()
        self.bytes_lock = threading.Lock()
        self.state_lock = threading.Lock()
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
        self.last_state = "starting"
        self.last_error = None
        self.staging_root = self.directory / ".goreecloud-downloads"
        self.staging = self.staging_root / safe_job_id(self.id)
        self.metadata_path = self.staging / "metadata.json"

    def emit(self, state, **extra):
        with self.state_lock:
            self.last_state = state
            if "error" in extra:
                self.last_error = extra.get("error")
            elif state != "error":
                self.last_error = None
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

    def ensure_staging_directory(self):
        self.directory.mkdir(parents=True, exist_ok=True)
        if not require_plain_directory(self.staging_root, "staging root"):
            self.staging_root.mkdir(mode=0o700)
        if not require_plain_directory(self.staging, "job staging directory"):
            self.staging.mkdir(mode=0o700)
        require_plain_directory(self.staging_root, "staging root")
        require_plain_directory(self.staging, "job staging directory")

    def validate_staging_path(self, path, label="staging file", allow_missing=True):
        self.ensure_staging_directory()
        path = Path(path)
        if path.parent != self.staging:
            raise RuntimeError(f"Refusing staging path outside job directory: {path}")
        return require_plain_file(path, label, allow_missing=allow_missing)

    def staging_size(self, path):
        info = self.validate_staging_path(path)
        return info.st_size if info is not None else 0

    def unlink_staging_file(self, path):
        path = Path(path)
        if path.parent != self.staging:
            raise RuntimeError(f"Refusing staging unlink outside job directory: {path}")
        info = lstat_or_none(path)
        if info is None:
            return
        if stat.S_ISDIR(info.st_mode) and not stat.S_ISLNK(info.st_mode):
            raise RuntimeError(f"Refusing directory where staging file is expected: {path}")
        path.unlink(missing_ok=True)

    def load_metadata(self):
        self.ensure_staging_directory()
        info = self.validate_staging_path(self.metadata_path, "metadata.json")
        if info is None:
            return None
        try:
            with open_nofollow(self.metadata_path, "r") as stream:
                data = json.load(stream)
        except (RuntimeError, OSError):
            raise
        except Exception:
            return None
        if not isinstance(data, dict):
            return None
        if data.get("version") != 1 or data.get("job_id") != self.id:
            return None
        stored_url = data.get("url")
        if not isinstance(stored_url, str):
            return None
        try:
            if validate_download_url(stored_url) != stored_url:
                return None
        except Exception:
            return None
        size = data.get("size", -1)
        if isinstance(size, bool) or not isinstance(size, int) or size < -1:
            return None
        for key in ("filename", "destination", "etag", "last_modified"):
            value = data.get(key)
            if value is not None and not isinstance(value, str):
                return None
            if isinstance(value, str) and len(value.encode("utf-8")) > 64 * 1024:
                return None
        return data

    def validated_resume_metadata(self, info):
        metadata = self.load_metadata()
        if metadata is None or self.source_changed(metadata, info):
            self.clear_staging_parts()
            return None
        return metadata

    def write_metadata(self, info):
        self.ensure_staging_directory()
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
        temp = self.staging / "metadata.tmp"
        self.unlink_staging_file(temp)
        with open_nofollow(temp, "x") as stream:
            json.dump(data, stream, indent=2, sort_keys=True)
            stream.write("\n")
            stream.flush()
            os.fsync(stream.fileno())
        existing = lstat_or_none(self.metadata_path)
        if existing is not None and stat.S_ISLNK(existing.st_mode):
            temp.unlink(missing_ok=True)
            raise RuntimeError(f"Refusing symbolic-link metadata.json: {self.metadata_path}")
        os.replace(temp, self.metadata_path)

    def source_changed(self, metadata, info):
        if not metadata:
            return False
        if metadata.get("url") != self.url:
            return True
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
        self.ensure_staging_directory()
        for child in list(self.staging.iterdir()):
            if child.name == "metadata.json":
                continue
            info = child.lstat()
            if stat.S_ISDIR(info.st_mode) and not stat.S_ISLNK(info.st_mode):
                shutil.rmtree(child, ignore_errors=False)
            else:
                child.unlink(missing_ok=True)

    def cleanup_staging(self):
        if not require_plain_directory(self.staging_root, "staging root"):
            return
        info = lstat_or_none(self.staging)
        if info is None:
            return
        if stat.S_ISLNK(info.st_mode) or not stat.S_ISDIR(info.st_mode):
            raise RuntimeError(f"Refusing unsafe job staging cleanup: {self.staging}")
        shutil.rmtree(self.staging, ignore_errors=False)
        try:
            self.staging_root.rmdir()
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
            if previous.parent == self.directory and reserve_existing_path(previous, self.id):
                self.destination = previous
                self.filename = previous.name
                return
        self.destination = reserve_unique_path(self.directory / self.filename, self.id)
        self.filename = self.destination.name

    def commit_staged_file(self, source):
        source = Path(source)
        self.validate_staging_path(source, "completed staging file", allow_missing=False)
        while True:
            destination = self.destination
            try:
                os.link(source, destination, follow_symlinks=False)
            except FileExistsError:
                release_destination(self.id, destination)
                self.destination = reserve_unique_path(self.directory / self.filename, self.id)
                self.filename = self.destination.name
                continue
            except OSError as exc:
                raise RuntimeError(f"Unable to commit download without overwriting an existing file: {exc}") from exc
            source.unlink()
            release_destination(self.id, destination)
            return destination

    def run(self):
        try:
            self.ensure_staging_directory()
            info = probe(self.url, self.request_headers)
            metadata = self.validated_resume_metadata(info)
            self.total_size = info["size"]
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
                try:
                    self.cleanup_staging()
                except Exception:
                    pass
                self.emit("cancelled")
            else:
                self.emit("error", error=f"{type(exc).__name__}: {exc}")
        finally:
            if self.last_state in TERMINAL_NATIVE_STATES:
                release_destination(self.id, self.destination)

    def request_base_headers(self, info):
        headers = {"User-Agent": USER_AGENT, "Accept-Encoding": "identity", **self.request_headers}
        if info.get("etag"):
            headers["If-Range"] = info["etag"]
        elif info.get("last_modified"):
            headers["If-Range"] = info["last_modified"]
        return headers

    def single_part_path(self):
        return self.staging / "single.part"

    def segment_part_path(self, index):
        return self.staging / f"segment-{index:03d}.part"

    def assembled_part_path(self):
        return self.staging / "assembled.part"

    def _run_single(self, info):
        self.effective_segments = 1
        part = self.single_part_path()
        existing = self.staging_size(part)
        if self.total_size > 0 and existing > self.total_size:
            self.unlink_staging_file(part)
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
        with urllib.request.urlopen(request, timeout=60) as response:
            if resumable:
                expected_end = self.total_size - 1 if self.total_size > 0 else None
                validate_partial_response(response, existing, expected_end, self.total_size)
            with open_nofollow(part, mode) as output:
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
        final_size = self.staging_size(part)
        if self.total_size > 0 and final_size != self.total_size:
            raise RuntimeError(f"Download ended at {final_size} bytes; expected {self.total_size}")
        self.commit_staged_file(part)

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
            have = self.staging_size(part)
            if have > expected:
                self.unlink_staging_file(part)
                have = 0
            restored += min(have, expected)
        with self.bytes_lock:
            self.bytes_received = restored
        self.last_speed_bytes = restored
        self.emit("downloading")

        def worker(item):
            index, start, end = item
            part = self.segment_part_path(index)
            expected = end - start + 1
            have = self.staging_size(part)
            if have >= expected:
                return
            attempt = 0
            while attempt <= self.retry_count:
                try:
                    self.wait_if_paused()
                    if self.cancel_event.is_set():
                        return
                    have = self.staging_size(part)
                    request_start = start + have
                    headers = self.request_base_headers(info)
                    headers["Range"] = f"bytes={request_start}-{end}"
                    request = urllib.request.Request(self.url, headers=headers)
                    with urllib.request.urlopen(request, timeout=60) as response:
                        validate_partial_response(response, request_start, end, size)
                        with open_nofollow(part, "ab") as output:
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
            assembled = self.assembled_part_path()
            self.unlink_staging_file(assembled)
            with open_nofollow(assembled, "x") as output:
                for index, start, end in ranges:
                    part = self.segment_part_path(index)
                    expected = end - start + 1
                    if self.staging_size(part) != expected:
                        raise RuntimeError(f"Segment {index} is incomplete")
                    with open_nofollow(part, "rb") as source:
                        while True:
                            chunk = source.read(1024 * 1024)
                            if not chunk:
                                break
                            output.write(chunk)
            if self.staging_size(assembled) != size:
                raise RuntimeError("Assembled file size does not match the source size")
            self.commit_staged_file(assembled)
        finally:
            stop_reporter.set()

    def pause(self):
        if self.last_state in TERMINAL_NATIVE_STATES:
            return
        self.pause_event.set()
        self.emit("paused")

    def resume(self):
        if self.last_state in IMMUTABLE_NATIVE_STATES:
            self.emit(self.last_state)
            return
        self.pause_event.clear()
        self.last_speed_time = time.monotonic()
        self.last_speed_bytes = self.bytes_received
        self.speed_bps = 0.0
        self.emit("downloading")

    def cancel(self):
        if self.last_state in IMMUTABLE_NATIVE_STATES:
            self.emit(self.last_state)
            return
        self.cancel_event.set()
        self.pause_event.clear()
        self.emit("cancelled")


def start_job(msg, replace_existing=False):
    job_id = str(msg["jobId"])
    with JOBS_LOCK:
        existing = JOBS.get(job_id)
        if existing is not None:
            if thread_is_alive(existing) or not replace_existing:
                return existing, False
            if existing.last_state in IMMUTABLE_NATIVE_STATES:
                return existing, False
        job = DownloadJob(msg)
        thread = threading.Thread(target=job.run, name=f"goreecloud-download-{safe_job_id(job.id)}", daemon=True)
        job.thread = thread
        JOBS[job.id] = job
    thread.start()
    return job, True


def pause_job(job_id):
    with JOBS_LOCK:
        job = JOBS.get(job_id)
    if job is not None and thread_is_alive(job):
        job.pause()
        return True
    return False


def resume_job(msg):
    job_id = str(msg["jobId"])
    with JOBS_LOCK:
        existing = JOBS.get(job_id)
    if existing is not None and thread_is_alive(existing):
        existing.resume()
        return existing, False
    if existing is not None and existing.last_state in IMMUTABLE_NATIVE_STATES:
        existing.emit(existing.last_state)
        return existing, False
    if not msg.get("url"):
        return existing, False
    return start_job(msg, replace_existing=True)


def cancel_job(job_id):
    with JOBS_LOCK:
        job = JOBS.get(job_id)
    if job is not None:
        job.cancel()
        return True
    return False


def handle_message(msg):
    typ = msg.get("type")
    job_id = str(msg.get("jobId")) if msg.get("jobId") is not None else None
    if typ == "ping":
        send(hello_message())
    elif typ == "start" and job_id is not None:
        start_job(msg)
    elif typ == "pause" and job_id is not None:
        pause_job(job_id)
    elif typ == "resume" and job_id is not None:
        resume_job(msg)
    elif typ == "cancel" and job_id is not None:
        cancel_job(job_id)


def main():
    send(hello_message())
    while True:
        msg = recv()
        if msg is None:
            return
        if not isinstance(msg, dict):
            continue
        try:
            handle_message(msg)
        except Exception as exc:
            job_id = str(msg.get("jobId")) if msg.get("jobId") is not None else None
            if job_id:
                send({
                    "type": "progress",
                    "jobId": job_id,
                    "state": "error",
                    "speedBps": 0,
                    "error": f"{type(exc).__name__}: {exc}",
                })


if __name__ == "__main__":
    main()
