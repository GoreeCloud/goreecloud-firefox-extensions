#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = ROOT.parents[1]

tool = (ROOT / "scripts/target_acceptance.py").read_text(encoding="utf-8")
tests = (ROOT / "scripts/test_target_acceptance.py").read_text(encoding="utf-8")
acceptance = (ROOT / "RELEASE-ACCEPTANCE-0.2.0.md").read_text(encoding="utf-8")
signing = (ROOT / "SIGNING.md").read_text(encoding="utf-8")
repository_workflow = (REPO_ROOT / ".github/workflows/firefox-repository.yml").read_text(encoding="utf-8")
signing_workflow = (REPO_ROOT / ".github/workflows/privacy-shield-mozilla-signing.yml").read_text(encoding="utf-8")
packager = (REPO_ROOT / "shared/scripts/package_extension.py").read_text(encoding="utf-8")

for required in (
    ROOT / "scripts/target_acceptance.py",
    ROOT / "scripts/test_target_acceptance.py",
    ROOT / "RELEASE-ACCEPTANCE-0.2.0.md",
):
    assert required.is_file(), required

# The record is deliberately closed, bounded, and release-specific.
for marker in (
    'EXPECTED_ADDON_ID = "privacy-shield@goreecloud.com"',
    'EXPECTED_RELEASE = "0.2.0"',
    'SCHEMA_VERSION = 1',
    'POPUP_CHECKS = (',
    'SNAPSHOT_CHECKS = (',
    'ARCHETYPES = (',
    'REQUIRED_ARCHETYPES = {',
    'BLOCKER_CODES = {',
    '_exact_keys(',
    'normalize_hostname(',
    'require_release_ready',
    'recovery_demonstrated',
):
    assert marker in tool, f"target acceptance tool contract missing: {marker}"

for archetype in (
    '"article-news"',
    '"script-app-dashboard"',
    '"third-party-embed"',
    '"form-login-account"',
    '"media-rich"',
):
    assert archetype in tool, f"target acceptance archetype missing: {archetype}"

for privacy_marker in (
    'store hostname only, never a URL/path/query/identity',
    'support-snapshot text',
    'free-form notes',
    'raw URLs, paths, queries, page content, request logs, cookies, credentials',
):
    assert privacy_marker.lower() in tool.lower(), f"target evidence privacy boundary missing: {privacy_marker}"

# An accepted decision must remain fail closed on full target evidence.
for gate in (
    'decision == "accepted"',
    'not blockers',
    'all(value is True for value in popup_checks.values())',
    'all(value is True for value in snapshot_checks.values())',
    'REQUIRED_ARCHETYPES.issubset(tested_archetypes)',
    'and recovery_demonstrated',
    'site["core_protection_after_recovery"] is True',
):
    assert gate in tool, f"release-ready target evidence gate missing: {gate}"

# Regression coverage must prove both valid and rejected evidence shapes.
for marker in (
    'test_release_ready_record_passes',
    'test_accepted_record_requires_real_recovery_demonstration',
    'test_hostname_rejects_urls_queries_and_identity',
    'test_record_rejects_unknown_fields',
    'test_record_rejects_candidate_revision_mismatch',
    'test_record_rejects_false_popup_check_when_claimed_accepted',
    'test_record_rejects_release_blocker_when_claimed_accepted',
    'test_xpi_identity_is_fail_closed',
):
    assert marker in tests, f"target acceptance regression missing: {marker}"

# The permanent repository gate must exercise the evidence contract.
assert 'python extensions/privacy-shield/scripts/test_target_acceptance.py' in repository_workflow, \
    "repository workflow must run target acceptance evidence tests"

# Manual signing must bind the private/local review record to exact source and exact XPI bytes.
for input_name in (
    'target_acceptance_source_revision',
    'target_acceptance_xpi_sha256',
    'target_acceptance_record_sha256',
):
    assert input_name in signing_workflow, f"manual signing target-evidence input missing: {input_name}"
assert 'TARGET_ACCEPTANCE_SOURCE_REVISION" != "$GITHUB_SHA' in signing_workflow, \
    "manual signing must require target acceptance source to equal exact workflow source"
assert 'target acceptance XPI digest mismatch' in signing_workflow, \
    "manual signing must compare rebuilt unsigned XPI with target-reviewed XPI digest"
assert 'dist/target-acceptance-evidence.txt' in signing_workflow, \
    "signed release evidence must retain only the target acceptance provenance tuple"
assert 'python extensions/privacy-shield/scripts/test_target_acceptance.py' in signing_workflow, \
    "signing preflight must rerun target acceptance evidence tests"
assert 'extensions/privacy-shield/scripts/target_acceptance.py' in signing_workflow, \
    "signing preflight must syntax-check the target acceptance tool"

# Documentation must not imply that a digest replaces human review.
acceptance_lower = acceptance.lower()
signing_lower = signing.lower()
for marker in (
    'privacy-safe machine-readable evidence',
    'target_acceptance.py validate',
    '--require-release-ready',
    'do not commit a review record merely because the validator accepts it',
):
    assert marker in acceptance_lower, f"target acceptance guidance missing: {marker}"
for marker in (
    'target-acceptance evidence boundary',
    'record digest is provenance linkage, not proof that the human review was performed correctly',
    'exact source/xpi linkage',
):
    assert marker in signing_lower, f"signing target-evidence boundary missing: {marker}"

# Target acceptance tooling stays outside the packaged Firefox payload.
assert 'EXCLUDE_PARTS = {"scripts", "__pycache__", ".git"}' in packager, \
    "canonical packager must continue excluding maintenance scripts from the XPI"

print("Privacy Shield target acceptance evidence source contract validated.")
