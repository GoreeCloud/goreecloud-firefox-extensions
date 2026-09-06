#!/usr/bin/env python3
from __future__ import annotations

import importlib.util
import json
import tempfile
import unittest
import zipfile
from pathlib import Path
from unittest import mock


SCRIPT = Path(__file__).with_name("target_acceptance.py")
SPEC = importlib.util.spec_from_file_location("privacy_shield_target_acceptance", SCRIPT)
if SPEC is None or SPEC.loader is None:
    raise RuntimeError("could not load target_acceptance.py")
T = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(T)

REVISION = "a" * 40
DIGEST = "b" * 64


def accepted_record() -> dict:
    record = {
        "schema_version": 1,
        "product": "GoreeCloud Privacy Shield",
        "release": "0.2.0",
        "candidate": {
            "source_revision": REVISION,
            "xpi_sha256": DIGEST,
            "installation_mode": "temporary-unsigned",
        },
        "environment": {
            "firefox_version": "155.0.1",
            "operating_system": "Zorin OS 17.3",
            "device_class": "laptop",
            "reviewed_at": "2026-09-06T15:50:00Z",
        },
        "popup_review": {"checks": {name: True for name in T.POPUP_CHECKS}},
        "site_reviews": [],
        "support_snapshot_review": {
            "hostname": "example.com",
            "checks": {name: True for name in T.SNAPSHOT_CHECKS},
        },
        "unresolved_blockers": [],
        "decision": "accepted",
    }
    for archetype in T.ARCHETYPES:
        required = archetype in T.REQUIRED_ARCHETYPES
        if required:
            observed = archetype == "script-app-dashboard"
            record["site_reviews"].append(
                {
                    "archetype": archetype,
                    "availability": "tested",
                    "hostname": {
                        "article-news": "news.example.com",
                        "script-app-dashboard": "app.example.com",
                        "third-party-embed": "media.example.com",
                    }[archetype],
                    "standard_result": "pass",
                    "strict_result": "pass",
                    "compatible_result": "pass",
                    "reset_result": "pass",
                    "strict_impact": "observed" if observed else "none",
                    "recovery": "compatible-and-reset" if observed else "not-needed",
                    "core_protection_after_recovery": True,
                }
            )
        else:
            record["site_reviews"].append(
                {
                    "archetype": archetype,
                    "availability": "not-available",
                    "hostname": "",
                    "standard_result": "not-tested",
                    "strict_result": "not-tested",
                    "compatible_result": "not-tested",
                    "reset_result": "not-tested",
                    "strict_impact": "not-tested",
                    "recovery": "not-tested",
                    "core_protection_after_recovery": None,
                }
            )
    return record


class TargetAcceptanceTests(unittest.TestCase):
    def test_release_ready_record_passes(self) -> None:
        result = T.validate_record(accepted_record(), expected_source_revision=REVISION, require_release_ready=True)
        self.assertTrue(result["release_ready"])
        self.assertTrue(result["recovery_demonstrated"])
        self.assertEqual(result["decision"], "accepted")
        self.assertEqual(set(result["tested_archetypes"]), T.REQUIRED_ARCHETYPES)

    def test_accepted_record_requires_real_recovery_demonstration(self) -> None:
        record = accepted_record()
        for site in record["site_reviews"]:
            if site["availability"] == "tested":
                site["strict_impact"] = "none"
                site["recovery"] = "not-needed"
        with self.assertRaisesRegex(T.AcceptanceError, "decision accepted"):
            T.validate_record(record, expected_source_revision=REVISION)

    def test_hostname_rejects_urls_queries_and_identity(self) -> None:
        for unsafe in (
            "https://example.com/private?token=secret",
            "example.com/path",
            "example.com?query=secret",
            "user@example.com",
        ):
            with self.subTest(unsafe=unsafe):
                with self.assertRaises(T.AcceptanceError):
                    T.normalize_hostname(unsafe, "test.hostname")

    def test_record_rejects_unknown_fields(self) -> None:
        record = accepted_record()
        record["raw_url"] = "https://example.com/private"
        with self.assertRaisesRegex(T.AcceptanceError, "unknown keys"):
            T.validate_record(record, expected_source_revision=REVISION)

    def test_record_rejects_candidate_revision_mismatch(self) -> None:
        record = accepted_record()
        with self.assertRaisesRegex(T.AcceptanceError, "does not match expected exact revision"):
            T.validate_record(record, expected_source_revision="c" * 40)

    def test_record_rejects_false_popup_check_when_claimed_accepted(self) -> None:
        record = accepted_record()
        record["popup_review"]["checks"]["visible_focus"] = False
        with self.assertRaisesRegex(T.AcceptanceError, "decision accepted"):
            T.validate_record(record, expected_source_revision=REVISION)

    def test_record_rejects_release_blocker_when_claimed_accepted(self) -> None:
        record = accepted_record()
        record["unresolved_blockers"] = ["site-compatibility"]
        with self.assertRaisesRegex(T.AcceptanceError, "decision accepted"):
            T.validate_record(record, expected_source_revision=REVISION)

    def test_summary_contains_bounded_evidence_not_raw_payloads(self) -> None:
        record = accepted_record()
        result = T.validate_record(record, expected_source_revision=REVISION, require_release_ready=True)
        summary = T._summary(record, result)
        self.assertIn("script-app-dashboard", summary)
        self.assertIn("app.example.com", summary)
        self.assertIn("raw URLs, paths, queries", summary)
        for forbidden in (
            "https://",
            "/private",
            "?token=secret",
            "session=secret",
            "cookie=secret",
            "authorization: bearer",
        ):
            self.assertNotIn(forbidden, summary.lower())

    def test_new_template_binds_xpi_identity_and_starts_incomplete(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            xpi = Path(tmp) / "privacy-shield.xpi"
            manifest = {
                "manifest_version": 3,
                "name": "GoreeCloud Privacy Shield",
                "version": "0.2.0",
                "browser_specific_settings": {"gecko": {"id": "privacy-shield@goreecloud.com"}},
            }
            with zipfile.ZipFile(xpi, "w") as archive:
                archive.writestr("manifest.json", json.dumps(manifest))

            with mock.patch.object(T, "_git_head", return_value=REVISION):
                record = T.new_record(
                    xpi,
                    "155.0.1",
                    "Zorin OS 17.3",
                    "laptop",
                    "temporary-unsigned",
                    "2026-09-06T15:50:00Z",
                )

            self.assertEqual(record["candidate"]["source_revision"], REVISION)
            self.assertRegex(record["candidate"]["xpi_sha256"], r"^[0-9a-f]{64}$")
            self.assertEqual(record["decision"], "incomplete")
            self.assertTrue(all(value is None for value in record["popup_review"]["checks"].values()))
            self.assertTrue(all(site["hostname"] == "" for site in record["site_reviews"]))
            result = T.validate_record(record, expected_source_revision=REVISION)
            self.assertFalse(result["release_ready"])

    def test_xpi_identity_is_fail_closed(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            xpi = Path(tmp) / "wrong.xpi"
            manifest = {
                "manifest_version": 3,
                "version": "0.2.0",
                "browser_specific_settings": {"gecko": {"id": "wrong@example.com"}},
            }
            with zipfile.ZipFile(xpi, "w") as archive:
                archive.writestr("manifest.json", json.dumps(manifest))
            with self.assertRaisesRegex(T.AcceptanceError, "unexpected Firefox add-on ID"):
                T._inspect_xpi(xpi)


if __name__ == "__main__":
    unittest.main()
