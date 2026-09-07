#!/usr/bin/env python3
"""Verify a Mozilla-signed Download Manager XPI against the deterministic source candidate.

Mozilla signing may rewrite manifest.json serialization and, for legacy AMO versions,
may materialize the no-data data_collection_permissions declaration. All other
runtime payload files must remain byte-for-byte identical to the deterministic
candidate. Any other manifest semantic change is rejected.
"""

from __future__ import annotations

import copy
import hashlib
import json
import shutil
import sys
import zipfile
from pathlib import Path

EXPECTED_ADDON_ID = "download-manager@goreecloud.com"
MANIFEST = "manifest.json"
ALLOWED_IMPLICIT_DATA_COLLECTION = {
    "required": ["none"],
}


def _normalized_no_data_collection(value: object) -> bool:
    if not isinstance(value, dict):
        return False
    required = value.get("required")
    optional = value.get("optional", [])
    previous = value.get("has_previous_consent", False)
    allowed_keys = {"required", "optional", "has_previous_consent"}
    return (
        set(value) <= allowed_keys
        and required == ["none"]
        and optional == []
        and previous is False
    )


def _extract_data_collection(manifest: dict) -> object:
    return (
        manifest.get("browser_specific_settings", {})
        .get("gecko", {})
        .get("data_collection_permissions")
    )


def _without_data_collection(manifest: dict) -> dict:
    result = copy.deepcopy(manifest)
    gecko = result.get("browser_specific_settings", {}).get("gecko", {})
    if isinstance(gecko, dict):
        gecko.pop("data_collection_permissions", None)
    return result


def verify_manifest(unsigned_manifest: dict, signed_manifest: dict) -> str:
    unsigned_dcp = _extract_data_collection(unsigned_manifest)
    signed_dcp = _extract_data_collection(signed_manifest)

    if _without_data_collection(unsigned_manifest) != _without_data_collection(signed_manifest):
        raise SystemExit(
            "Mozilla-signed manifest changed semantics outside the governed "
            "data_collection_permissions normalization boundary"
        )

    if unsigned_dcp is None and signed_dcp is None:
        return "json-serialization-only"

    if unsigned_dcp is not None:
        if signed_dcp != unsigned_dcp:
            raise SystemExit(
                "Mozilla-signed manifest changed source-declared data_collection_permissions"
            )
        return "source-declared-data-collection-preserved"

    if not _normalized_no_data_collection(signed_dcp):
        raise SystemExit(
            "Mozilla-signed manifest added an unapproved data_collection_permissions declaration: "
            f"{signed_dcp!r}"
        )
    return "amo-materialized-no-data-declaration"


def main() -> int:
    if len(sys.argv) != 4:
        print(
            "usage: verify_signed_xpi.py <version> <unsigned-candidate.xpi> <signed-input.xpi>",
            file=sys.stderr,
        )
        return 2

    version = sys.argv[1]
    candidate = Path(sys.argv[2])
    signed_input = Path(sys.argv[3])
    if not candidate.is_file():
        raise SystemExit(f"unsigned candidate does not exist: {candidate}")
    if not signed_input.is_file():
        raise SystemExit(f"signed XPI does not exist: {signed_input}")

    target = Path(f"dist/goreecloud-download-manager-{version}-signed.xpi")
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(signed_input, target)

    with zipfile.ZipFile(candidate) as unsigned_archive, zipfile.ZipFile(target) as signed_archive:
        unsigned_bad = unsigned_archive.testzip()
        if unsigned_bad:
            raise SystemExit(f"unsigned candidate archive integrity failure: {unsigned_bad}")
        signed_bad = signed_archive.testzip()
        if signed_bad:
            raise SystemExit(f"signed XPI integrity failure: {signed_bad}")

        unsigned_names = unsigned_archive.namelist()
        signed_names = signed_archive.namelist()
        if MANIFEST not in unsigned_names or MANIFEST not in signed_names:
            raise SystemExit("candidate or signed XPI is missing manifest.json")

        signature_files = sorted(
            name
            for name in signed_names
            if name.startswith("META-INF/") and not name.endswith("/")
        )
        if not signature_files:
            raise SystemExit("signed XPI does not contain Mozilla signature metadata")

        unsigned_payload_names = sorted(name for name in unsigned_names if not name.endswith("/"))
        signed_payload_names = sorted(
            name
            for name in signed_names
            if not name.startswith("META-INF/") and not name.endswith("/")
        )
        if signed_payload_names != unsigned_payload_names:
            raise SystemExit(
                "Mozilla-signed XPI payload inventory differs from the deterministic unsigned candidate: "
                f"unsigned={unsigned_payload_names!r} signed={signed_payload_names!r}"
            )

        for name in unsigned_payload_names:
            if name == MANIFEST:
                continue
            if signed_archive.read(name) != unsigned_archive.read(name):
                raise SystemExit(f"Mozilla-signed XPI changed runtime payload bytes for {name}")

        unsigned_manifest = json.loads(unsigned_archive.read(MANIFEST).decode("utf-8"))
        signed_manifest = json.loads(signed_archive.read(MANIFEST).decode("utf-8"))
        manifest_normalization = verify_manifest(unsigned_manifest, signed_manifest)

        addon_id = (
            signed_manifest.get("browser_specific_settings", {})
            .get("gecko", {})
            .get("id")
        )
        if addon_id != EXPECTED_ADDON_ID:
            raise SystemExit(f"signed XPI changed Firefox add-on ID: {addon_id!r}")
        if signed_manifest.get("version") != version:
            raise SystemExit(f"signed XPI changed version: {signed_manifest.get('version')!r}")

    digest = hashlib.sha256(target.read_bytes()).hexdigest()
    Path("dist/signed-sha256.txt").write_text(
        f"{digest}  {target.name}\n", encoding="utf-8"
    )
    parity = {
        "schemaVersion": 1,
        "manifestNormalization": manifest_normalization,
        "nonManifestPayloadByteExact": True,
        "payloadInventoryExact": True,
        "signatureMetadataFiles": signature_files,
        "signedSha256": digest,
    }
    Path("dist/signed-xpi-parity.json").write_text(
        json.dumps(parity, indent=2, sort_keys=True) + "\n", encoding="utf-8"
    )

    print(f"Mozilla signature metadata files: {signature_files!r}")
    print("Mozilla-signed non-manifest runtime payload matches candidate byte-for-byte.")
    print(f"Manifest normalization: {manifest_normalization}")
    print(f"Signed SHA-256: {digest}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
