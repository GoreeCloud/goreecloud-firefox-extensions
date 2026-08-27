#!/usr/bin/env python3
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
manifest = json.loads((ROOT / "manifest.json").read_text(encoding="utf-8"))

assert manifest["manifest_version"] == 3
assert manifest["browser_specific_settings"]["gecko"]["id"] == "privacy-shield@goreecloud.com"
assert "<all_urls>" in manifest.get("host_permissions", [])
for permission in ("webRequest", "webRequestBlocking", "storage", "clipboardWrite"):
    assert permission in manifest.get("permissions", []), permission
for required in ("README.md", "PRIVACY.md", "SECURITY.md", "ARCHITECTURE.md", "BROAD_HOST_PERMISSION_REVIEW.md", "vendor/THIRD_PARTY_NOTICES.md"):
    assert (ROOT / required).is_file(), required
for resource in ("vendor/normalize-8.0.1.css", "src/page-guard.js"):
    assert (ROOT / resource).is_file(), resource
print("Privacy Shield source contract validated.")
