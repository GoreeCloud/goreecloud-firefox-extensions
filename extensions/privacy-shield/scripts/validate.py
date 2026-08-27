#!/usr/bin/env python3
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
manifest = json.loads((ROOT / "manifest.json").read_text(encoding="utf-8"))

assert manifest["manifest_version"] == 3
assert manifest["browser_specific_settings"]["gecko"]["id"] == "privacy-shield@goreecloud.com"
assert "<all_urls>" in manifest.get("host_permissions", [])
assert "persistent" not in manifest.get("background", {}), "Firefox MV3 does not support background.persistent"
background_scripts = manifest.get("background", {}).get("scripts", [])
assert "src/logger-privacy.js" in background_scripts, "logger privacy helper must load before background"
assert background_scripts.index("src/logger-privacy.js") < background_scripts.index("src/background.js"), "logger privacy helper must load before background"
for permission in ("webRequest", "webRequestBlocking", "storage", "clipboardWrite"):
    assert permission in manifest.get("permissions", []), permission
for required in (
    "README.md", "PRIVACY.md", "SECURITY.md", "ARCHITECTURE.md", "BROAD_HOST_PERMISSION_REVIEW.md",
    "vendor/THIRD_PARTY_NOTICES.md", "hidden.html", "src/cosmetic-rules.js", "src/hidden.js",
    "src/logger-privacy.js", "scripts/test_logger_privacy.js", "scripts/test_background_activity.js"
):
    assert (ROOT / required).is_file(), required
for resource in ("vendor/normalize-8.0.1.css", "src/page-guard.js"):
    assert (ROOT / resource).is_file(), resource

logger_html = (ROOT / "logger.html").read_text(encoding="utf-8")
options_html = (ROOT / "options.html").read_text(encoding="utf-8")
popup_html = (ROOT / "popup.html").read_text(encoding="utf-8")
background_js = (ROOT / "src/background.js").read_text(encoding="utf-8")
content_js = (ROOT / "src/content.js").read_text(encoding="utf-8")
assert 'src/logger-privacy.js' in logger_html, "logger page must load privacy helper"
assert 'id="privacyView"' in logger_html, "logger Privacy view control missing"
assert 'id="hiddenCountSummary"' in logger_html, "logger hidden summary missing"
assert 'id="blockAnnoyances"' in options_html, "reviewed annoyance setting missing"
assert 'This tab' in popup_html, "popup counter scope must be explicit"
assert 'id="hiddenCount"' in popup_html, "popup hidden counter missing"
assert 'PAGE_FILTER_REASONS' in background_js and 'message.type === "page:filtered"' in background_js, "unified page activity handling missing"
assert 'stat: "cleaned"' in content_js and 'type: "page:filtered"' in content_js, "content activity reporting missing"
assert 'selector' not in background_js.split('function logPageFilter', 1)[1].split('function requestHostname', 1)[0].lower(), "page activity logger must not record selectors"

print("Privacy Shield source contract validated.")
