#!/usr/bin/env python3
"""Real-Firefox acceptance for Privacy Shield 0.2 popup quick controls.

The test installs the packaged unsigned XPI into an isolated Firefox profile,
creates ordinary browsing activity, opens the extension popup document in a
background tab while the protected site remains the active tab, and verifies
browser-observable popup behavior plus the Standard/Strict/Compatible runtime
profile effects.

This is source/runtime candidate evidence only. It does not claim Mozilla
signing, persistent signed-install acceptance, or Stable promotion.
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
EXPECTED_HOST = "127.0.0.1"
THIRD_PARTY_HOST = "thirdparty.test"
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

        if parsed.path == "/page":
            self._send(
                200,
                f"""<!doctype html><html><head><meta charset=\"utf-8\"><title>Popup Controls</title></head>
<body>
  <p id=\"ready\">popup controls fixture</p>
  <a id=\"dirty-link\" href=\"/next?utm_source=page-link&fbclid=page-link&keep=1\">dirty link</a>
  <ins id=\"adnode\" class=\"adsbygoogle\">advertisement</ins>
  <script src=\"http://{THIRD_PARTY_HOST}:{port}/third-party.js\"></script>
  <script src=\"http://{TRACKER_HOST}:{port}/tracker.js\"></script>
</body></html>""",
                "text/html; charset=utf-8",
            )
            return

        if parsed.path == "/third-party.js":
            self._send(200, "window.third_party_loaded = true;", "application/javascript")
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


def close_popup_and_return(driver: webdriver.Firefox, site_handle: str) -> None:
    """Return to the protected site whether popup window.close() succeeded or not."""

    handles = driver.window_handles
    if site_handle not in handles:
        raise AssertionError("protected site tab disappeared while using popup controls")
    try:
        current = driver.current_window_handle
    except WebDriverException:
        current = None
    if current and current != site_handle and current in handles:
        try:
            driver.close()
        except WebDriverException:
            pass
    driver.switch_to.window(site_handle)


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
    """Load popup.html in a background tab before Selenium activates that tab.

    popup.js queries Firefox for the active tab immediately at startup. Keeping the
    fixture tab selected until popup initialization completes reproduces the same
    tab-selection contract used by the real browser-action popup while still
    allowing Selenium to inspect the popup document afterward.
    """

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
                  tab = gBrowser.addTab(url, {
                    ...options,
                    triggeringPrincipal: document.nodePrincipal
                  });
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

    require(isinstance(result, dict) and result.get("ok") is True, "initialize popup while protected site stays active", json.dumps(result))
    after = set(driver.window_handles)
    new_handles = list(after - before)
    require(len(new_handles) == 1, "one popup inspection tab created", json.dumps(sorted(after)))
    popup_handle = new_handles[0]
    driver.switch_to.window(popup_handle)

    wait_for(
        driver,
        lambda d: d.find_element(By.ID, "site").text == EXPECTED_HOST
        and "Checking protection" not in d.find_element(By.ID, "protectionState").text,
        "popup did not initialize against the protected active tab",
    )
    return popup_handle


def current_profile(driver: webdriver.Firefox) -> str:
    return Select(driver.find_element(By.ID, "siteProfile")).first_selected_option.get_attribute("value") or ""


def apply_profile(driver: webdriver.Firefox, site_handle: str, profile: str) -> None:
    selector = Select(driver.find_element(By.ID, "siteProfile"))
    selector.select_by_value(profile)
    wait_for(driver, lambda d: not d.find_element(By.ID, "applyProfile").get_attribute("disabled"), f"{profile} Apply button stayed disabled")
    FixtureHandler.reset_hits()
    driver.find_element(By.ID, "applyProfile").click()
    time.sleep(0.35)
    close_popup_and_return(driver, site_handle)
    wait_for(driver, lambda d: d.execute_script("return document.readyState") == "complete", f"site did not finish reload after applying {profile}")
    wait_for(driver, lambda d: d.find_elements(By.ID, "ready"), f"site fixture missing after applying {profile}")
    time.sleep(0.75)


def assert_standard_runtime(driver: webdriver.Firefox) -> None:
    wait_for(driver, lambda d: d.execute_script("return window.third_party_loaded === true;"), "Standard mode did not allow ordinary third-party script")
    wait_for(
        driver,
        lambda d: d.execute_script("return getComputedStyle(document.getElementById('adnode')).display === 'none';"),
        "Standard mode did not retain cosmetic ad filtering",
    )
    require(bool(host_hits(THIRD_PARTY_HOST)), "Standard mode third-party request reached fixture")
    require(not host_hits(TRACKER_HOST), "Standard mode still blocks tracker request", json.dumps(host_hits(TRACKER_HOST)))


def assert_strict_runtime(driver: webdriver.Firefox) -> None:
    require(not host_hits(THIRD_PARTY_HOST), "Strict mode blocks otherwise-allowed third-party script", json.dumps(host_hits(THIRD_PARTY_HOST)))
    require(driver.execute_script("return window.third_party_loaded === true;") is False, "Strict mode prevented third-party script execution")
    require(not host_hits(TRACKER_HOST), "Strict mode still blocks tracker request", json.dumps(host_hits(TRACKER_HOST)))
    wait_for(
        driver,
        lambda d: d.execute_script("return getComputedStyle(document.getElementById('adnode')).display === 'none';"),
        "Strict mode must retain cosmetic filtering",
    )


def assert_compatible_runtime(driver: webdriver.Firefox) -> None:
    wait_for(driver, lambda d: d.execute_script("return window.third_party_loaded === true;"), "Compatible mode did not restore third-party script compatibility")
    require(bool(host_hits(THIRD_PARTY_HOST)), "Compatible mode third-party request reached fixture")
    require(not host_hits(TRACKER_HOST), "Compatible mode retains tracker blocking", json.dumps(host_hits(TRACKER_HOST)))
    require(
        driver.execute_script("return getComputedStyle(document.getElementById('adnode')).display !== 'none';") is True,
        "Compatible mode reduces page alteration by disabling cosmetic filtering",
    )


def main() -> int:
    if len(sys.argv) != 2:
        raise SystemExit("usage: popup_quick_controls_smoke.py /path/to/privacy-shield.xpi")

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

    # Firefox 138+ requires explicit system-access opt-in for chrome-context UI
    # automation. This isolated test uses it only to resolve the installed popup
    # origin and create a background inspection tab without stealing active-tab
    # selection before popup.js performs its initial browser.tabs.query().
    service = Service(service_args=["--allow-system-access"])

    driver: webdriver.Firefox | None = None
    try:
        driver = webdriver.Firefox(options=options, service=service)
        addon_id = driver.install_addon(str(xpi), temporary=True)
        require(addon_id == EXPECTED_ADDON_ID, "temporary Firefox installation", str(addon_id))
        time.sleep(0.75)

        FixtureHandler.reset_hits()
        driver.get(f"{base}/page?utm_source=popup-acceptance&fbclid=popup-acceptance&keep=yes")
        wait_for(driver, lambda d: d.find_elements(By.ID, "ready"), "initial protected fixture did not load")
        wait_for(
            driver,
            lambda d: "utm_source=" not in d.current_url and "fbclid=" not in d.current_url and "keep=yes" in d.current_url,
            "initial main-frame tracking cleanup did not converge",
        )
        wait_for(
            driver,
            lambda d: "utm_source=" not in (d.find_element(By.ID, "dirty-link").get_attribute("href") or "")
            and "fbclid=" not in (d.find_element(By.ID, "dirty-link").get_attribute("href") or "")
            and "keep=1" in (d.find_element(By.ID, "dirty-link").get_attribute("href") or ""),
            "content-script link cleanup did not create current-tab Cleaned activity",
        )
        time.sleep(0.75)
        assert_standard_runtime(driver)
        site_handle = driver.current_window_handle

        popup_handle = open_popup_for_active_site(driver, site_handle)
        require(driver.find_element(By.ID, "protectionState").text == "On · Standard mode", "popup exposes local Standard protection state", driver.find_element(By.ID, "protectionState").text)
        require(current_profile(driver) == "standard", "popup initially selects Standard mode", current_profile(driver))
        blocked = int(driver.find_element(By.ID, "blocked").text or "0")
        cleaned = int(driver.find_element(By.ID, "cleaned").text or "0")
        require(blocked >= 1, "popup reports current-tab blocked activity", str(blocked))
        require(cleaned >= 1, "popup reports current-tab cleaned activity", str(cleaned))

        # The Activity Logger is intentionally background-memory-only and may have
        # ended before the popup opens even though current-tab counters survived in
        # storage.session. Create one fresh blocked request while this popup session
        # is open, then Refresh so Protection details can explain live activity
        # without pretending older logger rows are durable history.
        FixtureHandler.reset_hits()
        driver.switch_to.window(site_handle)
        driver.execute_script(
            """
            const script = document.createElement('script');
            script.id = 'detail-tracker-probe';
            script.src = arguments[0];
            document.body.appendChild(script);
            """,
            f"http://{TRACKER_HOST}:{FixtureHandler.port}/tracker.js?detail-probe=1",
        )
        time.sleep(0.35)
        require(not host_hits(TRACKER_HOST), "Protection-details probe tracker request is blocked")
        driver.switch_to.window(popup_handle)
        driver.find_element(By.ID, "refreshDetails").click()
        wait_for(driver, lambda d: "Tracker requests" in d.find_element(By.ID, "detailList").text, "Refresh did not expose fresh tracker reason in Protection details")
        require("Protection details refreshed." in driver.find_element(By.ID, "popupStatus").text, "Refresh reports completion")
        require(True, "Protection details refreshes without page reload")

        apply_profile(driver, site_handle, "strict")
        assert_strict_runtime(driver)
        open_popup_for_active_site(driver, site_handle)
        require(current_profile(driver) == "strict", "Strict profile persists through real site reload", current_profile(driver))
        require(driver.find_element(By.ID, "protectionState").text == "On · Strict mode", "popup exposes local Strict protection state", driver.find_element(By.ID, "protectionState").text)

        apply_profile(driver, site_handle, "compatible")
        assert_compatible_runtime(driver)
        open_popup_for_active_site(driver, site_handle)
        require(current_profile(driver) == "compatible", "Compatible profile persists through real site reload", current_profile(driver))
        require(driver.find_element(By.ID, "protectionState").text == "On · Compatible mode", "popup exposes local Compatible protection state", driver.find_element(By.ID, "protectionState").text)

        FixtureHandler.reset_hits()
        reset_button = driver.find_element(By.ID, "resetSite")
        require(not reset_button.get_attribute("disabled"), "Reset site is available for an active override")
        reset_button.click()
        time.sleep(0.35)
        close_popup_and_return(driver, site_handle)
        wait_for(driver, lambda d: d.execute_script("return document.readyState") == "complete", "site did not finish reload after Reset site")
        wait_for(driver, lambda d: d.find_elements(By.ID, "ready"), "site fixture missing after Reset site")
        time.sleep(0.75)
        assert_standard_runtime(driver)

        open_popup_for_active_site(driver, site_handle)
        require(current_profile(driver) == "standard", "Reset site returns popup to Standard mode", current_profile(driver))
        require(driver.find_element(By.ID, "protectionState").text == "On · Standard mode", "Reset site restores Standard protection state")
        close_popup_and_return(driver, site_handle)

        # History replacement produces a dirty current-page URL without starting a
        # new navigation, allowing the explicit popup cleaner to be exercised.
        driver.execute_script("history.replaceState(null, '', '/page?utm_source=copycheck&fbclid=copycheck&keep=yes');")
        wait_for(driver, lambda d: "utm_source=copycheck" in d.current_url, "history replacement did not expose dirty URL for Copy clean URL")
        open_popup_for_active_site(driver, site_handle)
        driver.find_element(By.ID, "copyCleanUrl").click()
        wait_for(driver, lambda d: "Clean URL copied." in d.find_element(By.ID, "popupStatus").text, "Copy clean URL did not complete in Firefox")
        require(True, "Copy clean URL executes through popup in real Firefox")

        snapshot_button = driver.find_element(By.ID, "copySupportSnapshot")
        require(not snapshot_button.get_attribute("disabled"), "Copy support snapshot is available on a web page")
        snapshot_button.click()
        wait_for(driver, lambda d: "Privacy-safe support snapshot copied." in d.find_element(By.ID, "popupStatus").text, "Copy support snapshot did not complete in Firefox")
        require(True, "privacy-safe support snapshot copies through popup in real Firefox")

        print("\nPrivacy Shield 0.2 popup quick-control runtime acceptance passed.")
        return 0
    finally:
        if driver is not None:
            driver.quit()
        server.shutdown()
        server.server_close()


if __name__ == "__main__":
    raise SystemExit(main())
