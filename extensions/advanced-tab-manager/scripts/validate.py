#!/usr/bin/env python3
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
manifest = json.loads((ROOT / "manifest.json").read_text(encoding="utf-8"))

assert manifest["manifest_version"] == 3
assert manifest["name"] == "GoreeCloud Advanced Tab Manager"
assert manifest["version"] == "0.1.11"
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
    "GLAZE-UI-1.5.1-ADOPTION.md", "STABLE-SECURITY-REVIEW-0.1.11.md", "RELEASE-ACCEPTANCE-0.1.11.md",
    "src/background/background.js", "src/background/browser-state.js", "src/background/saved-state.js", "src/background/duplicate-cleanup.js", "src/background/snooze.js", "src/background/rules.js", "src/background/manager.js", "src/background/portability.js",
    "src/core/state.js", "src/core/tree.js", "src/core/tree-session.js", "src/core/duplicates.js",
    "src/core/persistent-state.js", "src/core/tab-sets.js", "src/core/stash-transaction.js",
    "src/core/snooze-store.js", "src/core/snooze.js", "src/core/snooze-transaction.js",
    "src/core/rule-state.js", "src/core/rules.js", "src/core/commands.js", "src/core/manager-model.js", "src/core/portability.js", "src/core/session-snapshots.js",
    "src/sidebar/sidebar.html", "src/sidebar/sidebar.js", "src/sidebar/open-tabs-view.js", "src/sidebar/saved-view.js", "src/sidebar/duplicates-view.js", "src/sidebar/snoozed-view.js", "src/sidebar/rules-view.js", "src/sidebar/command-palette.js", "src/sidebar/command-palette.css", "src/sidebar/manager-link.js", "src/sidebar/rules.css", "src/sidebar/ui.js", "src/sidebar/sidebar.css",
    "src/popup/popup.html", "src/popup/popup.js", "src/popup/popup.css",
    "src/manager/manager.html", "src/manager/manager.js", "src/manager/manager.css",
    "tests/state.test.mjs", "tests/tree.test.mjs", "tests/tree-session.test.mjs",
    "tests/persistent-state.test.mjs", "tests/tab-sets.test.mjs", "tests/stash-transaction.test.mjs", "tests/background-storage.test.mjs",
    "tests/duplicates.test.mjs", "tests/duplicate-cleanup.test.mjs",
    "tests/snooze-store.test.mjs", "tests/snooze.test.mjs", "tests/snooze-transaction.test.mjs", "tests/background-snooze.test.mjs",
    "tests/rule-state.test.mjs", "tests/rules.test.mjs", "tests/background-rules.test.mjs", "tests/commands.test.mjs",
    "tests/manager-model.test.mjs", "tests/background-manager.test.mjs", "tests/portability.test.mjs", "tests/background-portability.test.mjs",
    "tests/session-snapshots.test.mjs", "tests/background-session-snapshots.test.mjs",
    "tests/firefox_runtime_smoke.py", "RELEASE-ACCEPTANCE-0.1.10.md",
    "scripts/large-session-qualification.mjs", "scripts/stable_security_review.py", "scripts/glaze_consumer_qualification.py"
]
for relative in required:
    assert (ROOT / relative).is_file(), f"missing required source-candidate file: {relative}"

background = (ROOT / "src/background/background.js").read_text(encoding="utf-8")
manager_background = (ROOT / "src/background/manager.js").read_text(encoding="utf-8")
manager_model = (ROOT / "src/core/manager-model.js").read_text(encoding="utf-8")
manager_page = (ROOT / "src/manager/manager.js").read_text(encoding="utf-8")
manager_html = (ROOT / "src/manager/manager.html").read_text(encoding="utf-8")
manager_css = (ROOT / "src/manager/manager.css").read_text(encoding="utf-8")
portability_core = (ROOT / "src/core/portability.js").read_text(encoding="utf-8")
portability_background = (ROOT / "src/background/portability.js").read_text(encoding="utf-8")
session_snapshots = (ROOT / "src/core/session-snapshots.js").read_text(encoding="utf-8")
large_session_qualification = (ROOT / "scripts/large-session-qualification.mjs").read_text(encoding="utf-8")
runtime_smoke = (ROOT / "tests/firefox_runtime_smoke.py").read_text(encoding="utf-8")
release_acceptance = (ROOT / "RELEASE-ACCEPTANCE-0.1.10.md").read_text(encoding="utf-8")
REPOSITORY_ROOT = ROOT.parents[1]
runtime_workflow = (REPOSITORY_ROOT / ".github/workflows/advanced-tab-manager-firefox-runtime.yml").read_text(encoding="utf-8")
rule_background = (ROOT / "src/background/rules.js").read_text(encoding="utf-8")
rule_state = (ROOT / "src/core/rule-state.js").read_text(encoding="utf-8")
rules_core = (ROOT / "src/core/rules.js").read_text(encoding="utf-8")
rules_view = (ROOT / "src/sidebar/rules-view.js").read_text(encoding="utf-8")
sidebar = (ROOT / "src/sidebar/sidebar.js").read_text(encoding="utf-8")
commands_core = (ROOT / "src/core/commands.js").read_text(encoding="utf-8")
palette = (ROOT / "src/sidebar/command-palette.js").read_text(encoding="utf-8")
palette_css = (ROOT / "src/sidebar/command-palette.css").read_text(encoding="utf-8")
sidebar_html = (ROOT / "src/sidebar/sidebar.html").read_text(encoding="utf-8")
manager_link = (ROOT / "src/sidebar/manager-link.js").read_text(encoding="utf-8")
popup_html = (ROOT / "src/popup/popup.html").read_text(encoding="utf-8")
popup_js = (ROOT / "src/popup/popup.js").read_text(encoding="utf-8")

assert "createRuleManager" in background
assert "atm:get-rule-state" in background and "atm:set-rule-engine-enabled" in background
assert "atm:upsert-rule" in background and "atm:delete-rule" in background and "atm:preview-rule-evaluation" in background
assert "atm:apply-rule-actions" in background, "explicit rule application route is required"
assert "RULE_STATE_KEY" in rule_state and "commitRuleStateMutation" in rule_state and "restoreRuleStateRecord" in rule_state
assert "goreecloud.advancedTabManager.ruleState.v1" in rule_state
assert "RULE_ACTION_TYPES" in rule_state
assert "enabled: false" in rule_state, "rule engine must fail closed by default"
assert "evaluateRules" in rules_core and "explanation" in rules_core
assert "planRuleActions" in rules_core and "equal-priority-action-conflict" in rules_core
assert "hostname" in rules_core and "nativeGroupTitle" in rules_core and "treeChild" in rules_core
assert "!tab.incognito" in rules_core, "private tabs must be excluded"
assert "previewOnly: true" in rule_background
assert "browser-state-changed" in rule_background, "live-state drift must fail closed"
assert rule_background.count("readLiveSnapshot()") >= 3, "preview and apply paths must read fresh Firefox state"
assert "browser.tabs.update" in rule_background and "browser.tabs.discard" in rule_background
assert "browser.tabs.remove" not in rule_background, "rule actions must not close tabs"
assert "tabs.create" not in rule_background and "url:" not in rule_background, "rule actions must not navigate or create tabs"
assert "rule-create-form" in rules_view and "apply-rule-actions" in rules_view
assert "atm:apply-rule-actions" in sidebar

assert "COMMANDS" in commands_core and "searchCommands" in commands_core and "commandById" in commands_core
for command_id in ("view-tree", "view-groups", "view-duplicates", "view-saved", "view-snoozed", "view-rules", "open-manager", "focus-search", "refresh-state", "save-window"):
    assert f'id: "{command_id}"' in commands_core, f"missing bounded command: {command_id}"
assert "browser." not in commands_core, "command catalog must remain browser-API independent"
assert "browser." not in palette, "command palette must route through established sidebar controls rather than direct browser APIs"
assert "Control+K Meta+K" in palette and "aria-modal" in palette and "role=\"listbox\"" in palette
assert 'href="command-palette.css"' in sidebar_html and 'src="command-palette.js"' in sidebar_html
assert 'id="open-manager"' in sidebar_html and 'src="manager-link.js"' in sidebar_html
assert "prefers-reduced-transparency" in palette_css and "forced-colors" in palette_css

assert "createManagerState" in background and 'atm:get-manager-state' in background
assert "buildManagerModel" in manager_background and "buildManagerModel" in manager_model
assert "tab.title" not in manager_model and "tab.url" not in manager_model, "manager model must not serialize live browsing content"
assert "atm:get-manager-state" in manager_page
assert "browser.runtime.sendMessage" in manager_page
assert "browser.tabs.remove" not in manager_page and "browser.tabs.update" not in manager_page and "browser.tabs.discard" not in manager_page
assert "Local backup and portability" in manager_html and 'id="export-backup"' in manager_html and 'id="import-file"' in manager_html
assert 'id="apply-import"' in manager_html and 'id="clear-import"' in manager_html
assert "prefers-reduced-transparency" in manager_css and "forced-colors" in manager_css
assert "browser.tabs.create" in manager_link and "src/manager/manager.html" in manager_link
assert 'id="open-manager"' in popup_html and "0.1.11 · retained session snapshots" in popup_html
assert "source candidate" not in popup_html.lower(), "packaged popup must be lifecycle-neutral for release signing"
assert "development source only" not in manager_html.lower(), "packaged Manager must be lifecycle-neutral for release signing"
assert "Stable status" not in manager_html, "packaged Manager must not hard-code Stable lifecycle truth"
assert "src/manager/manager.html" in popup_js

assert "captureSessionSnapshot" in session_snapshots and "trimSessionSnapshots" in session_snapshots
assert "DEFAULT_SNAPSHOT_RETENTION" in (ROOT / "src/core/persistent-state.js").read_text(encoding="utf-8")
for route in ("atm:create-session-snapshot", "atm:restore-session-snapshot", "atm:delete-session-snapshot", "atm:set-snapshot-retention"):
    assert route in background, f"missing session snapshot route: {route}"
for control_id in ("create-snapshot", "snapshot-retention", "save-retention", "snapshot-list"):
    assert f'id="{control_id}"' in manager_html, f"missing Manager snapshot control: {control_id}"
assert "sessionSnapshots" in manager_model and "snapshotRetention" in manager_model
assert "snapshot.test" not in manager_model, "manager model must not encode fixture browsing content"
assert "SIZES = [100, 500, 1000]" in large_session_qualification
assert "representative Firefox rendered/runtime performance remains separate" in large_session_qualification

assert 'EXPECTED_ADDON_ID = "advanced-tab-manager@goreecloud.com"' in runtime_smoke
assert 'EXPECTED_VERSION = "0.1.11"' in runtime_smoke
assert "gBrowser.addTrustedTab" in runtime_smoke and "--allow-system-access" in runtime_smoke
assert "temporary=True" in runtime_smoke, "unsigned runtime gate must not masquerade as persistent signed acceptance"
for route in (
    "atm:get-manager-state", "atm:set-tree-parent", "atm:save-focused-window-tab-set",
    "atm:stash-tab", "atm:snooze-tab", "atm:cleanup-exact-duplicates",
    "atm:get-rule-state", "atm:create-session-snapshot", "atm:restore-session-snapshot",
    "atm:export-backup", "atm:preview-import"
):
    assert route in runtime_smoke, f"runtime smoke is missing release-critical route: {route}"
assert '"signedPersistentRestartAccepted": False' in runtime_smoke
assert "controlledLocalFixtureOnly" in runtime_smoke
assert "browser-actions/setup-firefox@v1" in runtime_workflow
assert "browser-actions/setup-geckodriver@latest" in runtime_workflow
assert "firefox_runtime_smoke.py" in runtime_workflow
assert "advanced-tab-manager-firefox-runtime.json" in runtime_workflow
assert "Mozilla-signed persistent-install and full-process restart acceptance remain separate" in release_acceptance

assert "createPortabilityManager" in background
assert "atm:export-backup" in background and "atm:preview-import" in background and "atm:apply-import" in background
assert "PORTABILITY_FORMAT" in portability_core and "PORTABILITY_SCHEMA_VERSION" in portability_core and "PORTABILITY_MAX_BYTES" in portability_core
assert "SHA-256" in portability_core and "backup-integrity-mismatch" in portability_core and "backup-too-large" in portability_core
assert "validatePersistentState" in portability_background and "validateSnoozeState" in portability_background and "validateRuleState" in portability_background
assert "state-changed-since-preview" in portability_background and "import-verification-failed" in portability_background
assert "browser.tabs.create" not in portability_background and "browser.tabs.remove" not in portability_background
assert "browser.tabs.update" not in portability_background and "browser.tabs.discard" not in portability_background
assert "MAX_IMPORT_BYTES = 16 * 1024 * 1024" in manager_page
assert "atm:export-backup" in manager_page and "atm:preview-import" in manager_page and "atm:apply-import" in manager_page
assert "new Blob" in manager_page and "JSON.parse" in manager_page and "window.confirm" in manager_page
assert "file.size > MAX_IMPORT_BYTES" in manager_page
assert "sessionSnapshots" in portability_core, "portable organizational state must include snapshot preview accounting"
assert "prefers-reduced-transparency" in manager_css and "forced-colors" in manager_css
glaze_adoption = (ROOT / "GLAZE-UI-1.5.1-ADOPTION.md").read_text(encoding="utf-8")
security_review = (ROOT / "STABLE-SECURITY-REVIEW-0.1.11.md").read_text(encoding="utf-8")
release_acceptance_011 = (ROOT / "RELEASE-ACCEPTANCE-0.1.11.md").read_text(encoding="utf-8")
security_script = (ROOT / "scripts/stable_security_review.py").read_text(encoding="utf-8")
glaze_script = (ROOT / "scripts/glaze_consumer_qualification.py").read_text(encoding="utf-8")
release_workflow = (REPOSITORY_ROOT / ".github/workflows/advanced-tab-manager-release-qualification.yml").read_text(encoding="utf-8")
assert "GLAZE UI V1.5 / machine version 1.5.1 Stable" in glaze_adoption
assert "af0d0d3e85aaf46e83a2baa64aab914fd96a7e98" in glaze_adoption
assert "Security exceptions:** None" in security_review
assert "full Git history" in security_review
assert "0.1.11" in release_acceptance_011 and "metadata-only Stable promotion" in release_acceptance_011
assert "git log" in security_script and "--full-history" in security_script
assert "EXPECTED_VERSION = \"0.1.11\"" in security_script
assert "GLAZE_AUTHORITY_REVISION = \"af0d0d3e85aaf46e83a2baa64aab914fd96a7e98\"" in glaze_script
assert "sharedPerformanceAcceptanceInherited" in glaze_script and "False" in glaze_script
assert "fetch-depth: 0" in release_workflow
assert "stable_security_review.py" in release_workflow and "glaze_consumer_qualification.py" in release_workflow
assert "cmp \"$A\" \"$B\"" in release_workflow
print("Validated Advanced Tab Manager 0.1.11 release-candidate source and qualification contracts.")
