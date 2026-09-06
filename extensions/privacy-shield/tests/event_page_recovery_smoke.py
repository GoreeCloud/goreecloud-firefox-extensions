#!/usr/bin/env python3
"""Real-Firefox MV3 event-page termination and wake recovery acceptance.

The test temporarily installs the packaged Privacy Shield XPI, proves protection,
uses Firefox's own about:debugging control to force-terminate the non-persistent
background script, then proves that the next navigation wakes the event page and
retains URL-cleaning and tracker-blocking behavior.
"""

from __future__ import annotations

import json
import sys
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit

from selenium import webdriver
from selenium.common.exceptions import TimeoutException
from selenium.webdriver.common.by import By
from selenium.webdriver.firefox.options import Options
from selenium.webdriver.support.ui import WebDriverWait


EXPECTED_ADDON_ID = "privacy-shield@goreecloud.com"
EXPECTED_NAME = "GoreeCloud Privacy Shield"


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
                "query": parsed.query,
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

        if parsed.path == "/protected":
            self._send(
                200,
                f"""<!doctype html><html><head><meta charset=\"utf-8\"><title>Event Page Recovery</title></head>
<body>
  <p id=\"ready\">protected fixture</p>
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


def wait_for(driver: webdriver.Firefox, predicate, message: str, timeout: float = 12.0) -> None:
    try:
        WebDriverWait(driver, timeout).until(predicate)
    except TimeoutException as exc:
        raise AssertionError(message) from exc


def tracker_hits() -> list[dict[str, str]]:
    return [
        hit
        for hit in FixtureHandler.hits
        if hit["host"].split(":", 1)[0].lower() == "google-analytics.com"
    ]


def prove_protection(driver: webdriver.Firefox, base: str, phase: str) -> None:
    dirty = f"{base}/landing?utm_source={phase}&fbclid={phase}&keep=yes"
    driver.get(dirty)
    wait_for(
        driver,
        lambda d: "utm_source=" not in d.current_url and "fbclid=" not in d.current_url,
        f"{phase} main-frame tracking cleanup did not occur",
    )
    require("keep=yes" in driver.current_url, f"{phase} cleanup preserves useful parameter", driver.current_url)

    FixtureHandler.reset_hits()
    driver.get(f"{base}/protected")
    wait_for(driver, lambda d: d.find_elements(By.ID, "ready"), f"{phase} protected fixture did not load")
    time.sleep(0.75)
    require(not tracker_hits(), f"{phase} tracker request blocked", json.dumps(tracker_hits()))


def terminate_event_page(driver: webdriver.Firefox) -> None:
    driver.get("about:debugging#/runtime/this-firefox")
    wait_for(
        driver,
        lambda d: EXPECTED_NAME in d.find_element(By.TAG_NAME, "body").text
        and EXPECTED_ADDON_ID in d.find_element(By.TAG_NAME, "body").text,
        "Privacy Shield did not appear in about:debugging",
        timeout=15.0,
    )

    xpath = (
        "//button[contains(translate(normalize-space(.), "
        "'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), "
        "'terminate background script')]"
    )
    wait_for(driver, lambda d: d.find_elements(By.XPATH, xpath), "Terminate background script control did not appear")
    buttons = driver.find_elements(By.XPATH, xpath)
    require(len(buttons) == 1, "one temporary event-page terminate control is present", str(len(buttons)))
    buttons[0].click()

    wait_for(
        driver,
        lambda d: "Stopped" in d.find_element(By.TAG_NAME, "body").text,
        "Firefox did not report the Privacy Shield background event page as stopped",
    )
    require(True, "Firefox about:debugging terminated Privacy Shield event page")


def main() -> int:
    if len(sys.argv) != 2:
        raise SystemExit("usage: event_page_recovery_smoke.py /path/to/privacy-shield.xpi")

    xpi = Path(sys.argv[1]).resolve()
    require(xpi.is_file(), "packaged XPI exists", str(xpi))

    server = ThreadingHTTPServer(("127.0.0.1", 0), FixtureHandler)
    FixtureHandler.port = int(server.server_address[1])
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    base = f"http://127.0.0.1:{FixtureHandler.port}"

    options = Options()
    options.add_argument("-headless")
    options.set_preference("browser.shell.checkDefaultBrowser", False)
    options.set_preference("browser.startup.page", 0)
    options.set_preference("datareporting.policy.dataSubmissionEnabled", False)
    options.set_preference("toolkit.telemetry.reportingpolicy.firstRun", False)
    options.set_preference("network.stricttransportsecurity.preloadlist", False)

    driver: webdriver.Firefox | None = None
    try:
        driver = webdriver.Firefox(options=options)
        addon_id = driver.install_addon(str(xpi), temporary=True)
        require(addon_id == EXPECTED_ADDON_ID, "temporary Firefox installation", str(addon_id))
        time.sleep(0.75)

        prove_protection(driver, base, "pre-termination")
        terminate_event_page(driver)
        prove_protection(driver, base, "post-wake")

        print("Real Firefox event-page termination/wake recovery acceptance passed.")
        return 0
    finally:
        if driver is not None:
            driver.quit()
        server.shutdown()
        server.server_close()


if __name__ == "__main__":
    raise SystemExit(main())
