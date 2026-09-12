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
    if manifest.get("version") != "0.1.0":
        fail("source version must remain synchronized with canonical inventory")
    gecko_id = manifest.get("browser_specific_settings", {}).get("gecko", {}).get("id")
    if gecko_id != "webspaces@goreecloud.com":
        fail("unexpected Firefox add-on ID")

    required_permissions = {"contextualIdentities", "cookies", "storage", "webNavigation"}
    permissions = set(manifest.get("permissions", []))
    if permissions != required_permissions:
        fail(f"unexpected permission set: {sorted(permissions)}")
    if manifest.get("host_permissions"):
        fail("the current routing foundation must not require broad host permissions")

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
        "src/provider-rules.js",
        "src/routing.js",
        "src/storage.js",
        "tests/routing.test.js",
    ]
    missing = [path for path in required_files if not (ROOT / path).is_file()]
    if missing:
        fail(f"missing required source files: {', '.join(missing)}")

    print("Validated GoreeCloud Webspaces 0.1.0 source-candidate foundation.")


if __name__ == "__main__":
    main()
