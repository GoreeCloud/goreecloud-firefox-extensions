#!/usr/bin/env python3
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
manifest = json.loads((ROOT / "manifest.json").read_text(encoding="utf-8"))

assert manifest["manifest_version"] == 3
assert manifest["name"] == "GoreeCloud Advanced Tab Manager"
assert manifest["version"] == "0.1.0"
assert manifest["browser_specific_settings"]["gecko"]["id"] == "advanced-tab-manager@goreecloud.com"
assert manifest["browser_specific_settings"]["gecko"]["strict_min_version"] == "139.0"
assert manifest["incognito"] == "not_allowed"
assert set(manifest["permissions"]) == {"sessions", "tabGroups", "tabs"}
assert not manifest.get("host_permissions"), "foundation must not request host permissions"
assert "content_scripts" not in manifest, "foundation must not inspect page content"
assert manifest["background"].get("persistent") is False
assert manifest["background"].get("type") == "module"

required = [
    "README.md",
    "FEATURES.md",
    "FEATURE-ROADMAP.md",
    "SPECIFICATIONS.md",
    "ARCHITECTURE.md",
    "PRIVACY.md",
    "SECURITY.md",
    "CHANGELOG.md",
    "LICENSE",
    "src/background/background.js",
    "src/core/state.js",
    "src/sidebar/sidebar.html",
    "src/sidebar/sidebar.js",
    "src/sidebar/sidebar.css",
    "src/popup/popup.html",
    "src/popup/popup.js",
    "src/popup/popup.css",
    "tests/state.test.mjs",
]
for relative in required:
    assert (ROOT / relative).is_file(), f"missing required foundation file: {relative}"

print("Validated Advanced Tab Manager 0.1.0 source-candidate foundation.")
