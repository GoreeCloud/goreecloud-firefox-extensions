#!/usr/bin/env python3
"""Persistent Mozilla-signed install and full Firefox restart acceptance for Advanced Tab Manager."""

from __future__ import annotations

import json
import os
import re
import sys
import tempfile
import threading
import time
from http.server import ThreadingHTTPServer
from pathlib import Path

from selenium import webdriver
from selenium.webdriver.support.ui import WebDriverWait

from firefox_runtime_smoke import (
    EXPECTED_ADDON_ID,
    EXPECTED_VERSION,
    FixtureHandler,
    create_tab,
    extension_message,
    firefox_options,
    firefox_service,
    flatten,
    navigate_extension,
    normal_window_ids,
    remove_windows,
    require,
    wait_for_snapshot_url_count,
)


def read_json(path: Path, label: str) -> dict:
    require(path.is_file(), f"{label} exists", str(path))
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise AssertionError(f"FAIL {label} is readable JSON: {exc}") from exc
    require(isinstance(value, dict), f"{label} is an object")
    return value


def registered_addon(profile: Path) -> dict:
    registry = read_json(profile / "extensions.json", "Firefox extensions registry")
    matches = [item for item in registry.get("addons", []) if item.get("id") == EXPECTED_ADDON_ID]
    require(len(matches) == 1, "Advanced Tab Manager has one Firefox registry entry", str(len(matches)))
    return matches[0]


def assert_registered(profile: Path, phase: str) -> dict:
    addon = registered_addon(profile)
    require(addon.get("active") is True, f"{phase} extension active in Firefox registry")
    require(addon.get("type") == "extension", f"{phase} registry type", str(addon.get("type")))
    require(addon.get("version") == EXPECTED_VERSION, f"{phase} registry version", str(addon.get("version")))
    return addon


def persistent_extension_file(profile: Path, phase: str) -> Path:
    candidates = [
        profile / "extensions" / f"{EXPECTED_ADDON_ID}.xpi",
        profile / "extensions" / EXPECTED_ADDON_ID,
    ]
    existing = [path for path in candidates if path.exists()]
    require(bool(existing), f"{phase} persistent signed install exists", str(candidates))
    return existing[0]


def wait_manager_version(driver: webdriver.Firefox) -> None:
    navigate_extension(driver, "src/manager/manager.html")
    WebDriverWait(driver, 15).until(
        lambda d: d.find_element("id", "source-version").text.strip() == EXPECTED_VERSION
    )
    require(True, "Manager renders exact signed candidate version")


def exercise_post_restart(driver: webdriver.Firefox, base: str, checks: list[str]) -> None:
    manager = extension_message(driver, {"type": "atm:get-manager-state"})
    require(manager.get("ok") is True, "post-restart Manager model available", repr(manager))
    require(manager["model"]["source"]["version"] == EXPECTED_VERSION, "post-restart Manager source version")
    require(manager["model"]["permissions"]["hosts"] == [], "post-restart no host permissions")
    checks.append("manager-model")

    organizational = extension_message(driver, {"type": "atm:get-organizational-state"})
    require(organizational.get("ok") is True, "post-restart organizational state readable")
    require(len(organizational["state"]["tabSets"]) >= 1, "pre-restart Tab Set persisted across restart")
    require(len(organizational["state"]["sessionSnapshots"]) >= 1, "pre-restart session snapshot persisted across restart")
    checks.append("persistent-organizational-state")

    parent_id = create_tab(driver, f"{base}/signed-tree-parent")
    child_id = create_tab(driver, f"{base}/signed-tree-child")
    tree = extension_message(driver, {"type": "atm:set-tree-parent", "tabId": child_id, "parentTabId": parent_id})
    require(tree.get("ok") is True, "post-restart tree relationship persisted", repr(tree))
    snapshot = extension_message(driver, {"type": "atm:get-snapshot"})
    by_id = {tab["id"]: tab for tab in flatten(snapshot)}
    require(bool(by_id[child_id].get("treeParentLogicalId")), "post-restart tree relationship reconstructs")
    checks.append("tree")

    stash_source = create_tab(driver, f"{base}/signed-stash")
    stashed = extension_message(driver, {"type": "atm:stash-tab", "tabId": stash_source})
    require(stashed.get("ok") is True, "post-restart stash persist-then-close", repr(stashed))
    restored_stash = extension_message(
        driver,
        {"type": "atm:restore-stashed-item", "stashedItemId": stashed["stashedItemId"]},
    )
    require(restored_stash.get("ok") is True, "post-restart stash restore", repr(restored_stash))
    checks.append("stash-restore")

    snooze_source = create_tab(driver, f"{base}/signed-snooze")
    snoozed = extension_message(
        driver,
        {"type": "atm:snooze-tab", "tabId": snooze_source, "wakeAt": int(time.time() * 1000) + 600_000},
    )
    require(snoozed.get("ok") is True, "post-restart snooze persist/schedule/close", repr(snoozed))
    restored_snooze = extension_message(
        driver,
        {"type": "atm:restore-snoozed-item", "snoozedItemId": snoozed["snoozedItemId"]},
    )
    require(restored_snooze.get("ok") is True, "post-restart snooze restore", repr(restored_snooze))
    checks.append("snooze-restore")

    duplicate_url = f"{base}/signed-duplicate"
    create_tab(driver, duplicate_url)
    create_tab(driver, duplicate_url)
    duplicates = wait_for_snapshot_url_count(driver, duplicate_url, 2)
    require(len(duplicates) == 2, "post-restart duplicate fixture contains two tabs", str(len(duplicates)))
    cleanup = extension_message(
        driver,
        {"type": "atm:cleanup-exact-duplicates", "url": duplicate_url, "keepTabId": duplicates[0]["id"]},
    )
    require(cleanup.get("ok") is True, "post-restart duplicate cleanup", repr(cleanup))
    after_cleanup = extension_message(driver, {"type": "atm:get-snapshot"})
    require(sum(1 for tab in flatten(after_cleanup) if tab.get("url") == duplicate_url) == 1,
            "post-restart duplicate cleanup retained one tab")
    checks.append("duplicate-cleanup")

    rules = extension_message(driver, {"type": "atm:get-rule-state"})
    require(rules.get("ok") is True and rules["state"].get("enabled") is False,
            "post-restart rule engine remains fail-closed")
    checks.append("rule-default")

    session = extension_message(driver, {"type": "atm:create-session-snapshot"})
    require(session.get("ok") is True and session.get("tabCount", 0) >= 1,
            "post-restart session snapshot capture", repr(session))
    before_windows = set(normal_window_ids(driver))
    restored = extension_message(
        driver,
        {"type": "atm:restore-session-snapshot", "sessionSnapshotId": session["sessionSnapshotId"]},
    )
    require(restored.get("ok") is True and restored.get("restoredWindowCount", 0) >= 1,
            "post-restart session snapshot additive restore", repr(restored))
    after_windows = set(normal_window_ids(driver))
    created_windows = sorted(after_windows - before_windows)
    require(len(created_windows) == restored["restoredWindowCount"],
            "post-restart session restore created only reported windows", repr(created_windows))
    remove_windows(driver, created_windows)
    checks.append("session-snapshot-restore")

    exported = extension_message(driver, {"type": "atm:export-backup"})
    require(exported.get("ok") is True and isinstance(exported.get("bundle"), dict),
            "post-restart backup export", repr(exported))
    preview = extension_message(driver, {"type": "atm:preview-import", "bundle": exported["bundle"]})
    require(preview.get("ok") is True and preview["preview"]["integrityVerified"] is True,
            "post-restart backup integrity preview", repr(preview))
    checks.append("backup-preview")


def main() -> int:
    if len(sys.argv) != 2:
        raise SystemExit("usage: signed_restart_smoke.py /path/to/mozilla-signed-advanced-tab-manager.xpi")

    xpi = Path(sys.argv[1]).resolve()
    require(xpi.is_file(), "Mozilla-signed XPI exists", str(xpi))
    source_revision = os.environ.get("ATM_SOURCE_REVISION", "")
    require(re.fullmatch(r"[0-9a-f]{40}", source_revision) is not None, "signed evidence is bound to exact source revision")

    server = ThreadingHTTPServer(("127.0.0.1", 0), FixtureHandler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    base = f"http://127.0.0.1:{server.server_address[1]}"

    checks: list[str] = []
    with tempfile.TemporaryDirectory(prefix="goreecloud-atm-signed-") as tmp:
        profile = Path(tmp) / "profile"
        profile.mkdir()
        first: webdriver.Firefox | None = None
        second: webdriver.Firefox | None = None
        try:
            first = webdriver.Firefox(options=firefox_options(profile), service=firefox_service())
            addon_id = first.install_addon(str(xpi), temporary=False)
            require(addon_id == EXPECTED_ADDON_ID, "persistent Mozilla-signed installation", str(addon_id))
            checks.append("persistent-install")

            wait_manager_version(first)
            pre_tab = create_tab(first, f"{base}/before-restart", active=False)
            tab_set = extension_message(first, {"type": "atm:save-focused-window-tab-set", "name": "Signed restart acceptance"})
            require(tab_set.get("ok") is True and tab_set.get("itemCount", 0) >= 1,
                    "pre-restart Tab Set capture", repr(tab_set))
            session = extension_message(first, {"type": "atm:create-session-snapshot"})
            require(session.get("ok") is True and session.get("tabCount", 0) >= 1,
                    "pre-restart session snapshot capture", repr(session))
            require(isinstance(pre_tab, int), "pre-restart controlled tab exists")
            time.sleep(2.0)
            first.quit()
            first = None

            pre_addon = assert_registered(profile, "pre-restart")
            pre_path = persistent_extension_file(profile, "pre-restart")
            checks.append("pre-restart-persistence")

            time.sleep(1.0)
            second = webdriver.Firefox(options=firefox_options(profile), service=firefox_service())
            firefox_version = str(second.capabilities.get("browserVersion", "unknown"))
            wait_manager_version(second)
            exercise_post_restart(second, base, checks)
            time.sleep(1.0)
            second.quit()
            second = None

            post_addon = assert_registered(profile, "post-restart")
            post_path = persistent_extension_file(profile, "post-restart")
            require(pre_path == post_path, "persistent signed install path survives restart")
            require(
                str(pre_addon.get("path") or pre_addon.get("rootURI"))
                == str(post_addon.get("path") or post_addon.get("rootURI")),
                "Firefox registry installation location survives restart",
            )
            checks.append("post-restart-registration")

            report = {
                "schemaVersion": 1,
                "product": "GoreeCloud Advanced Tab Manager",
                "version": EXPECTED_VERSION,
                "sourceRevision": source_revision,
                "firefoxVersion": firefox_version,
                "mozillaSigned": True,
                "persistentInstallRestartAccepted": True,
                "controlledLocalFixtureOnly": True,
                "passedChecks": checks,
            }
            out = Path("dist/advanced-tab-manager-signed-restart.json")
            out.parent.mkdir(parents=True, exist_ok=True)
            out.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
            print(json.dumps(report, indent=2, sort_keys=True))
        finally:
            if first is not None:
                first.quit()
            if second is not None:
                second.quit()
            server.shutdown()
            server.server_close()

    require(len(checks) >= 10, "signed restart acceptance completed all required checks", str(checks))
    print("Advanced Tab Manager Mozilla-signed persistent-install/full-restart acceptance passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
