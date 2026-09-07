#!/usr/bin/env python3
"""Persistent signed-install and full-browser native recovery acceptance.

This acceptance test deliberately requires a Mozilla-signed Download Manager XPI.
It installs the extension non-temporarily into an in-place Firefox profile, proves the
0.2.10 native helper handshake, starts a throttled segmented transfer, quits Firefox
while job-scoped partial data exists, then starts a new Firefox process against the
same profile without reinstalling the add-on. Completion after restart must reuse the
same native staging identity and reproduce the deterministic source bytes exactly.
"""

from __future__ import annotations

import hashlib
import json
import re
import socket
import sys
import tempfile
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from selenium import webdriver
from selenium.common.exceptions import TimeoutException
from selenium.webdriver.firefox.options import Options
from selenium.webdriver.firefox.service import Service
from selenium.webdriver.support.ui import WebDriverWait

EXPECTED_ADDON_ID = "download-manager@goreecloud.com"
EXPECTED_HELPER_STATUS = "Native helper 0.2.10 · protocol 2 ready."
FIXED_EXTENSION_UUID = "8a92c583-f78e-4f61-a129-44c0a0b02110"
PAYLOAD_SIZE = 64 * 1024 * 1024
SEGMENTS = 8
CHUNK_SIZE = 64 * 1024
SEND_DELAY_SECONDS = 0.025
ETAG = '"goreecloud-download-manager-signed-restart-v1"'
LAST_MODIFIED = "Mon, 07 Sep 2026 18:00:00 GMT"


class FixtureHandler(BaseHTTPRequestHandler):
    payload_path: Path | None = None
    request_ranges: list[tuple[int, int]] = []
    lock = threading.Lock()

    def log_message(self, fmt: str, *args: object) -> None:
        return

    @classmethod
    def reset(cls) -> None:
        with cls.lock:
            cls.request_ranges = []

    @classmethod
    def ranges(cls) -> list[tuple[int, int]]:
        with cls.lock:
            return list(cls.request_ranges)

    def _common_headers(self, length: int) -> None:
        self.send_header("Content-Length", str(length))
        self.send_header("Accept-Ranges", "bytes")
        self.send_header("ETag", ETAG)
        self.send_header("Last-Modified", LAST_MODIFIED)
        self.send_header("Content-Type", "application/octet-stream")

    def do_HEAD(self) -> None:  # noqa: N802 - BaseHTTPRequestHandler API
        if self.path.split("?", 1)[0] != "/signed-restart.bin":
            self.send_error(404)
            return
        self.send_response(200)
        self._common_headers(PAYLOAD_SIZE)
        self.end_headers()

    def do_GET(self) -> None:  # noqa: N802 - BaseHTTPRequestHandler API
        if self.path.split("?", 1)[0] != "/signed-restart.bin":
            self.send_error(404)
            return

        range_header = self.headers.get("Range")
        if range_header:
            match = re.fullmatch(r"bytes=(\d+)-(\d*)", range_header.strip())
            if not match:
                self.send_error(416)
                return
            start = int(match.group(1))
            end = int(match.group(2)) if match.group(2) else PAYLOAD_SIZE - 1
            if start < 0 or start >= PAYLOAD_SIZE or end < start:
                self.send_error(416)
                return
            end = min(end, PAYLOAD_SIZE - 1)
            status = 206
        else:
            start, end, status = 0, PAYLOAD_SIZE - 1, 200

        with self.__class__.lock:
            self.__class__.request_ranges.append((start, end))

        length = end - start + 1
        self.send_response(status)
        self._common_headers(length)
        if status == 206:
            self.send_header("Content-Range", f"bytes {start}-{end}/{PAYLOAD_SIZE}")
        self.end_headers()

        assert self.__class__.payload_path is not None
        with self.__class__.payload_path.open("rb") as source:
            source.seek(start)
            remaining = length
            while remaining > 0:
                chunk = source.read(min(CHUNK_SIZE, remaining))
                if not chunk:
                    break
                try:
                    self.wfile.write(chunk)
                    self.wfile.flush()
                except (BrokenPipeError, ConnectionResetError):
                    return
                remaining -= len(chunk)
                time.sleep(SEND_DELAY_SECONDS)


def require(condition: bool, name: str, detail: str = "") -> None:
    if not condition:
        suffix = f": {detail}" if detail else ""
        raise AssertionError(f"FAIL {name}{suffix}")
    print(f"PASS {name}")


def free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.bind(("127.0.0.1", 0))
        return int(sock.getsockname()[1])


def firefox_options(profile: Path) -> Options:
    options = Options()
    options.add_argument("-headless")
    options.add_argument("--profile")
    options.add_argument(str(profile))
    options.add_argument("--marionette-port")
    options.add_argument(str(free_port()))
    options.set_preference("browser.shell.checkDefaultBrowser", False)
    options.set_preference("browser.startup.page", 0)
    options.set_preference("datareporting.policy.dataSubmissionEnabled", False)
    options.set_preference("toolkit.telemetry.reportingpolicy.firstRun", False)
    options.set_preference("browser.download.alwaysOpenPanel", False)
    options.set_preference(
        "extensions.webextensions.uuids",
        json.dumps({EXPECTED_ADDON_ID: FIXED_EXTENSION_UUID}, separators=(",", ":")),
    )
    return options


def firefox_service() -> Service:
    """Start geckodriver with the Firefox 138+ system-access opt-in.

    geckodriver 0.37.1 rejects Firefox's --remote-allow-system-access flag when it
    arrives through moz:firefoxOptions capabilities. Selenium's supported path for
    privileged Firefox context is the geckodriver service flag --allow-system-access.
    A fresh Service is required for each distinct Firefox process in this restart test.
    """

    return Service(service_args=["--allow-system-access"])


def wait_until(predicate, timeout: float, message: str) -> None:
    deadline = time.monotonic() + timeout
    last_detail = ""
    while time.monotonic() < deadline:
        try:
            value = predicate()
            if value:
                return
            last_detail = repr(value)
        except Exception as exc:  # polling should tolerate transient filesystem/browser state
            last_detail = f"{type(exc).__name__}: {exc}"
        time.sleep(0.1)
    raise AssertionError(f"FAIL {message}: {last_detail}")


def wait_text(driver: webdriver.Firefox, selector: str, expected: str, timeout: float = 15) -> None:
    try:
        WebDriverWait(driver, timeout).until(
            lambda d: d.find_element("css selector", selector).text.strip() == expected
        )
    except TimeoutException as exc:
        actual = driver.find_element("css selector", selector).text.strip()
        raise AssertionError(f"FAIL text {selector}: expected {expected!r}, got {actual!r}") from exc


def extension_job_snapshot(driver: webdriver.Firefox, job_id: str) -> dict | None:
    """Read the exact persisted managed job from the signed extension itself."""

    result = driver.execute_async_script(
        """
        const jobId = arguments[0];
        const done = arguments[arguments.length - 1];
        browser.runtime.sendMessage({type: 'list-jobs'}).then(
          jobs => done((jobs || []).find(job => job.id === jobId) || null),
          error => done({__error: String(error)})
        );
        """,
        job_id,
    )
    if isinstance(result, dict) and result.get("__error"):
        raise AssertionError(f"FAIL signed extension job snapshot: {result['__error']}")
    return result if isinstance(result, dict) else None


def extension_url(path: str) -> str:
    return f"moz-extension://{FIXED_EXTENSION_UUID}/{path.lstrip('/')}"


def navigate_extension(driver: webdriver.Firefox, path: str) -> None:
    """Open an installed extension document and bind WebDriver to its trusted tab.

    Firefox 155 keeps WebDriver navigation commands content-context-only while also
    rejecting direct moz-extension navigation from ordinary content scope. Create a
    trusted tab with gBrowser in chrome context, then explicitly switch WebDriver to
    the new tab handle before interacting with the extension from content context.
    """

    target = extension_url(path)
    previous_handles = set(driver.window_handles)
    driver.set_context(driver.CONTEXT_CHROME)
    try:
        opened = driver.execute_script(
            """
            const target = arguments[0];
            if (!window.gBrowser) {
              throw new Error('Firefox chrome context does not expose gBrowser');
            }
            const tab = window.gBrowser.addTrustedTab(target);
            if (!tab) {
              throw new Error('Firefox could not create trusted extension tab');
            }
            window.gBrowser.selectedTab = tab;
            return true;
            """,
            target,
        )
        require(opened is True, "trusted extension tab created", target)
    finally:
        driver.set_context(driver.CONTEXT_CONTENT)

    wait_until(
        lambda: len(set(driver.window_handles) - previous_handles) == 1,
        15,
        f"WebDriver discovered trusted extension tab for {path}",
    )
    new_handles = list(set(driver.window_handles) - previous_handles)
    require(len(new_handles) == 1, "trusted extension WebDriver handle discovered", repr(new_handles))
    driver.switch_to.window(new_handles[0])
    wait_until(
        lambda: driver.current_url == target,
        15,
        f"trusted extension navigation completed for {path}",
    )


def configure_native(driver: webdriver.Firefox, download_dir: Path) -> None:
    navigate_extension(driver, "ui/options.html")
    wait_until(lambda: driver.find_element("id", "mode").get_attribute("value") != "", 10, "Settings page loaded")

    mode = driver.find_element("id", "mode")
    driver.execute_script(
        "arguments[0].value='native'; arguments[0].dispatchEvent(new Event('change',{bubbles:true}));",
        mode,
    )
    for element_id, value in (("segments", "8"), ("maxConcurrent", "3"), ("retryCount", "3")):
        element = driver.find_element("id", element_id)
        element.clear()
        element.send_keys(value)
    directory = driver.find_element("id", "nativeDirectory")
    directory.clear()
    directory.send_keys(str(download_dir))
    driver.find_element("id", "save").click()
    wait_text(driver, "#status", "Settings saved.")

    driver.find_element("id", "test").click()
    wait_text(driver, "#status", EXPECTED_HELPER_STATUS)
    require(True, "pre-restart native helper handshake")


def start_native_download(driver: webdriver.Firefox, url: str) -> None:
    navigate_extension(driver, "ui/manager.html")
    wait_until(lambda: driver.find_element("id", "start").is_enabled(), 10, "Manager page loaded")
    field = driver.find_element("id", "url")
    field.clear()
    field.send_keys(url)
    driver.find_element("id", "start").click()
    wait_until(
        lambda: int(driver.find_element("id", "activeCount").text or "0") >= 1,
        15,
        "native managed job became active",
    )
    require(True, "native managed job started before restart")


def staged_job(download_dir: Path) -> tuple[Path, int]:
    root = download_dir / ".goreecloud-downloads"
    if not root.is_dir():
        return Path(), 0
    jobs = [entry for entry in root.iterdir() if entry.is_dir() and not entry.is_symlink()]
    if len(jobs) != 1:
        return Path(), 0
    job = jobs[0]
    parts = [entry for entry in job.iterdir() if entry.name.endswith(".part") and entry.is_file()]
    total = sum(entry.stat().st_size for entry in parts)
    return job, total


def make_payload(path: Path) -> str:
    pattern = bytes((index * 17 + 31) % 256 for index in range(CHUNK_SIZE))
    digest = hashlib.sha256()
    remaining = PAYLOAD_SIZE
    with path.open("wb") as output:
        while remaining:
            chunk = pattern[: min(len(pattern), remaining)]
            output.write(chunk)
            digest.update(chunk)
            remaining -= len(chunk)
    return digest.hexdigest()


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def main() -> int:
    if len(sys.argv) != 2:
        raise SystemExit("usage: signed_restart_smoke.py /path/to/mozilla-signed-download-manager.xpi")

    xpi = Path(sys.argv[1]).resolve()
    require(xpi.is_file(), "signed XPI exists", str(xpi))

    with tempfile.TemporaryDirectory(prefix="goreecloud-dm-signed-restart-") as temp:
        base_dir = Path(temp)
        profile = base_dir / "firefox-profile"
        profile.mkdir()
        download_dir = base_dir / "downloads"
        download_dir.mkdir()
        payload = base_dir / "source.bin"
        source_digest = make_payload(payload)
        FixtureHandler.payload_path = payload
        FixtureHandler.reset()

        server = ThreadingHTTPServer(("127.0.0.1", 0), FixtureHandler)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        url = f"http://127.0.0.1:{server.server_address[1]}/signed-restart.bin"

        first: webdriver.Firefox | None = None
        second: webdriver.Firefox | None = None
        original_job_id = ""
        try:
            first = webdriver.Firefox(
                options=firefox_options(profile),
                service=firefox_service(),
            )
            addon_id = first.install_addon(str(xpi), temporary=False)
            require(addon_id == EXPECTED_ADDON_ID, "persistent Mozilla-signed installation", str(addon_id))

            configure_native(first, download_dir)
            start_native_download(first, url)

            def partial_ready() -> bool:
                nonlocal original_job_id
                job, total = staged_job(download_dir)
                if job:
                    original_job_id = job.name
                return bool(job) and 512 * 1024 <= total < PAYLOAD_SIZE

            wait_until(partial_ready, 20, "job-scoped native partial staging before browser restart")
            require(bool(original_job_id), "captured original GoreeCloud job identity", original_job_id)
            before_job, before_bytes = staged_job(download_dir)
            require(before_job.name == original_job_id and 0 < before_bytes < PAYLOAD_SIZE,
                    "partial native bytes present before restart", f"{before_bytes} bytes")

            first.quit()
            first = None

            time.sleep(0.8)
            after_quit_job, after_quit_bytes = staged_job(download_dir)
            require(after_quit_job.name == original_job_id and after_quit_bytes > 0,
                    "native staging survived full Firefox process exit", f"{after_quit_bytes} bytes")
            final_path = download_dir / "signed-restart.bin"
            require(not final_path.exists(), "transfer remained incomplete at browser exit")

            # A distinct Firefox process uses the same profile. install_addon() is intentionally
            # not called here; any extension behavior must come from the signed persistent install.
            second = webdriver.Firefox(
                options=firefox_options(profile),
                service=firefox_service(),
            )
            navigate_extension(second, "ui/manager.html")
            wait_until(lambda: "GoreeCloud Download Manager Extension" in second.page_source,
                       15, "persisted extension UI available after restart")
            require(True, "signed extension survived full Firefox restart")

            wait_until(
                lambda: extension_job_snapshot(second, original_job_id) is not None,
                15,
                "persisted native job rendered after restart",
            )

            # Observe the exact managed job rather than treating a stale summary counter as proof
            # that startup recovery actually launched. Automatic stale-active recovery records
            # recoveryRequestedAt. If that attempt ends in the documented recoverable error or
            # interrupted state, exercise one real Manager Resume action and require the same job
            # to finish. A second failure remains a release-gate failure rather than being hidden.
            recovery_deadline = time.monotonic() + 90
            manual_resume_count = 0
            saw_recovery_marker = False
            last_signature = None
            last_snapshot = None
            while time.monotonic() < recovery_deadline:
                snapshot = extension_job_snapshot(second, original_job_id)
                if snapshot is None:
                    time.sleep(0.1)
                    continue
                last_snapshot = snapshot
                signature = (
                    snapshot.get("state"),
                    snapshot.get("recoveryRequestedAt"),
                    snapshot.get("error"),
                    snapshot.get("bytesReceived"),
                )
                if signature != last_signature:
                    print(
                        "POST-RESTART JOB "
                        f"state={snapshot.get('state')!r} "
                        f"recoveryRequestedAt={snapshot.get('recoveryRequestedAt')!r} "
                        f"bytesReceived={snapshot.get('bytesReceived')!r} "
                        f"error={snapshot.get('error')!r}"
                    )
                    last_signature = signature

                if snapshot.get("recoveryRequestedAt") is not None:
                    saw_recovery_marker = True

                if final_path.is_file() and snapshot.get("state") == "complete":
                    break

                if snapshot.get("state") in {"interrupted", "error"} and manual_resume_count == 0:
                    resume_buttons = [
                        button
                        for button in second.find_elements(
                            "xpath", "//div[@id='jobs']//button[normalize-space()='Resume']"
                        )
                        if button.is_displayed() and button.is_enabled()
                    ]
                    if resume_buttons:
                        resume_buttons[0].click()
                        manual_resume_count += 1
                        require(True, "recoverable native job resumed through Manager after restart")

                time.sleep(0.25)
            else:
                raise AssertionError(
                    "FAIL same-job native transfer completed after restart: "
                    f"job={last_snapshot!r} ranges={FixtureHandler.ranges()!r}"
                )

            require(
                saw_recovery_marker,
                "post-restart same-job recovery request observed",
                repr(last_snapshot),
            )
            require(
                manual_resume_count <= 1,
                "restart recovery required at most one user Resume action",
                str(manual_resume_count),
            )
            require(True, "same-job native transfer completed after restart")

            require(final_path.stat().st_size == PAYLOAD_SIZE,
                    "post-restart output size", str(final_path.stat().st_size))
            output_digest = sha256(final_path)
            require(output_digest == source_digest,
                    "post-restart SHA-256 integrity", f"source={source_digest} output={output_digest}")
            require(not (download_dir / ".goreecloud-downloads" / original_job_id).exists(),
                    "original job staging cleaned after recovered completion")

            initial_segment_starts = {index * (PAYLOAD_SIZE // SEGMENTS) for index in range(SEGMENTS)}
            observed_starts = [start for start, _ in FixtureHandler.ranges()]
            resumed_starts = [start for start in observed_starts if start not in initial_segment_starts]
            require(bool(resumed_starts),
                    "post-restart HTTP Range requests resumed inside preserved segments",
                    repr(observed_starts))

            navigate_extension(second, "ui/options.html")
            wait_until(lambda: second.find_element("id", "test").is_enabled(), 10, "post-restart Settings loaded")
            second.find_element("id", "test").click()
            wait_text(second, "#status", EXPECTED_HELPER_STATUS)
            require(True, "post-restart native helper reconnect")

            print(f"Source SHA-256: {source_digest}")
            print(f"Recovered output SHA-256: {output_digest}")
            print(f"Recovered GoreeCloud job ID: {original_job_id}")
            print(f"Observed HTTP range starts: {observed_starts}")
            print(f"Manual Resume actions after restart: {manual_resume_count}")
            print("Signed Download Manager persistent-install/full-browser-restart native recovery acceptance passed.")
        finally:
            if first is not None:
                first.quit()
            if second is not None:
                second.quit()
            server.shutdown()
            server.server_close()

    return 0


if __name__ == "__main__":
    raise SystemExit(main())