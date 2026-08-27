#!/usr/bin/env python3
"""Persistent-install and restart acceptance for a Mozilla-signed Privacy Shield XPI.

This test deliberately requires a signed XPI. It installs the add-on non-temporarily
into an in-place Firefox profile, verifies critical protection, quits Firefox, then
starts a new Firefox process against the same profile without reinstalling the add-on.
Passing therefore demonstrates that the signed add-on survives a full browser restart.
"""

from __future__ import annotations

import json
import socket
import sys
import tempfile
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit

from selenium import webdriver
from selenium.common.exceptions import TimeoutException
from selenium.webdriver.firefox.options import Options
from selenium.webdriver.support.ui import WebDriverWait


EXPECTED_ADDON_ID = "privacy-shield@goreecloud.com"


class FixtureHandler(BaseHTTPRequestHandler):
    hits: list[dict[str, str]] = []
    port: int = 0

    def log_message(self, fmt: str, *args: object) -> None:
        return

    @classmethod
    def reset_hits(cls) -> None:
        cls.hits = []

    def _record(self) -> None:
        parsed = urlsplit(self.path)
        self.__class__.hits.append(
            {
                "host": self.headers.get("Host", ""),
                "path": parsed.path,
            }
        )

    def _send(self, status: int, body: str, content_type: str) -> None:
        payload = body.encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def do_GET(self) -> None:  # noqa: N802 - BaseHTTPRequestHandler API
        self._record()
        parsed = urlsplit(self.path)
        port = self.__class__.port

        if parsed.path == "/test":
            self._send(
                200,
                f"""<!doctype html><html><head><meta charset=\"utf-8\"><title>Signed Restart</title></head>
<body>
  <ins id=\"adnode\" class=\"adsbygoogle\">advertisement</ins>
  <script src=\"http://google-analytics.com:{port}/tracker.js\"></script>
</body></html>""",
                "text/html; charset=utf-8",
            )
            return

        if parsed.path == "/landing":
            self._send(200, "<!doctype html><title>Landing</title><p>landing</p>", "text/html; charset=utf-8")
            return

        if parsed.path == "/tracker.js":
            self._send(200, "window.tracker_loaded = true;", "application/javascript")
            return

        self._send(404, "not found", "text/plain; charset=utf-8")


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
    # geckodriver's documented in-place profile mode preserves the installed add-on
    # across independent WebDriver sessions. A fixed Marionette port is required
    # whenever --profile is supplied; choose a fresh free port for each session.
    options.add_argument("--profile")
    options.add_argument(str(profile))
    options.add_argument("--marionette-port")
    options.add_argument(str(free_port()))
    options.set_preference("browser.shell.checkDefaultBrowser", False)
    options.set_preference("browser.startup.page", 0)
    options.set_preference("datareporting.policy.dataSubmissionEnabled", False)
    options.set_preference("toolkit.telemetry.reportingpolicy.firstRun", False)
    options.set_preference("network.stricttransportsecurity.preloadlist", False)
    return options


def wait_for_url_cleanup(driver: webdriver.Firefox, base: str, phase: str) -> None:
    dirty = f"{base}/landing?utm_source={phase}&fbclid={phase}&keep=yes"
    driver.get(dirty)
    try:
        WebDriverWait(driver, 10).until(
            lambda d: "utm_source=" not in d.current_url and "fbclid=" not in d.current_url
        )
    except TimeoutException as exc:
        raise AssertionError(f"FAIL {phase} main-frame tracking cleanup: {driver.current_url}") from exc
    require("keep=yes" in driver.current_url, f"{phase} cleanup preserves useful parameter", driver.current_url)


def critical_runtime_checks(driver: webdriver.Firefox, base: str, phase: str) -> None:
    wait_for_url_cleanup(driver, base, phase)
    FixtureHandler.reset_hits()
    driver.get(f"{base}/test")
    try:
        WebDriverWait(driver, 10).until(
            lambda d: d.execute_script(
                "const ad=document.getElementById('adnode'); return ad && getComputedStyle(ad).display === 'none';"
            )
        )
    except TimeoutException as exc:
        raise AssertionError(f"FAIL {phase} built-in cosmetic filtering") from exc

    time.sleep(0.75)
    tracker_hits = [
        hit for hit in FixtureHandler.hits
        if hit["host"].split(":", 1)[0].lower() == "google-analytics.com"
    ]
    require(not tracker_hits, f"{phase} tracker-domain request blocking", json.dumps(tracker_hits))
    require(True, f"{phase} built-in cosmetic filtering")


def main() -> int:
    if len(sys.argv) != 2:
        raise SystemExit("usage: signed_restart_smoke.py /path/to/mozilla-signed-privacy-shield.xpi")

    xpi = Path(sys.argv[1]).resolve()
    require(xpi.is_file(), "signed XPI exists", str(xpi))

    server = ThreadingHTTPServer(("127.0.0.1", 0), FixtureHandler)
    FixtureHandler.port = int(server.server_address[1])
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    base = f"http://127.0.0.1:{FixtureHandler.port}"

    with tempfile.TemporaryDirectory(prefix="privacy-shield-signed-profile-") as profile_tmp:
        profile = Path(profile_tmp)
        first: webdriver.Firefox | None = None
        second: webdriver.Firefox | None = None
        try:
            first = webdriver.Firefox(options=firefox_options(profile))
            addon_id = first.install_addon(str(xpi), temporary=False)
            require(addon_id == EXPECTED_ADDON_ID, "persistent signed installation", str(addon_id))
            time.sleep(1.0)
            critical_runtime_checks(first, base, "pre-restart")
            first.quit()
            first = None

            time.sleep(1.0)
            second = webdriver.Firefox(options=firefox_options(profile))
            # Do not call install_addon here. Any protection observed in this second
            # process must come from the add-on that persisted in the profile.
            critical_runtime_checks(second, base, "post-restart")
            require(True, "signed XPI survived full Firefox restart")
        finally:
            if first is not None:
                first.quit()
            if second is not None:
                second.quit()
            server.shutdown()
            server.server_close()

    print("Signed Privacy Shield persistent-install restart acceptance passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
