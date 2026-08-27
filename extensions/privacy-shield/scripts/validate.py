#!/usr/bin/env python3
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
manifest = json.loads((ROOT / "manifest.json").read_text(encoding="utf-8"))

assert manifest["manifest_version"] == 3
assert manifest["browser_specific_settings"]["gecko"]["id"] == "privacy-shield@goreecloud.com"
assert "<all_urls>" in manifest.get("host_permissions", [])
assert "persistent" not in manifest.get("background", {}), "Firefox MV3 does not support background.persistent"
assert "src/logger-privacy.js" in manifest.get("background", {}).get("scripts", []), "logger privacy helper must load before background"
for permission in ("webRequest", "webRequestBlocking", "storage", "clipboardWrite"):
    assert permission in manifest.get("permissions", []), permission
for required in (
    "README.md", "PRIVACY.md", "SECURITY.md", "ARCHITECTURE.md", "BROAD_HOST_PERMISSION_REVIEW.md",
    "vendor/THIRD_PARTY_NOTICES.md", "hidden.html", "src/cosmetic-rules.js", "src/hidden.js",
    "src/logger-privacy.js", "scripts/test_logger_privacy.js"
):
    assert (ROOT / required).is_file(), required
for resource in ("vendor/normalize-8.0.1.css", "src/page-guard.js"):
    assert (ROOT / resource).is_file(), resource

logger_html = (ROOT / "logger.html").read_text(encoding="utf-8")
options_html = (ROOT / "options.html").read_text(encoding="utf-8")
popup_html = (ROOT / "popup.html").read_text(encoding="utf-8")
assert 'src/logger-privacy.js' in logger_html, "logger page must load privacy helper"
assert 'id="privacyView"' in logger_html, "logger Privacy view control missing"
assert 'id="blockAnnoyances"' in options_html, "reviewed annoyance setting missing"
assert 'This tab' in popup_html, "popup counter scope must be explicit"

print("Privacy Shield source contract validated.")
