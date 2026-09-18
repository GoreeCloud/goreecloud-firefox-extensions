#!/usr/bin/env python3
"""Fail-closed Stable security qualification for Advanced Tab Manager."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import subprocess
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPO = ROOT.parents[1]
EXPECTED_VERSION = str(
    json.loads((ROOT / "manifest.json").read_text(encoding="utf-8"))["version"]
)
EXPECTED_ID = "advanced-tab-manager@goreecloud.com"
EXPECTED_PERMISSIONS = {"alarms", "sessions", "storage", "tabGroups", "tabs"}

SECRET_PATTERNS = {
    "private-key": re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----"),
    "aws-access-key": re.compile(r"AKIA[0-9A-Z]{16}"),
    "github-token": re.compile(r"gh[pousr]_[A-Za-z0-9_]{30,}"),
    "google-api-key": re.compile(r"AIza[0-9A-Za-z_-]{35}"),
    "stripe-live-secret": re.compile(r"sk_live_[A-Za-z0-9]{16,}"),
}
RUNTIME_FORBIDDEN = {
    "eval": re.compile(r"\beval\s*\("),
    "function-constructor": re.compile(r"\bnew\s+Function\s*\("),
    "remote-script": re.compile(r"<script[^>]+src=[\"'][ ]*https?://", re.I),
    "remote-style": re.compile(r"<link[^>]+href=[\"'][ ]*https?://", re.I),
    "remote-css-import": re.compile(r"@import\s+(?:url\()?[\"']?https?://", re.I),
    "remote-dynamic-import": re.compile(r"\bimport\s*\(\s*[\"']https?://", re.I),
    "permission-request": re.compile(r"browser\.permissions\.request\s*\("),
}


def require(condition: bool, message: str) -> None:
    if not condition:
        raise SystemExit(message)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def read_manifest_bytes(raw: bytes) -> dict:
    return json.loads(raw.decode("utf-8"))


def validate_manifest(manifest: dict) -> None:
    require(manifest.get("version") == EXPECTED_VERSION, "manifest version is not the exact release candidate")
    require(
        manifest.get("browser_specific_settings", {}).get("gecko", {}).get("id") == EXPECTED_ID,
        "unexpected Firefox add-on ID",
    )
    require(set(manifest.get("permissions", [])) == EXPECTED_PERMISSIONS, "unexpected permission set")
    require(not manifest.get("host_permissions"), "host permissions are forbidden for this release candidate")
    require("content_scripts" not in manifest, "content scripts are forbidden for this release candidate")
    require(manifest.get("incognito") == "not_allowed", "private browsing must remain disabled")
    require("unlimitedStorage" not in manifest.get("permissions", []), "unlimitedStorage is forbidden")


def scan_text(label: str, text: str, patterns: dict[str, re.Pattern[str]]) -> None:
    for name, pattern in patterns.items():
        require(not pattern.search(text), f"{label}: forbidden pattern detected: {name}")


def runtime_files() -> list[Path]:
    files = [ROOT / "manifest.json"]
    files.extend(sorted((ROOT / "src").rglob("*")))
    return [path for path in files if path.is_file() and path.suffix.lower() in {".json", ".js", ".html", ".css"}]


def scan_runtime_source() -> int:
    count = 0
    for path in runtime_files():
        text = path.read_text(encoding="utf-8")
        scan_text(str(path.relative_to(REPO)), text, SECRET_PATTERNS)
        if path.name != "manifest.json":
            scan_text(str(path.relative_to(REPO)), text, RUNTIME_FORBIDDEN)
        count += 1
    return count


def scan_history() -> int:
    shallow = subprocess.run(
        ["git", "-C", str(REPO), "rev-parse", "--is-shallow-repository"],
        check=True,
        capture_output=True,
        text=True,
    ).stdout.strip()
    require(shallow == "false", "Stable security history scan requires a non-shallow checkout")
    history = subprocess.run(
        [
            "git", "-C", str(REPO), "log", "--format=", "--patch", "--full-history", "--",
            "extensions/advanced-tab-manager",
        ],
        check=True,
        capture_output=True,
        text=True,
    ).stdout
    require(bool(history.strip()), "Advanced Tab Manager history scan returned no patch history")
    scan_text("Advanced Tab Manager git history", history, SECRET_PATTERNS)
    commits = subprocess.run(
        ["git", "-C", str(REPO), "rev-list", "--count", "HEAD", "--", "extensions/advanced-tab-manager"],
        check=True,
        capture_output=True,
        text=True,
    ).stdout.strip()
    return int(commits)


def inspect_xpi(path: Path) -> tuple[int, dict]:
    require(path.is_file(), f"candidate XPI does not exist: {path}")
    with zipfile.ZipFile(path) as archive:
        bad = archive.testzip()
        require(bad is None, f"candidate XPI archive integrity failed at {bad}")
        names = archive.namelist()
        require("manifest.json" in names, "candidate XPI is missing manifest.json")
        manifest = read_manifest_bytes(archive.read("manifest.json"))
        validate_manifest(manifest)
        for name in names:
            normalized = name.lower()
            require(not normalized.startswith(("tests/", "scripts/", ".github/")), f"maintenance file leaked into XPI: {name}")
            require(not normalized.endswith((".py", ".mjs", ".md")), f"maintenance/documentation file leaked into XPI: {name}")
            if name.endswith((".js", ".html", ".css", ".json")):
                text = archive.read(name).decode("utf-8")
                scan_text(f"XPI:{name}", text, SECRET_PATTERNS)
                if name != "manifest.json":
                    scan_text(f"XPI:{name}", text, RUNTIME_FORBIDDEN)
    return len(names), manifest


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--xpi", required=True)
    parser.add_argument("--source-revision", required=True)
    parser.add_argument("--output", default="dist/advanced-tab-manager-stable-security-review.json")
    args = parser.parse_args()

    require(re.fullmatch(r"[0-9a-f]{40}", args.source_revision) is not None, "source revision must be a full lowercase SHA")
    manifest = json.loads((ROOT / "manifest.json").read_text(encoding="utf-8"))
    validate_manifest(manifest)
    source_files_scanned = scan_runtime_source()
    history_commits_scanned = scan_history()
    xpi = Path(args.xpi)
    package_entries, packaged_manifest = inspect_xpi(xpi)

    evidence = {
        "schemaVersion": 1,
        "product": "GoreeCloud Advanced Tab Manager",
        "sourceVersion": EXPECTED_VERSION,
        "sourceRevision": args.source_revision,
        "firefoxAddonId": EXPECTED_ID,
        "candidateSha256": sha256(xpi),
        "applicableStableSecurityBlockers": "passed",
        "securityExceptions": [],
        "permissionSet": sorted(EXPECTED_PERMISSIONS),
        "hostPermissions": [],
        "contentScripts": False,
        "privateBrowsing": "not_allowed",
        "runtimeSourceFilesScanned": source_files_scanned,
        "gitHistoryCommitsScanned": history_commits_scanned,
        "packageEntriesInspected": package_entries,
        "packageManifestVersion": packaged_manifest["version"],
        "historySecretsScan": "passed",
        "runtimeRemoteCodeScan": "passed",
        "runtimeDynamicCodeScan": "passed",
        "packageMaintenanceLeakScan": "passed",
        "signedArtifactIntegrityStillRequired": True,
        "mozillaSigningStillRequired": True,
    }
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(evidence, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(json.dumps(evidence, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
