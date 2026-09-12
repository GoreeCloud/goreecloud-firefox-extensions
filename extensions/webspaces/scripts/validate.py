#!/usr/bin/env python3
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def fail(message: str) -> None:
    raise SystemExit(f"ERROR: {message}")

def main() -> None:
    manifest = json.loads((ROOT / "manifest.json").read_text(encoding="utf-8"))
    if manifest.get("manifest_version") != 3:
        fail("Manifest V3 is required")
    if manifest.get("name") != "GoreeCloud Webspaces":
        fail("unexpected extension name")
    if manifest.get("version") != "0.1.2":
        fail("source version must remain synchronized with canonical inventory")
    gecko_id = manifest.get("browser_specific_settings", {}).get("gecko", {}).get("id")
    if gecko_id != "webspaces@goreecloud.com":
        fail("unexpected Firefox add-on ID")

    required_permissions = {"activeTab", "contextualIdentities", "cookies", "storage", "webNavigation"}
    permissions = set(manifest.get("permissions", []))
    if permissions != required_permissions:
        fail(f"unexpected permission set: {sorted(permissions)}")
    if manifest.get("host_permissions"):
        fail("Webspaces must not require broad host permissions for this source candidate")

    action = manifest.get("action", {})
    if action.get("default_popup") != "ui/popup.html":
        fail("GoreeCloud Webspaces toolbar popup is required")
    options = manifest.get("options_ui", {})
    if options.get("page") != "ui/options.html":
        fail("GoreeCloud Webspaces management page is required")

    required_files = [
        "README.md",
        "SPECIFICATIONS.md",
        "FEATURES.md",
        "BENEFITS.md",
        "COMPETITIVE-OBJECTIVES.md",
        "SECURITY.md",
        "PRIVACY.md",
        "LICENSE",
        "src/background.js",
        "src/constants.js",
        "src/containers.js",
        "src/management.js",
        "src/provider-rules.js",
        "src/routing.js",
        "src/storage.js",
        "src/tab-migration.js",
        "ui/popup.html",
        "ui/popup.css",
        "ui/popup.js",
        "ui/options.html",
        "ui/options.css",
        "ui/options.js",
        "tests/routing.test.js",
        "tests/management.test.js",
        "tests/tab-migration.test.js",
    ]
    missing = [path for path in required_files if not (ROOT / path).is_file()]
    if missing:
        fail(f"missing required source files: {', '.join(missing)}")

    print("Validated GoreeCloud Webspaces 0.1.2 source-candidate routing hardening.")

if __name__ == "__main__":
    main()
