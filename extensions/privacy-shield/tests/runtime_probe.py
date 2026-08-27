#!/usr/bin/env python3
"""Temporary diagnostics for the Privacy Shield Firefox runtime suite."""

from __future__ import annotations

import json
import sys
import threading
import time
from pathlib import Path

from selenium import webdriver
from selenium.webdriver.firefox.options import Options

from runtime_smoke import FixtureHandler


def main() -> int:
    xpi = Path(sys.argv[1]).resolve()
    server = __import__("http.server").server.ThreadingHTTPServer(("127.0.0.1", 0), FixtureHandler)
    FixtureHandler.port = server.server_address[1]
    threading.Thread(target=server.serve_forever, daemon=True).start()
    base = f"http://127.0.0.1:{FixtureHandler.port}"

    options = Options()
    options.add_argument("-headless")
    driver = webdriver.Firefox(options=options)
    try:
        addon_id = driver.install_addon(str(xpi), temporary=True)
        print("PROBE addon", addon_id)
        time.sleep(1)
        FixtureHandler.reset_hits()
        driver.get(f"{base}/test")
        time.sleep(3)
        state = driver.execute_script(
            """
            const dirty = document.getElementById('dirty');
            const redirect = document.getElementById('redirect');
            const ad = document.getElementById('adnode');
            return {
              currentUrl: location.href,
              dirty: dirty ? dirty.href : null,
              ping: dirty ? dirty.hasAttribute('ping') : null,
              redirect: redirect ? redirect.href : null,
              adDisplay: ad ? getComputedStyle(ad).display : null,
              cosmeticStyle: Boolean(document.getElementById('goreecloud-privacy-shield-cosmetic')),
              popupGuard: window.__goreecloudPrivacyShieldPopupGuard === true
            };
            """
        )
        print("PROBE state", json.dumps(state, sort_keys=True))

        interactions = driver.execute_script(
            """
            const dirty = document.getElementById('dirty');
            dirty.dispatchEvent(new PointerEvent('pointerdown', {bubbles: true, cancelable: true}));
            const afterPointer = dirty.href;

            const fresh = document.createElement('a');
            fresh.href = location.origin + '/copy?utm_source=clipboard&fbclid=copy&keep=clipboard';
            fresh.textContent = 'copy probe';
            document.body.appendChild(fresh);
            const data = new DataTransfer();
            const copyEvent = new ClipboardEvent('copy', {clipboardData: data, bubbles: true, cancelable: true});
            fresh.dispatchEvent(copyEvent);

            return {
              afterPointer,
              copied: data.getData('text/plain'),
              freshAfterCopy: fresh.href,
              copyPrevented: copyEvent.defaultPrevented
            };
            """
        )
        print("PROBE interactions", json.dumps(interactions, sort_keys=True))
        print("PROBE hits", json.dumps(FixtureHandler.hits, sort_keys=True))
        return 0
    finally:
        driver.quit()
        server.shutdown()
        server.server_close()


if __name__ == "__main__":
    raise SystemExit(main())
