import copy
import unittest

from verify_signed_xpi import verify_manifest


BASE = {
    "manifest_version": 3,
    "name": "GoreeCloud Download Manager Extension",
    "version": "0.2.10",
    "browser_specific_settings": {
        "gecko": {
            "id": "download-manager@goreecloud.com",
            "strict_min_version": "128.0",
        }
    },
    "permissions": ["downloads", "storage"],
}


class SignedManifestParityTests(unittest.TestCase):
    def test_identical_manifest_is_accepted(self):
        self.assertEqual(
            verify_manifest(copy.deepcopy(BASE), copy.deepcopy(BASE)),
            "json-serialization-only",
        )

    def test_safe_amo_no_data_materialization_is_accepted(self):
        signed = copy.deepcopy(BASE)
        signed["browser_specific_settings"]["gecko"]["data_collection_permissions"] = {
            "required": ["none"],
            "optional": [],
            "has_previous_consent": False,
        }
        self.assertEqual(
            verify_manifest(copy.deepcopy(BASE), signed),
            "amo-materialized-no-data-declaration",
        )

    def test_source_declared_data_collection_must_be_preserved_exactly(self):
        unsigned = copy.deepcopy(BASE)
        unsigned["browser_specific_settings"]["gecko"]["data_collection_permissions"] = {
            "required": ["none"]
        }
        signed = copy.deepcopy(unsigned)
        self.assertEqual(
            verify_manifest(unsigned, signed),
            "source-declared-data-collection-preserved",
        )

        changed = copy.deepcopy(signed)
        changed["browser_specific_settings"]["gecko"]["data_collection_permissions"] = {
            "required": ["websiteContent"]
        }
        with self.assertRaises(SystemExit):
            verify_manifest(unsigned, changed)

    def test_non_none_materialization_is_rejected(self):
        signed = copy.deepcopy(BASE)
        signed["browser_specific_settings"]["gecko"]["data_collection_permissions"] = {
            "required": ["websiteContent"]
        }
        with self.assertRaises(SystemExit):
            verify_manifest(copy.deepcopy(BASE), signed)

    def test_unrelated_manifest_change_is_rejected(self):
        signed = copy.deepcopy(BASE)
        signed["permissions"].append("cookies")
        with self.assertRaises(SystemExit):
            verify_manifest(copy.deepcopy(BASE), signed)


if __name__ == "__main__":
    unittest.main()
