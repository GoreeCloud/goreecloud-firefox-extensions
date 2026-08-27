#!/usr/bin/env python3
"""Headless Firefox runtime smoke tests for GoreeCloud Privacy Shield.

This suite temporarily installs the packaged unsigned XPI into a real Firefox
instance and tests browser-observable behavior against a local HTTP fixture.
It intentionally does not claim Mozilla signing or full manual release
acceptance.
"""

from __future__ import annotations

import json
import sys
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import quote, urlsplit

from selenium import webdriver
from selenium.common.exceptions import TimeoutException
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.firefox.options import Options
from selenium.webdriver.support.ui import WebDriverWait


class FixtureHandler(BaseHTTPRequestHandler):
    hits: list[dict[str, object]] = []
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
                "if_none_match": self.headers.get("If-None-Match"),
            }
        )

    def _send(self, status: int, body: str, content_type: str, headers: dict[str, str] | None = None) -> None:
        payload = body.encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(payload)))
        for key, value in (headers or {}).items():
            self.send_header(key, value)
        self.end_headers()
        self.wfile.write(payload)

    def do_GET(self) -> None:  # noqa: N802 - BaseHTTPRequestHandler API
        self._record()
        parsed = urlsplit(self.path)
        port = self.__class__.port

        if parsed.path == "/test":
            redirect_target = f"http://127.0.0.1:{port}/landing?utm_source=redirect&keep=redirected"
            google_redirect = "https://www.google.com/url?q=" + quote(redirect_target, safe="")
            body = f"""<!doctype html>
<html><head><meta charset=\"utf-8\"><title>Privacy Shield Runtime</title></head>
<body>
  <a id=\"dirty\" href=\"/landing?utm_source=link&fbclid=abc&keep=clean\" ping=\"/audit\">dirty link</a>
  <a id=\"redirect\" href=\"{google_redirect}\">redirect link</a>
  <ins id=\"adnode\" class=\"adsbygoogle\">advertisement</ins>
  <script src=\"http://google-analytics.com:{port}/tracker.js\"></script>
  <script src=\"http://doubleclick.net:{port}/ad.js\"></script>
  <script src=\"http://coinhive.com:{port}/miner.js\"></script>
</body></html>"""
            self._send(200, body, "text/html; charset=utf-8")
            return

        if parsed.path == "/landing":
            self._send(200, "<!doctype html><title>Landing</title><p id='landing'>landing</p>", "text/html; charset=utf-8")
            return

        if parsed.path == "/etag":
            self._send(
                200,
                json.dumps({"ok": True}),
                "application/json",
                {"ETag": '"privacy-shield-runtime"', "Cache-Control": "no-cache"},
            )
            return

        if parsed.path == "/echo-if-none-match":
            self._send(
                200,
                json.dumps({"if_none_match": self.headers.get("If-None-Match")}),
                "application/json",
            )
            return

        if parsed.path in {"/tracker.js", "/ad.js", "/miner.js"}:
            marker = parsed.path.strip("/").replace(".", "_")
            self._send(200, f"window.{marker}_loaded = true;", "application/javascript")
            return

        if parsed.path == "/popup":
            self._send(200, "<!doctype html><title>Popup</title>", "text/html; charset=utf-8")
            return

        self._send(404, "not found", "text/plain; charset=utf-8")


def require(condition: bool, name: str, detail: str = "") -> None:
    if not condition:
        suffix = f": {detail}" if detail else ""
        raise AssertionError(f"FAIL {name}{suffix}")
    print(f"PASS {name}")


def host_hits(hostname: str) -> list[dict[str, object]]:
    return [
        hit for hit in FixtureHandler.hits
        if str(hit["host"]).split(":", 1)[0].lower() == hostname.lower()
    ]


def wait_for(driver: webdriver.Firefox, predicate, message: str, timeout: float = 10.0) -> None:
    try:
        WebDriverWait(driver, timeout).until(predicate)
    except TimeoutException as exc:
        raise AssertionError(message) from exc


def main() -> int:
    if len(sys.argv) != 2:
        raise SystemExit("usage: runtime_smoke.py /path/to/privacy-shield.xpi")

    xpi = Path(sys.argv[1]).resolve()
    require(xpi.is_file(), "packaged XPI exists", str(xpi))

    server = ThreadingHTTPServer(("127.0.0.1", 0), FixtureHandler)
    FixtureHandler.port = server.server_address[1]
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    base = f"http://127.0.0.1:{FixtureHandler.port}"

    options = Options()
    options.add_argument("-headless")
    options.set_preference("browser.shell.checkDefaultBrowser", False)
    options.set_preference("browser.startup.page", 0)
    options.set_preference("datareporting.policy.dataSubmissionEnabled", False)
    options.set_preference("toolkit.telemetry.reportingpolicy.firstRun", False)

    driver: webdriver.Firefox | None = None
    try:
        driver = webdriver.Firefox(options=options)
        addon_id = driver.install_addon(str(xpi), temporary=True)
        require(bool(addon_id), "temporary Firefox installation", str(addon_id))
        time.sleep(0.75)

        dirty_main = f"{base}/landing?utm_source=runtime&fbclid=runtime-click&keep=yes"
        driver.get(dirty_main)
        wait_for(
            driver,
            lambda d: "utm_source=" not in d.current_url and "fbclid=" not in d.current_url,
            "main-frame tracking parameters were not removed",
        )
        require("keep=yes" in driver.current_url, "main-frame cleanup preserves non-tracking parameters", driver.current_url)

        FixtureHandler.reset_hits()
        driver.get(f"{base}/test")

        def page_protected(d: webdriver.Firefox) -> bool:
            return bool(
                d.execute_script(
                    """
                    const dirty = document.getElementById('dirty');
                    const redirect = document.getElementById('redirect');
                    const ad = document.getElementById('adnode');
                    return dirty && redirect && ad &&
                      !dirty.href.includes('utm_source=') &&
                      !dirty.href.includes('fbclid=') &&
                      !dirty.hasAttribute('ping') &&
                      redirect.href.startsWith(arguments[0]) &&
                      getComputedStyle(ad).display === 'none';
                    """,
                    base,
                )
            )

        wait_for(driver, page_protected, "content-script protections did not converge")
        state = driver.execute_script(
            """
            const dirty = document.getElementById('dirty');
            const redirect = document.getElementById('redirect');
            const ad = document.getElementById('adnode');
            return {
              dirty: dirty.href,
              ping: dirty.hasAttribute('ping'),
              redirect: redirect.href,
              adDisplay: getComputedStyle(ad).display
            };
            """
        )
        require("keep=clean" in state["dirty"], "page-link cleanup preserves useful parameters", state["dirty"])
        require(not state["ping"], "hyperlink auditing ping attribute removed")
        require(
            state["redirect"].startswith(f"{base}/landing?")
            and "utm_source=" not in state["redirect"]
            and "keep=redirected" in state["redirect"],
            "tracking redirect bypass and cleanup",
            state["redirect"],
        )
        require(state["adDisplay"] == "none", "built-in cosmetic filtering")

        time.sleep(0.75)
        require(not host_hits("google-analytics.com"), "tracker-domain request blocked")
        require(not host_hits("doubleclick.net"), "ad-domain request blocked")
        require(not host_hits("coinhive.com"), "cryptocurrency-miner request blocked")

        dirty_copy = f"{base}/copy?utm_source=clipboard&fbclid=copy&keep=clipboard"
        driver.execute_script(
            """
            const source = document.createElement('span');
            source.id = 'copy-source';
            source.textContent = arguments[0];
            document.body.appendChild(source);
            const target = document.createElement('textarea');
            target.id = 'paste-target';
            document.body.appendChild(target);
            const range = document.createRange();
            range.selectNodeContents(source);
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);
            """,
            dirty_copy,
        )
        ActionChains(driver).key_down(Keys.CONTROL).send_keys("c").key_up(Keys.CONTROL).perform()
        time.sleep(0.2)
        paste_target = driver.find_element(By.ID, "paste-target")
        paste_target.click()
        ActionChains(driver).key_down(Keys.CONTROL).send_keys("v").key_up(Keys.CONTROL).perform()
        time.sleep(0.2)
        copied = paste_target.get_attribute("value") or ""
        require(
            "utm_source=" not in copied and "fbclid=" not in copied and "keep=clipboard" in copied,
            "copied-link cleanup",
            copied,
        )

        etag = driver.execute_async_script(
            """
            const done = arguments[arguments.length - 1];
            fetch('/etag', {cache: 'no-store'})
              .then(response => done({ok: true, etag: response.headers.get('etag')}))
              .catch(error => done({ok: false, error: String(error)}));
            """
        )
        require(etag.get("ok") is True, "ETag fixture request completed", str(etag))
        require(etag.get("etag") is None, "response ETag stripped", str(etag))

        request_header = driver.execute_async_script(
            """
            const done = arguments[arguments.length - 1];
            fetch('/echo-if-none-match', {
              cache: 'no-store',
              headers: {'If-None-Match': '"client-runtime-tag"'}
            })
              .then(response => response.json())
              .then(data => done({ok: true, data}))
              .catch(error => done({ok: false, error: String(error)}));
            """
        )
        require(request_header.get("ok") is True, "If-None-Match fixture request completed", str(request_header))
        require(
            request_header.get("data", {}).get("if_none_match") is None,
            "request If-None-Match stripped",
            str(request_header),
        )

        wait_for(
            driver,
            lambda d: d.execute_script("return window.__goreecloudPrivacyShieldPopupGuard === true;"),
            "popup guard was not injected into the page world",
        )
        wait_for(
            driver,
            lambda d: d.execute_script("return !navigator.userActivation || !navigator.userActivation.isActive;"),
            "transient user activation did not expire before popup test",
            timeout=10.0,
        )
        handles_before = len(driver.window_handles)
        popup_blocked = driver.execute_script("return window.open('/popup', '_blank') === null;")
        time.sleep(0.25)
        require(popup_blocked and len(driver.window_handles) == handles_before, "non-user-activated popup blocked")

        margin_before = driver.execute_script("return getComputedStyle(document.body).marginTop;")
        require(margin_before != "0px", "CDN substitution fixture starts without normalize.css", margin_before)
        driver.execute_script(
            """
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.id = 'normalize-runtime';
            link.href = 'https://cdn.jsdelivr.net/npm/normalize.css@8.0.1/normalize.css';
            document.head.appendChild(link);
            """
        )
        wait_for(
            driver,
            lambda d: d.execute_script("return getComputedStyle(document.body).marginTop;") == "0px",
            "reviewed local CDN substitution did not apply bundled normalize.css",
            timeout=12.0,
        )
        require(True, "reviewed local CDN resource substituted and applied")

        print("\nFirefox runtime smoke suite passed.")
        return 0
    finally:
        if driver is not None:
            driver.quit()
        server.shutdown()
        server.server_close()


if __name__ == "__main__":
    raise SystemExit(main())
