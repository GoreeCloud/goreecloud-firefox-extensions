#!/usr/bin/env python3
"""Real-Firefox release smoke for GoreeCloud Advanced Tab Manager 0.1.11.

The test installs the deterministic unsigned candidate temporarily in a clean
headless Firefox profile, opens the extension's real Manager document, and
exercises release-critical browser/runtime paths through the installed
extension. It uses only controlled localhost pages and writes a privacy-safe
summary without browsing URLs, titles, rule contents, or profile paths.

This is unsigned runtime evidence. Mozilla-signed persistent-install and
full-process restart acceptance remain separate release gates.
"""

from __future__ import annotations

import json
import os
import re
import socket
import sys
import tempfile
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from selenium import webdriver
from selenium.webdriver.firefox.options import Options
from selenium.webdriver.firefox.service import Service
from selenium.webdriver.support.ui import WebDriverWait

EXPECTED_ADDON_ID = "advanced-tab-manager@goreecloud.com"
EXPECTED_VERSION = "0.1.11"
FIXED_EXTENSION_UUID = "4c974aa1-e177-4e73-a1e5-a0ee28ad4b61"


class FixtureHandler(BaseHTTPRequestHandler):
    def log_message(self, fmt: str, *args: object) -> None:
        return

    def do_GET(self) -> None:  # noqa: N802
        body = (
            "<!doctype html><html><head><meta charset='utf-8'>"
            f"<title>ATM fixture {self.path}</title></head>"
            f"<body><main><h1>Controlled Advanced Tab Manager fixture</h1><p>{self.path}</p></main></body></html>"
        ).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


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
    options.set_preference(
        "extensions.webextensions.uuids",
        json.dumps({EXPECTED_ADDON_ID: FIXED_EXTENSION_UUID}, separators=(",", ":")),
    )
    return options


def firefox_service() -> Service:
    return Service(service_args=["--allow-system-access"])


def extension_url(path: str) -> str:
    return f"moz-extension://{FIXED_EXTENSION_UUID}/{path.lstrip('/')}"


def wait_until(predicate, timeout: float, message: str) -> None:
    deadline = time.monotonic() + timeout
    last = ""
    while time.monotonic() < deadline:
        try:
            value = predicate()
            if value:
                return
            last = repr(value)
        except Exception as exc:
            last = f"{type(exc).__name__}: {exc}"
        time.sleep(0.1)
    raise AssertionError(f"FAIL {message}: {last}")


def navigate_extension(driver: webdriver.Firefox, path: str) -> None:
    target = extension_url(path)
    previous_handles = set(driver.window_handles)
    driver.set_context(driver.CONTEXT_CHROME)
    try:
        opened = driver.execute_script(
            """
            const target = arguments[0];
            if (!window.gBrowser) throw new Error('gBrowser unavailable');
            const tab = window.gBrowser.addTrustedTab(target);
            if (!tab) throw new Error('trusted tab creation failed');
            window.gBrowser.selectedTab = tab;
            return true;
            """,
            target,
        )
        require(opened is True, "trusted Manager tab created")
    finally:
        driver.set_context(driver.CONTEXT_CONTENT)

    wait_until(
        lambda: len(set(driver.window_handles) - previous_handles) == 1,
        15,
        f"WebDriver discovered extension document {path}",
    )
    new_handle = list(set(driver.window_handles) - previous_handles)[0]
    driver.switch_to.window(new_handle)
    wait_until(lambda: driver.current_url == target, 15, f"extension navigation completed for {path}")


def extension_message(driver: webdriver.Firefox, message: dict) -> object:
    result = driver.execute_async_script(
        """
        const message = arguments[0];
        const done = arguments[arguments.length - 1];
        browser.runtime.sendMessage(message).then(
          value => done({ok: true, value}),
          error => done({ok: false, error: String(error)})
        );
        """,
        message,
    )
    require(isinstance(result, dict) and result.get("ok") is True, "extension message completed", repr(result))
    return result.get("value")


def create_tab(driver: webdriver.Firefox, url: str, active: bool = False) -> int:
    result = driver.execute_async_script(
        """
        const [url, active] = arguments;
        const done = arguments[arguments.length - 1];
        browser.tabs.create({url, active}).then(
          tab => done({ok: true, id: tab.id}),
          error => done({ok: false, error: String(error)})
        );
        """,
        url,
        active,
    )
    require(result.get("ok") is True and isinstance(result.get("id"), int), "controlled Firefox tab created", repr(result))
    return int(result["id"])


def remove_windows(driver: webdriver.Firefox, window_ids: list[int]) -> None:
    result = driver.execute_async_script(
        """
        const ids = arguments[0];
        const done = arguments[arguments.length - 1];
        Promise.all(ids.map(id => browser.windows.remove(id).catch(() => null))).then(() => done(true));
        """,
        window_ids,
    )
    require(result is True, "created restore windows cleaned up")


def normal_window_ids(driver: webdriver.Firefox) -> list[int]:
    result = driver.execute_async_script(
        """
        const done = arguments[arguments.length - 1];
        browser.windows.getAll({windowTypes: ['normal']}).then(
          windows => done(windows.map(window => window.id)),
          error => done({error: String(error)})
        );
        """
    )
    require(isinstance(result, list), "normal Firefox windows enumerated", repr(result))
    return [int(value) for value in result]


def flatten(snapshot: dict) -> list[dict]:
    return [tab for window in snapshot.get("windows", []) for tab in window.get("tabs", [])]


def main() -> int:
    if len(sys.argv) != 2:
        raise SystemExit("usage: firefox_runtime_smoke.py /path/to/goreecloud-advanced-tab-manager.xpi")

    xpi = Path(sys.argv[1]).resolve()
    require(xpi.is_file(), "unsigned candidate XPI exists", str(xpi))

    passes: list[str] = []
    server = ThreadingHTTPServer(("127.0.0.1", 0), FixtureHandler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    base = f"http://127.0.0.1:{server.server_address[1]}"

    with tempfile.TemporaryDirectory(prefix="goreecloud-atm-runtime-") as tmp:
        profile = Path(tmp) / "profile"
        profile.mkdir()
        driver: webdriver.Firefox | None = None
        try:
            driver = webdriver.Firefox(options=firefox_options(profile), service=firefox_service())
            addon_id = driver.install_addon(str(xpi), temporary=True)
            require(addon_id == EXPECTED_ADDON_ID, "temporary candidate installation", str(addon_id))
            passes.append("temporary-install")

            navigate_extension(driver, "src/manager/manager.html")
            WebDriverWait(driver, 15).until(
                lambda d: d.find_element("id", "source-version").text.strip() == EXPECTED_VERSION
            )
            require(driver.find_element("id", "create-snapshot").is_enabled(), "Manager snapshot control is interactive")
            require(driver.find_element("id", "export-backup").is_enabled(), "Manager backup export control is interactive")
            passes.append("manager-render")

            manager = extension_message(driver, {"type": "atm:get-manager-state"})
            require(isinstance(manager, dict) and manager.get("ok") is True, "Manager background model available", repr(manager))
            require(manager["model"]["source"]["version"] == EXPECTED_VERSION, "Manager source version is exact candidate")
            require(manager["model"]["permissions"]["hosts"] == [], "Manager confirms no host permissions")
            passes.append("manager-model")

            parent_id = create_tab(driver, f"{base}/tree-parent")
            child_id = create_tab(driver, f"{base}/tree-child")
            tree = extension_message(driver, {"type": "atm:set-tree-parent", "tabId": child_id, "parentTabId": parent_id})
            require(isinstance(tree, dict) and tree.get("ok") is True, "tree relationship persisted", repr(tree))
            snapshot = extension_message(driver, {"type": "atm:get-snapshot"})
            by_id = {tab["id"]: tab for tab in flatten(snapshot)}
            require(bool(by_id[child_id].get("treeParentLogicalId")), "tree relationship reconstructs from live Firefox state")
            passes.append("tree")

            tab_set = extension_message(driver, {"type": "atm:save-focused-window-tab-set", "name": "Runtime acceptance"})
            require(isinstance(tab_set, dict) and tab_set.get("ok") is True and tab_set.get("itemCount", 0) >= 2,
                    "Tab Set capture persisted restorable tabs", repr(tab_set))
            passes.append("tab-set")

            stash_source = create_tab(driver, f"{base}/stash")
            stashed = extension_message(driver, {"type": "atm:stash-tab", "tabId": stash_source})
            require(isinstance(stashed, dict) and stashed.get("ok") is True, "stash persist-then-close completed", repr(stashed))
            restored_stash = extension_message(
                driver,
                {"type": "atm:restore-stashed-item", "stashedItemId": stashed["stashedItemId"]},
            )
            require(isinstance(restored_stash, dict) and restored_stash.get("ok") is True, "stashed tab restored", repr(restored_stash))
            passes.append("stash-restore")

            snooze_source = create_tab(driver, f"{base}/snooze")
            snoozed = extension_message(
                driver,
                {"type": "atm:snooze-tab", "tabId": snooze_source, "wakeAt": int(time.time() * 1000) + 600_000},
            )
            require(isinstance(snoozed, dict) and snoozed.get("ok") is True, "snooze persist/alarm/close completed", repr(snoozed))
            snooze_state = extension_message(driver, {"type": "atm:get-snooze-state"})
            require(snooze_state.get("ok") is True and len(snooze_state["state"]["items"]) >= 1, "snooze recovery state readable")
            restored_snooze = extension_message(
                driver,
                {"type": "atm:restore-snoozed-item", "snoozedItemId": snoozed["snoozedItemId"]},
            )
            require(restored_snooze.get("ok") is True, "snoozed tab restored", repr(restored_snooze))
            passes.append("snooze-restore")

            duplicate_url = f"{base}/duplicate"
            create_tab(driver, duplicate_url)
            create_tab(driver, duplicate_url)
            duplicate_snapshot = extension_message(driver, {"type": "atm:get-snapshot"})
            duplicates = [tab for tab in flatten(duplicate_snapshot) if tab.get("url") == duplicate_url]
            require(len(duplicates) == 2, "duplicate fixture contains two tabs", str(len(duplicates)))
            cleanup = extension_message(
                driver,
                {"type": "atm:cleanup-exact-duplicates", "url": duplicate_url, "keepTabId": duplicates[0]["id"]},
            )
            require(isinstance(cleanup, dict) and cleanup.get("ok") is True, "reviewed exact-URL duplicate cleanup completed", repr(cleanup))
            after_cleanup = extension_message(driver, {"type": "atm:get-snapshot"})
            require(sum(1 for tab in flatten(after_cleanup) if tab.get("url") == duplicate_url) == 1,
                    "duplicate cleanup retained exactly one controlled tab")
            passes.append("duplicate-cleanup")

            rule_state = extension_message(driver, {"type": "atm:get-rule-state"})
            require(rule_state.get("ok") is True and rule_state["state"].get("enabled") is False,
                    "rule engine remains fail-closed disabled by default")
            passes.append("rule-default")

            session = extension_message(driver, {"type": "atm:create-session-snapshot"})
            require(isinstance(session, dict) and session.get("ok") is True and session.get("tabCount", 0) >= 1,
                    "local session snapshot captured", repr(session))
            manager_after_snapshot = extension_message(driver, {"type": "atm:get-manager-state"})
            require(manager_after_snapshot["model"]["counts"]["sessionSnapshots"] >= 1,
                    "Manager reports retained snapshot count")
            require(all(set(item) == {"id", "createdAt", "windows", "tabs"} for item in manager_after_snapshot["model"]["snapshots"]["items"]),
                    "Manager exposes only privacy-minimized snapshot metadata")

            before_windows = set(normal_window_ids(driver))
            session_restore = extension_message(
                driver,
                {"type": "atm:restore-session-snapshot", "sessionSnapshotId": session["sessionSnapshotId"]},
            )
            require(session_restore.get("ok") is True and session_restore.get("restoredWindowCount", 0) >= 1,
                    "session snapshot restored additively", repr(session_restore))
            after_windows = set(normal_window_ids(driver))
            created_windows = sorted(after_windows - before_windows)
            require(len(created_windows) == session_restore["restoredWindowCount"],
                    "restore created only the reported new windows", repr(created_windows))
            remove_windows(driver, created_windows)
            passes.append("session-snapshot-restore")

            exported = extension_message(driver, {"type": "atm:export-backup"})
            require(exported.get("ok") is True and isinstance(exported.get("bundle"), dict),
                    "local backup export completed", repr(exported))
            preview = extension_message(driver, {"type": "atm:preview-import", "bundle": exported["bundle"]})
            require(preview.get("ok") is True and preview["preview"]["integrityVerified"] is True,
                    "backup preview revalidates exported integrity", repr(preview))
            require(preview["preview"]["importedCounts"]["sessionSnapshots"] >= 1,
                    "backup preview includes retained snapshot count")
            passes.append("backup-preview")

            source_revision = os.environ.get("ATM_SOURCE_REVISION", "")
            require(re.fullmatch(r"[0-9a-f]{40}", source_revision) is not None, "runtime evidence is bound to an exact source revision")
            report = {
                "schemaVersion": 1,
                "product": "GoreeCloud Advanced Tab Manager",
                "sourceVersion": EXPECTED_VERSION,
                "sourceRevision": source_revision,
                "firefoxVersion": str(driver.capabilities.get("browserVersion", "unknown")),
                "installation": "temporary-unsigned-runtime-smoke",
                "controlledLocalFixtureOnly": True,
                "passedChecks": passes,
                "signedPersistentRestartAccepted": False,
            }
            out = Path("dist/advanced-tab-manager-firefox-runtime.json")
            out.parent.mkdir(parents=True, exist_ok=True)
            out.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
            print(json.dumps(report, indent=2, sort_keys=True))
        finally:
            if driver is not None:
                driver.quit()
            server.shutdown()
            server.server_close()

    require(len(passes) == 11, "all release-critical unsigned runtime checks passed", str(passes))
    print("Advanced Tab Manager unsigned real-Firefox runtime acceptance passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
