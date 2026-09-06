#!/usr/bin/env python3
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = ROOT.parents[1]
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
    "RELEASE.md", "SIGNING.md", "RELEASE-PRIVACY-REVIEW-0.2.0.md",
    "vendor/THIRD_PARTY_NOTICES.md", "hidden.html", "src/cosmetic-rules.js", "src/hidden.js",
    "src/logger-privacy.js", "src/site-profiles.js", "src/support-snapshot.js",
    "scripts/test_logger_privacy.js", "scripts/test_background_activity.js", "scripts/test_site_profiles.js",
    "scripts/test_support_snapshot.js", "tests/event_page_recovery_smoke.py", "tests/popup_quick_controls_smoke.py"
):
    assert (ROOT / required).is_file(), required
for resource in ("vendor/normalize-8.0.1.css", "src/page-guard.js"):
    assert (ROOT / resource).is_file(), resource

logger_html = (ROOT / "logger.html").read_text(encoding="utf-8")
options_html = (ROOT / "options.html").read_text(encoding="utf-8")
popup_html = (ROOT / "popup.html").read_text(encoding="utf-8")
popup_js = (ROOT / "src/popup.js").read_text(encoding="utf-8")
profile_js = (ROOT / "src/site-profiles.js").read_text(encoding="utf-8")
support_snapshot_js = (ROOT / "src/support-snapshot.js").read_text(encoding="utf-8")
support_snapshot_test = (ROOT / "scripts/test_support_snapshot.js").read_text(encoding="utf-8")
popup_runtime_test = (ROOT / "tests/popup_quick_controls_smoke.py").read_text(encoding="utf-8")
background_js = (ROOT / "src/background.js").read_text(encoding="utf-8")
content_js = (ROOT / "src/content.js").read_text(encoding="utf-8")
release_doc = (ROOT / "RELEASE.md").read_text(encoding="utf-8")
signing_doc = (ROOT / "SIGNING.md").read_text(encoding="utf-8")
release_privacy_review = (ROOT / "RELEASE-PRIVACY-REVIEW-0.2.0.md").read_text(encoding="utf-8")
signing_workflow = (REPO_ROOT / ".github/workflows/privacy-shield-mozilla-signing.yml").read_text(encoding="utf-8")
assert 'src/logger-privacy.js' in logger_html, "logger page must load privacy helper"
assert 'id="privacyView"' in logger_html, "logger Privacy view control missing"
assert 'id="hiddenCountSummary"' in logger_html, "logger hidden summary missing"
assert 'id="blockAnnoyances"' in options_html, "reviewed annoyance setting missing"
assert 'This tab' in popup_html, "popup counter scope must be explicit"
assert 'id="hiddenCount"' in popup_html, "popup hidden counter missing"
assert 'PAGE_FILTER_REASONS' in background_js and 'message.type === "page:filtered"' in background_js, "unified page activity handling missing"
assert 'stat: "cleaned"' in content_js and 'type: "page:filtered"' in content_js, "content activity reporting missing"
assert 'selector' not in background_js.split('function logPageFilter', 1)[1].split('function requestHostname', 1)[0].lower(), "page activity logger must not record selectors"
assert 'TAB_COUNTER_KEYS' in background_js and 'setBadgeText' in background_js, "combined This tab toolbar badge missing"
assert 'blocked", "cleaned", "hidden", "local' in background_js, "toolbar badge counter set is incomplete"
assert '999+' in background_js, "toolbar badge compact overflow behavior missing"
assert 'browser.storage?.session' in background_js and 'runtimeTabCounters' in background_js, "MV3 event-page counter recovery missing"
assert 'onBeforeRequest.addListener(\n    async (details) => {\n      await ready;' in background_js, "request blocking must await MV3 event-page initialization"
assert 'onBeforeSendHeaders.addListener(\n    async (details) => {\n      await ready;' in background_js, "request-header protection must await MV3 event-page initialization"
assert 'onHeadersReceived.addListener(\n    async (details) => {\n      await ready;' in background_js, "response-header protection must await MV3 event-page initialization"

# Popup quick controls are local-only and must stay tied to existing sanitized/runtime boundaries.
for control_id in (
    "copyCleanUrl", "resetSite", "siteProfile", "applyProfile", "profileHelp", "detailList", "detailTotal",
    "protectionState", "refreshDetails", "copySupportSnapshot"
):
    assert f'id="{control_id}"' in popup_html, f"popup quick control missing: {control_id}"
assert (
    popup_html.index('src/core.js')
    < popup_html.index('src/site-profiles.js')
    < popup_html.index('src/support-snapshot.js')
    < popup_html.index('src/popup.js')
), "support/profile helpers must load after core and before popup"
assert 'type: "url:clean"' in popup_js and 'writeClipboard' in popup_js, "Copy clean URL must use the canonical URL cleaner and local clipboard"
assert 'type: "logger:get"' in popup_js and 'DETAIL_LABELS' in popup_js, "Protection details must derive from existing privacy-safe logger entries"
detail_rows = popup_js.split('function detailRows', 1)[1].split('let currentReasonRows', 1)[0]
render_details = popup_js.split('function renderDetails', 1)[1].split('function setProfileHelp', 1)[0]
for section in (detail_rows, render_details):
    assert '.url' not in section and 'finalUrl' not in section, "Protection details must not read or render request URLs"
assert 'strict' in profile_js and 'compatible' in profile_js and 'standard' in profile_js, "site protection profiles are incomplete"
assert 'blockThirdPartyScripts: true' in profile_js and 'blockThirdPartyFrames: true' in profile_js, "Strict profile must add third-party script/frame blocking"
assert 'cosmeticFiltering: false' in profile_js and 'localResources: false' in profile_js, "Compatible profile must reduce page-altering behavior"
assert 'enabled' not in profile_js.split('values: Object.freeze({', 1)[1].split('})', 1)[0], "profile values must not silently change the independent site enabled state"

# Support snapshots are explicit, local clipboard exports of bounded derived state only.
assert 'PrivacyShieldSupportSnapshot' in support_snapshot_js and 'buildSnapshot' in support_snapshot_js, "support snapshot formatter missing"
assert 'S.buildSnapshot' in popup_js and 'copySupportSnapshot' in popup_js, "popup support snapshot action missing"
assert 'browser.runtime.getBrowserInfo' in popup_js and 'browser.runtime.getManifest' in popup_js, "support snapshot must identify local runtime/version without remote lookup"
assert 'hostname: host' in popup_js and 'reasonRows:' in popup_js and 'stats: currentStats' in popup_js, "support snapshot must be assembled from bounded derived state"
for forbidden_source in ('input.url', 'input.finalUrl', 'input.loggerId', 'input.dom', 'input.query', 'input.cookies'):
    assert forbidden_source not in support_snapshot_js, f"support snapshot formatter must ignore sensitive field: {forbidden_source}"
for required_test_marker in ('raw-secret', 'utm_source', 'session=secret', 'private-event-id', '<input', 'https://'):
    assert required_test_marker in support_snapshot_test, f"support snapshot leak regression marker missing: {required_test_marker}"
assert 'Privacy boundary:' in support_snapshot_js, "support snapshot must disclose its privacy boundary"
assert 'refreshActivity' in popup_js and 'Protection details refreshed.' in popup_js, "popup live detail refresh missing"

# Real-Firefox candidate acceptance must cover the complete 0.2 quick-control path.
for marker in (
    'Copy clean URL executes through popup in real Firefox',
    'privacy-safe support snapshot copies through popup in real Firefox',
    'Strict mode blocks otherwise-allowed third-party script',
    'Compatible mode reduces page alteration by disabling cosmetic filtering',
    'Reset site returns popup to Standard mode',
    'Protection details refreshes without page reload'
):
    assert marker in popup_runtime_test, f"popup runtime acceptance marker missing: {marker}"
assert 'WebExtensionPolicy.getByID' in popup_runtime_test, "popup runtime test must inspect the installed extension origin"
assert 'inBackground: true' in popup_runtime_test, "popup runtime test must preserve the protected active tab during popup initialization"

# Release governance must preserve the current Stable/candidate distinction and the reviewed privacy boundary.
release_lower = release_doc.lower()
review_lower = release_privacy_review.lower()
signing_lower = signing_doc.lower()
assert '0.1.1 remains the current stable' in release_lower, "0.2 release record must preserve Stable 0.1.1"
assert '0.2.0 is a **candidate**' in release_doc, "0.2 must remain explicitly candidate until promotion"
assert 'source-level release privacy review passed' in review_lower, "0.2 source-level release privacy review result missing"
assert 'does **not** make 0.2.0 stable' in review_lower, "privacy review must not imply Stable promotion"
for boundary in ('raw request', 'query', 'page content', 'selectors', 'credentials', 'logger identifiers'):
    assert boundary in review_lower, f"release privacy review missing private-data boundary: {boundary}"
assert 'hostname is intentionally included' in review_lower, "release privacy review must disclose hostname inclusion"
assert 'manual target-environment' in release_lower and 'representative-site compatibility' in release_lower, "remaining human/compatibility gates missing from release record"
assert 'mozilla unlisted signing' in release_lower and 'persistent signed installation' in release_lower, "remaining signing/restart gates missing from release record"

# Signing guidance/workflow must be deliberate, version-dynamic, unlisted, secret-bound, and test the returned signed XPI.
assert 'manual-only' in signing_lower and 'version-dynamic' in signing_lower, "signing guidance must describe manual version-dynamic release operation"
assert 'privacy-shield@goreecloud.com' in signing_doc and 'unlisted/self-distribution' in signing_lower, "signing identity/channel boundary missing"
assert 'AMO_JWT_ISSUER' in signing_doc and 'AMO_JWT_SECRET' in signing_doc, "signing credential names missing"
assert 'workflow_dispatch:' in signing_workflow, "Mozilla signing workflow must remain manual-only"
assert 'test_site_profiles.js' in signing_workflow and 'test_support_snapshot.js' in signing_workflow, "signing preflight must validate 0.2 profiles/support snapshot"
assert 'popup_quick_controls_smoke.py' in signing_workflow, "signed XPI popup acceptance missing from signing workflow"
assert 'event_page_recovery_smoke.py' in signing_workflow, "signed XPI MV3 recovery acceptance missing from signing workflow"
assert 'signed_restart_smoke.py' in signing_workflow, "persistent signed restart acceptance missing from signing workflow"
assert '--channel=unlisted' in signing_workflow and 'web-ext@10.5.0' in signing_workflow, "Mozilla unlisted signing tool/channel boundary drifted"

print("Privacy Shield source contract validated.")
