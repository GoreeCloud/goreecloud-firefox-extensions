#!/usr/bin/env python3
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
manifest = json.loads((ROOT / "manifest.json").read_text(encoding="utf-8"))

assert manifest["manifest_version"] == 3
assert manifest["name"] == "GoreeCloud Advanced Tab Manager"
assert manifest["version"] == "0.1.4"
assert manifest["browser_specific_settings"]["gecko"]["id"] == "advanced-tab-manager@goreecloud.com"
assert manifest["browser_specific_settings"]["gecko"]["strict_min_version"] == "139.0"
assert manifest["incognito"] == "not_allowed"
assert set(manifest["permissions"]) == {"alarms", "sessions", "storage", "tabGroups", "tabs"}
assert not manifest.get("host_permissions"), "source candidate must not request host permissions"
assert "content_scripts" not in manifest, "source candidate must not inspect page content"
assert "unlimitedStorage" not in manifest["permissions"], "bounded saved state must not request unlimited storage"
assert manifest["background"].get("persistent") is False
assert manifest["background"].get("type") == "module"

required = [
    "README.md", "FEATURES.md", "FEATURE-ROADMAP.md", "SPECIFICATIONS.md", "ARCHITECTURE.md",
    "PRIVACY.md", "SECURITY.md", "CHANGELOG.md", "LICENSE",
    "src/background/background.js", "src/background/browser-state.js", "src/background/saved-state.js", "src/background/duplicate-cleanup.js", "src/background/snooze.js",
    "src/core/state.js", "src/core/tree.js", "src/core/tree-session.js", "src/core/duplicates.js",
    "src/core/persistent-state.js", "src/core/tab-sets.js", "src/core/stash-transaction.js",
    "src/core/snooze-store.js", "src/core/snooze.js", "src/core/snooze-transaction.js",
    "src/sidebar/sidebar.html", "src/sidebar/sidebar.js", "src/sidebar/open-tabs-view.js", "src/sidebar/saved-view.js", "src/sidebar/duplicates-view.js", "src/sidebar/snoozed-view.js", "src/sidebar/ui.js", "src/sidebar/sidebar.css",
    "src/popup/popup.html", "src/popup/popup.js", "src/popup/popup.css",
    "tests/state.test.mjs", "tests/tree.test.mjs", "tests/tree-session.test.mjs",
    "tests/persistent-state.test.mjs", "tests/tab-sets.test.mjs", "tests/stash-transaction.test.mjs", "tests/background-storage.test.mjs",
    "tests/duplicates.test.mjs", "tests/duplicate-cleanup.test.mjs",
    "tests/snooze-store.test.mjs", "tests/snooze.test.mjs", "tests/snooze-transaction.test.mjs", "tests/background-snooze.test.mjs"
]
for relative in required:
    assert (ROOT / relative).is_file(), f"missing required source-candidate file: {relative}"

background = (ROOT / "src/background/background.js").read_text(encoding="utf-8")
snooze_background = (ROOT / "src/background/snooze.js").read_text(encoding="utf-8")
snooze_store = (ROOT / "src/core/snooze-store.js").read_text(encoding="utf-8")
snooze_core = (ROOT / "src/core/snooze.js").read_text(encoding="utf-8")
snooze_tx = (ROOT / "src/core/snooze-transaction.js").read_text(encoding="utf-8")
sidebar = (ROOT / "src/sidebar/sidebar.js").read_text(encoding="utf-8")
open_tabs = (ROOT / "src/sidebar/open-tabs-view.js").read_text(encoding="utf-8")
snoozed_view = (ROOT / "src/sidebar/snoozed-view.js").read_text(encoding="utf-8")
sidebar_html = (ROOT / "src/sidebar/sidebar.html").read_text(encoding="utf-8")
popup = (ROOT / "src/popup/popup.js").read_text(encoding="utf-8")

assert "createSnoozeManager" in background
assert "browser.alarms.onAlarm" in background and "reconcileSnoozeAlarms" in background
assert "atm:snooze-tab" in background and "atm:restore-snoozed-item" in background and "atm:reschedule-snoozed-item" in background
assert "SNOOZE_STATE_KEY" in snooze_store and "commitSnoozeMutation" in snooze_store and "restoreSnoozeRecord" in snooze_store
assert "goreecloud.advancedTabManager.snoozeState.v1" in snooze_store
assert "SNOOZE_ALARM_PREFIX" in snooze_core and "nextSnoozeAlarmTime" in snooze_core
assert "persistScheduleThenClose" in snooze_tx and "verifySchedule" in snooze_tx and "rollbackPersist" in snooze_tx
assert "browser.alarms.getAll" in snooze_background and "SNOOZE_RETRY_DELAY_MS" in snooze_background
assert "createThenRemoveStored" in snooze_background and "rescheduleSnoozedItem" in snooze_background
assert "Snooze tab for 1 hour" in open_tabs
assert "Snoozed" in sidebar_html and "renderSnoozedView" in sidebar
assert "restore-snoozed-item" in sidebar and "reschedule-snoozed-item" in sidebar
assert "Overdue" in snoozed_view and "Delay" in snoozed_view
assert "snoozed" in popup
print("Validated Advanced Tab Manager 0.1.4 restart-safe snoozing source candidate.")
