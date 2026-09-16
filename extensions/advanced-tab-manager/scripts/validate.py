#!/usr/bin/env python3
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
manifest = json.loads((ROOT / "manifest.json").read_text(encoding="utf-8"))

assert manifest["manifest_version"] == 3
assert manifest["name"] == "GoreeCloud Advanced Tab Manager"
assert manifest["version"] == "0.1.3"
assert manifest["browser_specific_settings"]["gecko"]["id"] == "advanced-tab-manager@goreecloud.com"
assert manifest["browser_specific_settings"]["gecko"]["strict_min_version"] == "139.0"
assert manifest["incognito"] == "not_allowed"
assert set(manifest["permissions"]) == {"sessions", "storage", "tabGroups", "tabs"}
assert not manifest.get("host_permissions"), "source candidate must not request host permissions"
assert "content_scripts" not in manifest, "source candidate must not inspect page content"
assert "unlimitedStorage" not in manifest["permissions"], "bounded saved state must not request unlimited storage"
assert manifest["background"].get("persistent") is False
assert manifest["background"].get("type") == "module"

required = [
    "README.md", "FEATURES.md", "FEATURE-ROADMAP.md", "SPECIFICATIONS.md", "ARCHITECTURE.md",
    "PRIVACY.md", "SECURITY.md", "CHANGELOG.md", "LICENSE",
    "src/background/background.js", "src/background/browser-state.js", "src/background/saved-state.js", "src/background/duplicate-cleanup.js",
    "src/core/state.js", "src/core/tree.js", "src/core/tree-session.js", "src/core/duplicates.js",
    "src/core/persistent-state.js", "src/core/tab-sets.js", "src/core/stash-transaction.js",
    "src/sidebar/sidebar.html", "src/sidebar/sidebar.js", "src/sidebar/open-tabs-view.js", "src/sidebar/saved-view.js", "src/sidebar/duplicates-view.js", "src/sidebar/ui.js", "src/sidebar/sidebar.css",
    "src/popup/popup.html", "src/popup/popup.js", "src/popup/popup.css",
    "tests/state.test.mjs", "tests/tree.test.mjs", "tests/tree-session.test.mjs",
    "tests/persistent-state.test.mjs", "tests/tab-sets.test.mjs", "tests/stash-transaction.test.mjs", "tests/background-storage.test.mjs",
    "tests/duplicates.test.mjs", "tests/duplicate-cleanup.test.mjs"
]
for relative in required:
    assert (ROOT / relative).is_file(), f"missing required source-candidate file: {relative}"

background = (ROOT / "src/background/background.js").read_text(encoding="utf-8")
browser_state = (ROOT / "src/background/browser-state.js").read_text(encoding="utf-8")
saved_state = (ROOT / "src/background/saved-state.js").read_text(encoding="utf-8")
duplicate_cleanup = (ROOT / "src/background/duplicate-cleanup.js").read_text(encoding="utf-8")
persistent = (ROOT / "src/core/persistent-state.js").read_text(encoding="utf-8")
tab_sets = (ROOT / "src/core/tab-sets.js").read_text(encoding="utf-8")
stash = (ROOT / "src/core/stash-transaction.js").read_text(encoding="utf-8")
duplicates = (ROOT / "src/core/duplicates.js").read_text(encoding="utf-8")
sidebar = (ROOT / "src/sidebar/sidebar.js").read_text(encoding="utf-8")
open_tabs_view = (ROOT / "src/sidebar/open-tabs-view.js").read_text(encoding="utf-8")
saved_view = (ROOT / "src/sidebar/saved-view.js").read_text(encoding="utf-8")
duplicates_view = (ROOT / "src/sidebar/duplicates-view.js").read_text(encoding="utf-8")

assert "createBrowserState" in background and "createSavedState" in background and "createDuplicateCleanup" in background
assert "treeParentLogicalId.v1" in browser_state
assert "persistVerifiedTabString" in browser_state
assert "browser.storage.local" in saved_state
assert "PERSISTENT_STATE_KEY" in persistent
assert "commitPersistentMutation" in persistent and "restorePersistentRecord" in persistent
assert "storage.set" in persistent and "storage.remove" in persistent
assert "isRestorableUrl" in persistent
assert "captureWindowAsTabSet" in tab_sets and "prepareStashedItem" in tab_sets
assert "persistThenClose" in stash and "createThenRemoveStored" in stash
assert "buildExactDuplicateReview" in duplicates and "planExactDuplicateCleanup" in duplicates
assert "exact-url" in duplicates and "tree-parent" in duplicates and "tree-child" in duplicates
assert "readLiveSnapshot" in duplicate_cleanup and "browser.tabs.remove" in duplicate_cleanup
assert "selected-keeper-not-in-current-set" in duplicates
assert "atm:save-focused-window-tab-set" in background
assert "atm:stash-tab" in background and "atm:restore-stashed-item" in background
assert "atm:restore-tab-set" in background
assert "atm:get-dashboard-state" in background and "atm:clear-saved-items" in background
assert "atm:cleanup-exact-duplicates" in background
sidebar_html = (ROOT / "src/sidebar/sidebar.html").read_text(encoding="utf-8")
assert "Saved items" in sidebar_html and "Duplicates" in sidebar_html
assert "renderOpenTabs" in sidebar and "renderSavedView" in sidebar and "renderDuplicateView" in sidebar
assert "cleanup-exact-duplicates" in sidebar and "window.confirm" in sidebar
assert "Stash tab locally and close it after persistence is verified" in open_tabs_view
assert "Delete all saved Tab Sets and stashed items" in saved_view
assert "Close eligible duplicates" in duplicates_view and "Never auto-closed" in duplicates_view
print("Validated Advanced Tab Manager 0.1.3 exact-duplicate review and guarded-cleanup source candidate.")
