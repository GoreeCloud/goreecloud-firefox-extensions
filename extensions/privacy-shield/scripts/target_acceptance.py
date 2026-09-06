#!/usr/bin/env python3
"""Create and validate privacy-minimized Privacy Shield 0.2 target acceptance records.

The record intentionally stores only exact release provenance, bounded environment
metadata, boolean review outcomes, public hostnames, controlled archetype labels,
and bounded blocker codes. It never stores raw URLs, paths, queries, page content,
request logs, cookies, credentials, support-snapshot text, or free-form notes.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import subprocess
import sys
import zipfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = ROOT.parents[1]
EXPECTED_PRODUCT = "GoreeCloud Privacy Shield"
EXPECTED_ADDON_ID = "privacy-shield@goreecloud.com"
EXPECTED_RELEASE = "0.2.0"
SCHEMA_VERSION = 1

POPUP_CHECKS = (
    "opens_reliably",
    "hostname_correct",
    "toggle_site_scoped",
    "profile_help_understandable",
    "apply_reloads_site",
    "reset_returns_global_standard",
    "tab_counter_scope_clear",
    "protection_details_redacted",
    "refresh_without_page_reload",
    "copy_clean_url_correct",
    "copy_support_snapshot_success",
    "keyboard_reachable",
    "visible_focus",
    "target_text_scaling_usable",
)

SNAPSHOT_CHECKS = (
    "hostname_expected",
    "raw_path_absent",
    "query_and_fragment_absent",
    "raw_request_urls_absent",
    "page_dom_selector_content_absent",
    "cookies_credentials_identifiers_absent",
    "logger_identifiers_absent",
    "explicit_user_action_required",
    "no_upload_or_transmission_observed",
)

ARCHETYPES = (
    "article-news",
    "script-app-dashboard",
    "third-party-embed",
    "form-login-account",
    "media-rich",
)

REQUIRED_ARCHETYPES = {
    "article-news",
    "script-app-dashboard",
    "third-party-embed",
}

BLOCKER_CODES = {
    "popup-interaction",
    "keyboard-focus",
    "text-scaling",
    "site-compatibility",
    "support-snapshot-privacy",
    "other-release-blocker",
}

RESULT_VALUES = {"not-tested", "pass", "fail"}
AVAILABILITY_VALUES = {"not-reviewed", "tested", "not-available"}
STRICT_IMPACT_VALUES = {"not-tested", "none", "observed"}
RECOVERY_VALUES = {"not-tested", "not-needed", "compatible", "reset", "compatible-and-reset"}
INSTALLATION_MODES = {"temporary-unsigned", "mozilla-signed"}
DEVICE_CLASSES = {"desktop", "laptop", "tablet", "mobile", "other"}
DECISIONS = {"incomplete", "rejected", "accepted"}

HEX40 = re.compile(r"^[0-9a-f]{40}$")
HEX64 = re.compile(r"^[0-9a-f]{64}$")
VERSION = re.compile(r"^[0-9]+(?:\.[0-9]+){1,3}$")
HOST_LABEL = re.compile(r"^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$")


class AcceptanceError(ValueError):
    pass


def _require(condition: bool, message: str) -> None:
    if not condition:
        raise AcceptanceError(message)


def _exact_keys(obj: dict[str, Any], expected: set[str], context: str) -> None:
    actual = set(obj)
    missing = sorted(expected - actual)
    extra = sorted(actual - expected)
    _require(not missing, f"{context}: missing keys: {missing}")
    _require(not extra, f"{context}: unknown keys: {extra}")


def _safe_text(value: Any, context: str, max_len: int) -> str:
    _require(isinstance(value, str), f"{context}: expected string")
    text = value.strip()
    _require(bool(text), f"{context}: must not be empty")
    _require(len(text) <= max_len, f"{context}: exceeds {max_len} characters")
    _require("\n" not in text and "\r" not in text, f"{context}: line breaks are not allowed")
    lowered = text.lower()
    for forbidden in ("://", "?", "#", "@", "cookie", "authorization:", "bearer ", "password="):
        _require(forbidden not in lowered, f"{context}: contains disallowed URL/credential-like material")
    return text


def normalize_hostname(value: Any, context: str) -> str:
    _require(isinstance(value, str), f"{context}: expected hostname string")
    host = value.strip().lower().rstrip(".")
    _require(bool(host), f"{context}: hostname is required")
    _require(len(host) <= 253, f"{context}: hostname is too long")
    _require("://" not in host and "/" not in host and "?" not in host and "#" not in host and "@" not in host,
             f"{context}: store hostname only, never a URL/path/query/identity")
    labels = host.split(".")
    _require(len(labels) >= 2, f"{context}: use a public-style hostname with at least two labels")
    for label in labels:
        _require(bool(HOST_LABEL.fullmatch(label)), f"{context}: invalid hostname label: {label!r}")
    return host


def _git_head() -> str:
    try:
        result = subprocess.run(
            ["git", "rev-parse", "HEAD"],
            cwd=REPO_ROOT,
            check=True,
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
    except (OSError, subprocess.CalledProcessError) as exc:
        raise AcceptanceError(f"could not resolve repository HEAD: {exc}") from exc
    revision = result.stdout.strip().lower()
    _require(bool(HEX40.fullmatch(revision)), "repository HEAD is not a full 40-character commit SHA")
    return revision


def _inspect_xpi(path: Path) -> tuple[str, str]:
    _require(path.is_file(), f"XPI does not exist: {path}")
    digest = hashlib.sha256(path.read_bytes()).hexdigest()
    try:
        with zipfile.ZipFile(path) as archive:
            bad = archive.testzip()
            _require(bad is None, f"XPI archive integrity failure: {bad}")
            manifest = json.loads(archive.read("manifest.json").decode("utf-8"))
    except (KeyError, zipfile.BadZipFile, UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise AcceptanceError(f"could not inspect XPI manifest: {exc}") from exc

    addon_id = manifest.get("browser_specific_settings", {}).get("gecko", {}).get("id")
    version = manifest.get("version")
    _require(addon_id == EXPECTED_ADDON_ID, f"unexpected Firefox add-on ID: {addon_id!r}")
    _require(version == EXPECTED_RELEASE, f"target acceptance tool is scoped to {EXPECTED_RELEASE}; got {version!r}")
    return digest, version


def _utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _site_template(archetype: str) -> dict[str, Any]:
    return {
        "archetype": archetype,
        "availability": "not-reviewed",
        "hostname": "",
        "standard_result": "not-tested",
        "strict_result": "not-tested",
        "compatible_result": "not-tested",
        "reset_result": "not-tested",
        "strict_impact": "not-tested",
        "recovery": "not-tested",
        "core_protection_after_recovery": None,
    }


def new_record(
    xpi_path: Path,
    firefox_version: str,
    operating_system: str,
    device_class: str,
    installation_mode: str,
    reviewed_at: str | None = None,
) -> dict[str, Any]:
    digest, version = _inspect_xpi(xpi_path)
    _require(bool(VERSION.fullmatch(firefox_version.strip())), "Firefox version must be numeric dotted version text")
    _require(device_class in DEVICE_CLASSES, f"unsupported device class: {device_class!r}")
    _require(installation_mode in INSTALLATION_MODES, f"unsupported installation mode: {installation_mode!r}")
    os_name = _safe_text(operating_system, "operating_system", 80)
    timestamp = reviewed_at or _utc_now()
    _validate_timestamp(timestamp, "environment.reviewed_at")

    return {
        "schema_version": SCHEMA_VERSION,
        "product": EXPECTED_PRODUCT,
        "release": version,
        "candidate": {
            "source_revision": _git_head(),
            "xpi_sha256": digest,
            "installation_mode": installation_mode,
        },
        "environment": {
            "firefox_version": firefox_version.strip(),
            "operating_system": os_name,
            "device_class": device_class,
            "reviewed_at": timestamp,
        },
        "popup_review": {"checks": {name: None for name in POPUP_CHECKS}},
        "site_reviews": [_site_template(archetype) for archetype in ARCHETYPES],
        "support_snapshot_review": {
            "hostname": "",
            "checks": {name: None for name in SNAPSHOT_CHECKS},
        },
        "unresolved_blockers": [],
        "decision": "incomplete",
    }


def _validate_timestamp(value: Any, context: str) -> None:
    _require(isinstance(value, str) and value.endswith("Z"), f"{context}: require UTC RFC3339 ending in Z")
    try:
        parsed = datetime.fromisoformat(value[:-1] + "+00:00")
    except ValueError as exc:
        raise AcceptanceError(f"{context}: invalid RFC3339 timestamp") from exc
    _require(parsed.tzinfo is not None, f"{context}: timezone is required")


def _validate_bool_or_none(value: Any, context: str) -> None:
    _require(value is None or isinstance(value, bool), f"{context}: expected true, false, or null")


def validate_record(record: Any, expected_source_revision: str | None = None, require_release_ready: bool = False) -> dict[str, Any]:
    _require(isinstance(record, dict), "record: expected JSON object")
    _exact_keys(
        record,
        {
            "schema_version", "product", "release", "candidate", "environment", "popup_review",
            "site_reviews", "support_snapshot_review", "unresolved_blockers", "decision",
        },
        "record",
    )
    _require(record["schema_version"] == SCHEMA_VERSION, f"unsupported schema version: {record['schema_version']!r}")
    _require(record["product"] == EXPECTED_PRODUCT, "unexpected product identity")
    _require(record["release"] == EXPECTED_RELEASE, f"record must target release {EXPECTED_RELEASE}")

    candidate = record["candidate"]
    _require(isinstance(candidate, dict), "candidate: expected object")
    _exact_keys(candidate, {"source_revision", "xpi_sha256", "installation_mode"}, "candidate")
    revision = candidate["source_revision"]
    digest = candidate["xpi_sha256"]
    _require(isinstance(revision, str) and bool(HEX40.fullmatch(revision)), "candidate.source_revision: expected full lowercase commit SHA")
    _require(isinstance(digest, str) and bool(HEX64.fullmatch(digest)), "candidate.xpi_sha256: expected lowercase SHA-256")
    _require(candidate["installation_mode"] in INSTALLATION_MODES, "candidate.installation_mode: unsupported value")
    expected = (expected_source_revision or _git_head()).lower()
    _require(revision == expected, f"candidate.source_revision {revision} does not match expected exact revision {expected}")

    environment = record["environment"]
    _require(isinstance(environment, dict), "environment: expected object")
    _exact_keys(environment, {"firefox_version", "operating_system", "device_class", "reviewed_at"}, "environment")
    _require(isinstance(environment["firefox_version"], str) and bool(VERSION.fullmatch(environment["firefox_version"])),
             "environment.firefox_version: invalid numeric dotted version")
    _safe_text(environment["operating_system"], "environment.operating_system", 80)
    _require(environment["device_class"] in DEVICE_CLASSES, "environment.device_class: unsupported value")
    _validate_timestamp(environment["reviewed_at"], "environment.reviewed_at")

    popup = record["popup_review"]
    _require(isinstance(popup, dict), "popup_review: expected object")
    _exact_keys(popup, {"checks"}, "popup_review")
    popup_checks = popup["checks"]
    _require(isinstance(popup_checks, dict), "popup_review.checks: expected object")
    _exact_keys(popup_checks, set(POPUP_CHECKS), "popup_review.checks")
    for name in POPUP_CHECKS:
        _validate_bool_or_none(popup_checks[name], f"popup_review.checks.{name}")

    sites = record["site_reviews"]
    _require(isinstance(sites, list) and len(sites) == len(ARCHETYPES), "site_reviews: require exactly one entry for each governed archetype")
    seen_archetypes: set[str] = set()
    tested_archetypes: set[str] = set()
    recovery_demonstrated = False
    site_keys = {
        "archetype", "availability", "hostname", "standard_result", "strict_result", "compatible_result",
        "reset_result", "strict_impact", "recovery", "core_protection_after_recovery",
    }
    for index, site in enumerate(sites):
        context = f"site_reviews[{index}]"
        _require(isinstance(site, dict), f"{context}: expected object")
        _exact_keys(site, site_keys, context)
        archetype = site["archetype"]
        _require(archetype in ARCHETYPES, f"{context}.archetype: unsupported value")
        _require(archetype not in seen_archetypes, f"{context}.archetype: duplicate {archetype}")
        seen_archetypes.add(archetype)
        availability = site["availability"]
        _require(availability in AVAILABILITY_VALUES, f"{context}.availability: unsupported value")
        for result_key in ("standard_result", "strict_result", "compatible_result", "reset_result"):
            _require(site[result_key] in RESULT_VALUES, f"{context}.{result_key}: unsupported value")
        _require(site["strict_impact"] in STRICT_IMPACT_VALUES, f"{context}.strict_impact: unsupported value")
        _require(site["recovery"] in RECOVERY_VALUES, f"{context}.recovery: unsupported value")
        _validate_bool_or_none(site["core_protection_after_recovery"], f"{context}.core_protection_after_recovery")

        if availability == "tested":
            tested_archetypes.add(archetype)
            normalize_hostname(site["hostname"], f"{context}.hostname")
            for result_key in ("standard_result", "strict_result", "compatible_result", "reset_result"):
                _require(site[result_key] in {"pass", "fail"}, f"{context}.{result_key}: tested site requires pass/fail")
            _require(site["strict_impact"] in {"none", "observed"}, f"{context}.strict_impact: tested site requires observation")
            _require(site["recovery"] != "not-tested", f"{context}.recovery: tested site requires recovery result")
            _require(isinstance(site["core_protection_after_recovery"], bool),
                     f"{context}.core_protection_after_recovery: tested site requires boolean")
            if site["strict_impact"] == "observed" and site["recovery"] in {"compatible", "reset", "compatible-and-reset"}:
                recovery_demonstrated = True
        else:
            _require(site["hostname"] == "", f"{context}.hostname: omit hostname when site is not tested")
            for result_key in ("standard_result", "strict_result", "compatible_result", "reset_result"):
                _require(site[result_key] == "not-tested", f"{context}.{result_key}: non-tested site must remain not-tested")
            _require(site["strict_impact"] == "not-tested", f"{context}.strict_impact: non-tested site must remain not-tested")
            _require(site["recovery"] == "not-tested", f"{context}.recovery: non-tested site must remain not-tested")
            _require(site["core_protection_after_recovery"] is None,
                     f"{context}.core_protection_after_recovery: non-tested site must remain null")

    _require(seen_archetypes == set(ARCHETYPES), "site_reviews: archetype coverage mismatch")

    snapshot = record["support_snapshot_review"]
    _require(isinstance(snapshot, dict), "support_snapshot_review: expected object")
    _exact_keys(snapshot, {"hostname", "checks"}, "support_snapshot_review")
    snapshot_checks = snapshot["checks"]
    _require(isinstance(snapshot_checks, dict), "support_snapshot_review.checks: expected object")
    _exact_keys(snapshot_checks, set(SNAPSHOT_CHECKS), "support_snapshot_review.checks")
    for name in SNAPSHOT_CHECKS:
        _validate_bool_or_none(snapshot_checks[name], f"support_snapshot_review.checks.{name}")
    if snapshot["hostname"]:
        normalize_hostname(snapshot["hostname"], "support_snapshot_review.hostname")

    blockers = record["unresolved_blockers"]
    _require(isinstance(blockers, list), "unresolved_blockers: expected list")
    _require(len(blockers) == len(set(blockers)), "unresolved_blockers: duplicates are not allowed")
    for blocker in blockers:
        _require(blocker in BLOCKER_CODES, f"unresolved_blockers: unsupported code {blocker!r}")

    decision = record["decision"]
    _require(decision in DECISIONS, "decision: unsupported value")

    release_ready = (
        decision == "accepted"
        and not blockers
        and all(value is True for value in popup_checks.values())
        and all(value is True for value in snapshot_checks.values())
        and bool(snapshot["hostname"])
        and REQUIRED_ARCHETYPES.issubset(tested_archetypes)
        and recovery_demonstrated
        and all(
            site["standard_result"] == "pass"
            and site["strict_result"] == "pass"
            and site["compatible_result"] == "pass"
            and site["reset_result"] == "pass"
            and site["core_protection_after_recovery"] is True
            for site in sites
            if site["availability"] == "tested"
        )
    )

    if decision == "accepted":
        _require(release_ready, "decision accepted is invalid until every required target acceptance condition passes")
    if require_release_ready:
        _require(release_ready, "record is structurally valid but not release-ready target acceptance evidence")

    return {
        "source_revision": revision,
        "xpi_sha256": digest,
        "firefox_version": environment["firefox_version"],
        "installation_mode": candidate["installation_mode"],
        "decision": decision,
        "tested_archetypes": sorted(tested_archetypes),
        "recovery_demonstrated": recovery_demonstrated,
        "release_ready": release_ready,
    }


def _load_record(path: Path) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise AcceptanceError(f"could not read acceptance record {path}: {exc}") from exc


def _write_record(path: Path, record: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(record, indent=2, sort_keys=False) + "\n", encoding="utf-8")


def _summary(record: dict[str, Any], result: dict[str, Any]) -> str:
    env = record["environment"]
    snapshot = record["support_snapshot_review"]
    tested = [site for site in record["site_reviews"] if site["availability"] == "tested"]
    lines = [
        "# Privacy Shield 0.2.0 Target Acceptance Summary",
        "",
        f"- Source revision: `{result['source_revision']}`",
        f"- XPI SHA-256: `{result['xpi_sha256']}`",
        f"- Firefox: `{result['firefox_version']}`",
        f"- Installation mode: `{result['installation_mode']}`",
        f"- Device class: `{env['device_class']}`",
        f"- Reviewed at: `{env['reviewed_at']}`",
        f"- Decision: **{result['decision']}**",
        f"- Release-ready target evidence: **{'yes' if result['release_ready'] else 'no'}**",
        "",
        "## Reviewed site archetypes",
        "",
    ]
    if tested:
        for site in tested:
            lines.append(
                f"- `{site['archetype']}` — `{site['hostname']}` — Strict impact `{site['strict_impact']}` — recovery `{site['recovery']}`"
            )
    else:
        lines.append("- None recorded.")
    lines.extend(
        [
            "",
            "## Privacy boundary",
            "",
            f"- Support-snapshot hostname reviewed: `{snapshot['hostname'] or 'not recorded'}`",
            "- Raw URLs, paths, queries, page content, request logs, cookies, credentials, snapshot text, and free-form browsing notes are intentionally absent from this evidence format.",
        ]
    )
    return "\n".join(lines) + "\n"


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)

    create = sub.add_parser("new", help="create an incomplete privacy-safe target acceptance template")
    create.add_argument("--xpi", required=True, type=Path)
    create.add_argument("--firefox-version", required=True)
    create.add_argument("--operating-system", required=True)
    create.add_argument("--device-class", required=True, choices=sorted(DEVICE_CLASSES))
    create.add_argument("--installation-mode", required=True, choices=sorted(INSTALLATION_MODES))
    create.add_argument("--reviewed-at", default=None, help="UTC RFC3339 timestamp ending in Z; defaults to current UTC time")
    create.add_argument("--output", required=True, type=Path)

    validate = sub.add_parser("validate", help="validate a completed or in-progress target acceptance record")
    validate.add_argument("record", type=Path)
    validate.add_argument("--expected-source-revision", default=None)
    validate.add_argument("--require-release-ready", action="store_true")

    summary = sub.add_parser("summary", help="print a privacy-safe Markdown summary of a validated record")
    summary.add_argument("record", type=Path)
    summary.add_argument("--expected-source-revision", default=None)
    summary.add_argument("--require-release-ready", action="store_true")

    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    try:
        if args.command == "new":
            record = new_record(
                args.xpi,
                args.firefox_version,
                args.operating_system,
                args.device_class,
                args.installation_mode,
                args.reviewed_at,
            )
            _write_record(args.output, record)
            print(f"Created incomplete target acceptance template: {args.output}")
            print("Fill only the governed fields; do not add raw URLs, page content, credentials, or free-form browsing notes.")
            return 0

        record = _load_record(args.record)
        result = validate_record(record, args.expected_source_revision, args.require_release_ready)
        if args.command == "summary":
            sys.stdout.write(_summary(record, result))
        else:
            print(json.dumps(result, sort_keys=True))
        return 0
    except AcceptanceError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
