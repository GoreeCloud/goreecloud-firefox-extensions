#!/usr/bin/env python3
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
INVENTORY = ROOT / "docs" / "extension-inventory.json"


def fail(message: str) -> None:
    raise SystemExit(f"ERROR: {message}")


def main() -> None:
    data = json.loads(INVENTORY.read_text(encoding="utf-8"))
    entries = data.get("extensions", [])
    if not entries:
        fail("extension inventory is empty")

    seen_slugs = set()
    seen_ids = set()

    for entry in entries:
        slug = entry["slug"]
        if slug in seen_slugs:
            fail(f"duplicate extension slug: {slug}")
        seen_slugs.add(slug)

        if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", slug):
            fail(f"invalid extension slug: {slug}")

        extension_dir = ROOT / entry["directory"]
        manifest_path = extension_dir / "manifest.json"
        if not manifest_path.is_file():
            fail(f"missing manifest for {slug}")

        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        if manifest.get("manifest_version") != 3:
            fail(f"{slug} must use Manifest V3")
        if manifest.get("name") != entry["name"]:
            fail(f"inventory name mismatch for {slug}")

        gecko = manifest.get("browser_specific_settings", {}).get("gecko", {})
        gecko_id = gecko.get("id")
        if not gecko_id:
            fail(f"missing Firefox add-on ID for {slug}")
        if gecko_id != entry["gecko_id"]:
            fail(f"inventory Firefox add-on ID mismatch for {slug}")
        if gecko_id in seen_ids:
            fail(f"duplicate Firefox add-on ID: {gecko_id}")
        seen_ids.add(gecko_id)

        version = manifest.get("version")
        if not isinstance(version, str) or not re.fullmatch(r"\d+(?:\.\d+){1,3}", version):
            fail(f"invalid version for {slug}: {version!r}")

        for required in ("README.md",):
            if not (extension_dir / required).is_file():
                fail(f"missing {required} for {slug}")

        forbidden = {"http://*/*", "https://*/*", "<all_urls>"}
        required_hosts = set(manifest.get("host_permissions", []))
        if forbidden & required_hosts:
            fail(f"{slug} has broad required host permission: {sorted(forbidden & required_hosts)}")

    print(f"Validated {len(entries)} canonical GoreeCloud Firefox extensions.")


if __name__ == "__main__":
    main()
