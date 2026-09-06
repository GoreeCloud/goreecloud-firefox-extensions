#!/usr/bin/env python3
"""Controlled real-Firefox compatibility/recovery acceptance for Privacy Shield 0.2.

This test exercises three representative page archetypes through the installed
Privacy Shield popup: a content/article page, a script-dependent web app, and
an embedded-content page. It proves that Strict can intentionally block
ordinary third-party dependencies, Compatible restores those dependencies
without restoring a known tracker, and Reset site returns the host to Standard
behavior.

The fixtures are deterministic local archetypes, not claims about live public
websites. Representative real-site/manual compatibility review remains a
separate release gate.
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
from selenium.common.exceptions import TimeoutException, WebDriverException
from selenium.webdriver.common.by import By
from selenium.webdriver.firefox.options import Options
from selenium.webdriver.firefox.service import Service
from selenium.webdriver.support.ui import Select, WebDriverWait


EXPECTED_ADDON_ID = "privacy-shield@goreecloud.com"
MAIN_HOST = "app.test"
SCRIPT_HOST = "static.test"
FRAME_HOST = "frame.test"
TRACKER_HOST = "google-analytics.com"


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

    def _send(self, status: int, body: str, content_type: str = "text/html; charset=utf-8") -> None:
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

        if parsed.path == "/article":
            self._send(
                200,
                f"""<!doctype html><html><head><meta charset=\"utf-8\"><title>Article archetype</title></head>
<body>
  <main id=\"ready\"><article><h1>Article</h1><p>Durable reading content remains available.</p></article></main>
  <ins id=\"adnode\" class=\"adsbygoogle\">advertisement</ins>
  <script src=\"http://{SCRIPT_HOST}:{port}/article-enhance.js\"></script>
  <script src=\"http://{TRACKER_HOST}:{port}/tracker.js?surface=article\"></script>
</body></html>""",
            )
            return

        if parsed.path == "/app":
            self._send(
                200,
                f"""<!doctype html><html><head><meta charset=\"utf-8\"><title>App archetype</title></head>
<body>
  <main id=\"ready\">
    <h1>Web app</h1>
    <button id=\"app-action\" disabled>Continue</button>
    <output id=\"app-status\">waiting for application bundle</output>
  </main>
  <script src=\"http://{SCRIPT_HOST}:{port}/app.js\"></script>
  <script src=\"http://{TRACKER_HOST}:{port}/tracker.js?surface=app\"></script>
</body></html>""",
            )
            return

        if parsed.path == "/embed":
            self._send(
                200,
                f"""<!doctype html><html><head><meta charset=\"utf-8\"><title>Embed archetype</title></head>
<body>
  <main id=\"ready\"><h1>Embedded content</h1></main>
  <iframe id=\"embed\" title=\"Third-party embed\" src=\"http://{FRAME_HOST}:{port}/frame.html\"></iframe>
  <script src=\"http://{TRACKER_HOST}:{port}/tracker.js?surface=embed\"></script>
</body></html>""",
            )
            return

        if parsed.path == "/article-enhance.js":
            self._send(200, "window.article_enhanced = true;", "application/javascript")
            return

        if parsed.path == "/app.js":
            self._send(
                200,
                "window.app_bundle_loaded = true; document.getElementById('app-status').textContent = 'ready'; document.getElementById('app-action').disabled = false;",
                "application/javascript",
            )
            return

        if parsed.path == "/frame.html":
            self._send(200, "<!doctype html><html><body><p id='frame-ready'>embedded dependency loaded</p></body></html>")
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


def host_hits(hostname: str) -> list[dict[str, str]]:
    return [
        hit
        for hit in FixtureHandler.hits
        if hit["host"].split(":", 1)[0].lower() == hostname.lower()
    ]


def popup_url(driver: webdriver.Firefox) -> str:
    driver.set_context("chrome")
    try:
        result = driver.execute_script(
            """
            const addonId = arguments[0];
            try {
              const policy = WebExtensionPolicy.getByID(addonId);
              if (!policy) return {error: `no WebExtensionPolicy for ${addonId}`};
              return {url: policy.getURL('popup.html')};
            } catch (error) {
              return {error: String(error), stack: error?.stack || ''};
            }
            """,
            EXPECTED_ADDON_ID,
        )
    finally:
        driver.set_context("content")

    require(isinstance(result, dict) and not result.get("error"), "resolve installed popup URL", json.dumps(result))
    url = str(result.get("url") or "")
    require(url.startswith("moz-extension://") and url.endswith("/popup.html"), "resolved popup uses installed extension origin", url)
    return url


def open_popup_for_active_site(driver: webdriver.Firefox, site_handle: str) -> str:
    driver.switch_to.window(site_handle)
    url = popup_url(driver)
    before = set(driver.window_handles)

    driver.set_context("chrome")
    try:
        result = driver.execute_async_script(
            """
            const url = arguments[0];
            const done = arguments[arguments.length - 1];
            (async () => {
              try {
                const options = {inBackground: true};
                let tab;
                if (typeof gBrowser.addTrustedTab === 'function') {
                  tab = gBrowser.addTrustedTab(url, options);
                } else {
                  tab = gBrowser.addTab(url, {...options, triggeringPrincipal: document.nodePrincipal});
                }
                const browser = tab.linkedBrowser;
                const deadline = Date.now() + 10000;
                while (Date.now() < deadline) {
                  if (browser.currentURI?.spec === url && !browser.webProgress?.isLoadingDocument) {
                    await new Promise((resolve) => setTimeout(resolve, 500));
                    done({ok: true, uri: browser.currentURI.spec});
                    return;
                  }
                  await new Promise((resolve) => setTimeout(resolve, 50));
                }
                done({error: `popup tab did not finish loading: ${browser.currentURI?.spec || ''}`});
              } catch (error) {
                done({error: String(error), stack: error?.stack || ''});
              }
            })();
            """,
            url,
        )
    finally:
        driver.set_context("content")

    require(isinstance(result, dict) and result.get("ok") is True, "initialize popup while compatibility site stays active", json.dumps(result))
    new_handles = list(set(driver.window_handles) - before)
    require(len(new_handles) == 1, "one popup inspection tab created", json.dumps(driver.window_handles))
    popup_handle = new_handles[0]
    driver.switch_to.window(popup_handle)
    wait_for(
        driver,
        lambda d: d.find_element(By.ID, "site").text == MAIN_HOST
        and "Checking protection" not in d.find_element(By.ID, "protectionState").text,
        "popup did not initialize against compatibility fixture host",
    )
    return popup_handle


def return_to_site(driver: webdriver.Firefox, site_handle: str) -> None:
    if site_handle not in driver.window_handles:
        raise AssertionError("compatibility fixture tab disappeared")
    try:
        current = driver.current_window_handle
    except WebDriverException:
        current = None
    if current and current != site_handle and current in driver.window_handles:
        try:
            driver.close()
        except WebDriverException:
            pass
    driver.switch_to.window(site_handle)
    wait_for(driver, lambda d: d.execute_script("return document.readyState") == "complete", "fixture did not finish reload after profile change")
    wait_for(driver, lambda d: d.find_elements(By.ID, "ready"), "fixture content missing after profile change")
    time.sleep(0.6)


def apply_profile(driver: webdriver.Firefox, site_handle: str, profile: str) -> None:
    open_popup_for_active_site(driver, site_handle)
    selector = Select(driver.find_element(By.ID, "siteProfile"))
    selector.select_by_value(profile)
    wait_for(driver, lambda d: not d.find_element(By.ID, "applyProfile").get_attribute("disabled"), f"{profile} Apply button stayed disabled")
    driver.find_element(By.ID, "applyProfile").click()
    time.sleep(0.4)
    return_to_site(driver, site_handle)


def reset_site(driver: webdriver.Firefox, site_handle: str) -> None:
    open_popup_for_active_site(driver, site_handle)
    reset = driver.find_element(By.ID, "resetSite")
    require(not reset.get_attribute("disabled"), "Reset site is available after profile override")
    reset.click()
    time.sleep(0.4)
    return_to_site(driver, site_handle)


def navigate(driver: webdriver.Firefox, port: int, path: str) -> None:
    FixtureHandler.reset_hits()
    driver.get(f"http://{MAIN_HOST}:{port}{path}")
    wait_for(driver, lambda d: d.find_elements(By.ID, "ready"), f"{path} fixture did not load")
    time.sleep(0.75)


def assert_tracker_stays_blocked(label: str) -> None:
    require(not host_hits(TRACKER_HOST), f"{label} keeps known tracker blocked", json.dumps(host_hits(TRACKER_HOST)))


def assert_standard_archetypes(driver: webdriver.Firefox, port: int, prefix: str) -> None:
    navigate(driver, port, "/article")
    wait_for(driver, lambda d: d.execute_script("return window.article_enhanced === true;"), f"{prefix} article enhancement did not load")
    require(bool(host_hits(SCRIPT_HOST)), f"{prefix} article ordinary third-party script is allowed")
    assert_tracker_stays_blocked(f"{prefix} article")
    wait_for(
        driver,
        lambda d: d.execute_script("return getComputedStyle(document.getElementById('adnode')).display === 'none';"),
        f"{prefix} Standard cosmetic filtering did not hide article ad",
    )

    navigate(driver, port, "/app")
    wait_for(driver, lambda d: d.find_element(By.ID, "app-status").text == "ready", f"{prefix} web-app bundle did not restore interactivity")
    require(driver.find_element(By.ID, "app-action").is_enabled(), f"{prefix} web-app action is usable")
    require(bool(host_hits(SCRIPT_HOST)), f"{prefix} web-app ordinary third-party bundle is allowed")
    assert_tracker_stays_blocked(f"{prefix} web app")

    navigate(driver, port, "/embed")
    wait_for(driver, lambda _d: bool(host_hits(FRAME_HOST)), f"{prefix} third-party embed did not load")
    assert_tracker_stays_blocked(f"{prefix} embed")


def assert_strict_breakage(driver: webdriver.Firefox, port: int) -> None:
    navigate(driver, port, "/article")
    require(driver.execute_script("return window.article_enhanced === true;") is False, "Strict blocks article third-party enhancement execution")
    require(not host_hits(SCRIPT_HOST), "Strict blocks article third-party enhancement request", json.dumps(host_hits(SCRIPT_HOST)))
    assert_tracker_stays_blocked("Strict article")
    wait_for(
        driver,
        lambda d: d.execute_script("return getComputedStyle(document.getElementById('adnode')).display === 'none';"),
        "Strict retains cosmetic filtering",
    )

    navigate(driver, port, "/app")
    require(driver.find_element(By.ID, "app-status").text == "waiting for application bundle", "Strict demonstrates script-dependent app breakage")
    require(not driver.find_element(By.ID, "app-action").is_enabled(), "Strict leaves script-dependent app action unavailable")
    require(not host_hits(SCRIPT_HOST), "Strict blocks script-dependent app bundle request", json.dumps(host_hits(SCRIPT_HOST)))
    assert_tracker_stays_blocked("Strict web app")

    navigate(driver, port, "/embed")
    require(not host_hits(FRAME_HOST), "Strict blocks third-party embedded frame", json.dumps(host_hits(FRAME_HOST)))
    assert_tracker_stays_blocked("Strict embed")


def assert_compatible_recovery(driver: webdriver.Firefox, port: int) -> None:
    navigate(driver, port, "/article")
    wait_for(driver, lambda d: d.execute_script("return window.article_enhanced === true;"), "Compatible restores article third-party enhancement")
    require(bool(host_hits(SCRIPT_HOST)), "Compatible restores article third-party request")
    assert_tracker_stays_blocked("Compatible article")
    require(
        driver.execute_script("return getComputedStyle(document.getElementById('adnode')).display !== 'none';") is True,
        "Compatible reduces cosmetic page alteration",
    )

    navigate(driver, port, "/app")
    wait_for(driver, lambda d: d.find_element(By.ID, "app-status").text == "ready", "Compatible recovers script-dependent web app")
    require(driver.find_element(By.ID, "app-action").is_enabled(), "Compatible restores script-dependent app action")
    require(bool(host_hits(SCRIPT_HOST)), "Compatible restores script-dependent app bundle request")
    assert_tracker_stays_blocked("Compatible web app")

    navigate(driver, port, "/embed")
    wait_for(driver, lambda _d: bool(host_hits(FRAME_HOST)), "Compatible restores third-party embedded frame")
    assert_tracker_stays_blocked("Compatible embed")


def main() -> int:
    if len(sys.argv) != 2:
        raise SystemExit("usage: compatibility_recovery_smoke.py /path/to/privacy-shield.xpi")

    xpi = Path(sys.argv[1]).resolve()
    require(xpi.is_file(), "packaged XPI exists", str(xpi))

    server = ThreadingHTTPServer(("127.0.0.1", 0), FixtureHandler)
    FixtureHandler.port = int(server.server_address[1])
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()

    options = Options()
    options.add_argument("-headless")
    options.set_preference("browser.shell.checkDefaultBrowser", False)
    options.set_preference("browser.startup.page", 0)
    options.set_preference("datareporting.policy.dataSubmissionEnabled", False)
    options.set_preference("toolkit.telemetry.reportingpolicy.firstRun", False)
    options.set_preference("network.stricttransportsecurity.preloadlist", False)
    service = Service(service_args=["--allow-system-access"])

    driver: webdriver.Firefox | None = None
    try:
        driver = webdriver.Firefox(options=options, service=service)
        addon_id = driver.install_addon(str(xpi), temporary=True)
        require(addon_id == EXPECTED_ADDON_ID, "temporary Firefox installation", str(addon_id))
        time.sleep(0.75)

        assert_standard_archetypes(driver, FixtureHandler.port, "Standard baseline")
        site_handle = driver.current_window_handle

        apply_profile(driver, site_handle, "strict")
        assert_strict_breakage(driver, FixtureHandler.port)
        site_handle = driver.current_window_handle

        apply_profile(driver, site_handle, "compatible")
        assert_compatible_recovery(driver, FixtureHandler.port)
        site_handle = driver.current_window_handle

        reset_site(driver, site_handle)
        assert_standard_archetypes(driver, FixtureHandler.port, "Reset-to-Standard recovery")

        print("PASS controlled representative-archetype Strict -> Compatible -> Reset recovery acceptance")
        print("NOTE live representative-site/manual compatibility review remains required for release promotion")
        return 0
    finally:
        if driver is not None:
            try:
                driver.quit()
            except WebDriverException:
                pass
        server.shutdown()
        server.server_close()
        thread.join(timeout=2)


if __name__ == "__main__":
    raise SystemExit(main())
