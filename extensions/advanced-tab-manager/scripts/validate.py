#!/usr/bin/env python3
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
manifest = json.loads((ROOT / "manifest.json").read_text(encoding="utf-8"))

assert manifest["manifest_version"] == 3
assert manifest["name"] == "GoreeCloud Advanced Tab Manager"
assert manifest["version"] == "0.1.7"
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
    "src/background/background.js", "src/background/browser-state.js", "src/background/saved-state.js", "src/background/duplicate-cleanup.js", "src/background/snooze.js", "src/background/rules.js",
    "src/core/state.js", "src/core/tree.js", "src/core/tree-session.js", "src/core/duplicates.js",
    "src/core/persistent-state.js", "src/core/tab-sets.js", "src/core/stash-transaction.js",
    "src/core/snooze-store.js", "src/core/snooze.js", "src/core/snooze-transaction.js",
    "src/core/rule-state.js", "src/core/rules.js", "src/core/commands.js",
    "src/sidebar/sidebar.html", "src/sidebar/sidebar.js", "src/sidebar/open-tabs-view.js", "src/sidebar/saved-view.js", "src/sidebar/duplicates-view.js", "src/sidebar/snoozed-view.js", "src/sidebar/rules-view.js", "src/sidebar/command-palette.js", "src/sidebar/command-palette.css", "src/sidebar/rules.css", "src/sidebar/ui.js", "src/sidebar/sidebar.css",
    "src/popup/popup.html", "src/popup/popup.js", "src/popup/popup.css",
    "tests/state.test.mjs", "tests/tree.test.mjs", "tests/tree-session.test.mjs",
    "tests/persistent-state.test.mjs", "tests/tab-sets.test.mjs", "tests/stash-transaction.test.mjs", "tests/background-storage.test.mjs",
    "tests/duplicates.test.mjs", "tests/duplicate-cleanup.test.mjs",
    "tests/snooze-store.test.mjs", "tests/snooze.test.mjs", "tests/snooze-transaction.test.mjs", "tests/background-snooze.test.mjs",
    "tests/rule-state.test.mjs", "tests/rules.test.mjs", "tests/background-rules.test.mjs", "tests/commands.test.mjs"
]
for relative in required:
    assert (ROOT / relative).is_file(), f"missing required source-candidate file: {relative}"

background = (ROOT / "src/background/background.js").read_text(encoding="utf-8")
rule_background = (ROOT / "src/background/rules.js").read_text(encoding="utf-8")
rule_state = (ROOT / "src/core/rule-state.js").read_text(encoding="utf-8")
rules_core = (ROOT / "src/core/rules.js").read_text(encoding="utf-8")
rules_view = (ROOT / "src/sidebar/rules-view.js").read_text(encoding="utf-8")
sidebar = (ROOT / "src/sidebar/sidebar.js").read_text(encoding="utf-8")
commands_core = (ROOT / "src/core/commands.js").read_text(encoding="utf-8")
palette = (ROOT / "src/sidebar/command-palette.js").read_text(encoding="utf-8")
palette_css = (ROOT / "src/sidebar/command-palette.css").read_text(encoding="utf-8")
sidebar_html = (ROOT / "src/sidebar/sidebar.html").read_text(encoding="utf-8")

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
assert "browser.tabs.remove" not in rule_background, "ATM-008A rule actions must not close tabs"
assert "tabs.create" not in rule_background and "url:" not in rule_background, "ATM-008A rule actions must not navigate or create tabs"
assert "rule-create-form" in rules_view and "apply-rule-actions" in rules_view
assert "atm:apply-rule-actions" in sidebar

assert "COMMANDS" in commands_core and "searchCommands" in commands_core and "commandById" in commands_core
for command_id in ("view-tree", "view-groups", "view-duplicates", "view-saved", "view-snoozed", "view-rules", "focus-search", "refresh-state", "save-window"):
    assert f'id: "{command_id}"' in commands_core, f"missing bounded command: {command_id}"
assert "browser." not in commands_core, "command catalog must remain browser-API independent"
assert "browser." not in palette, "command palette must route through established sidebar controls rather than direct browser APIs"
assert "Control+K Meta+K" in palette and "aria-modal" in palette and "role=\"listbox\"" in palette
assert 'href="command-palette.css"' in sidebar_html and 'src="command-palette.js"' in sidebar_html
assert "prefers-reduced-transparency" in palette_css and "forced-colors" in palette_css
print("Validated Advanced Tab Manager 0.1.7 bounded command-palette source candidate.")
