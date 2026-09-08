import importlib.util
import json
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
REPOSITORY_ROOT = ROOT.parents[1]
MANIFEST = ROOT / "manifest.json"
BACKGROUND = ROOT / "background.js"
OPTIONS = ROOT / "ui" / "options.js"
OPTIONS_HTML = ROOT / "ui" / "options.html"
HELPER = ROOT / "scripts" / "native-host" / "goreecloud_download_manager_native.py"
INVENTORY = REPOSITORY_ROOT / "docs" / "extension-inventory.json"

EXPECTED_CAPABILITIES = {
    "segmented-range-integrity",
    "same-job-recovery",
    "no-overwrite-publish",
    "ephemeral-request-headers",
    "staging-link-rejection",
}


class NativeProtocolContractTests(unittest.TestCase):
    def test_manifest_loads_protocol_contract_before_background(self):
        manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
        self.assertEqual(manifest["version"], "0.2.12")
        scripts = manifest["background"]["scripts"]
        self.assertGreaterEqual(len(scripts), 2)
        self.assertEqual(scripts[0], "native_protocol.js")
        self.assertEqual(scripts[1], "background.js")

    def test_background_enforces_protocol_gate_and_reports_status(self):
        text = BACKGROUND.read_text(encoding="utf-8")
        self.assertIn("GoreeCloudNativeProtocol?.validateNativeHello", text)
        self.assertIn("nativeLastHandshakeError", text)
        self.assertIn("helperVersion: nativeHandshake?.helperVersion", text)
        self.assertIn("protocolVersion: nativeHandshake?.protocolVersion", text)
        self.assertIn("compatible: false", text)

    def test_helper_hello_matches_protocol_contract(self):
        spec = importlib.util.spec_from_file_location("goreecloud_download_manager_native", HELPER)
        module = importlib.util.module_from_spec(spec)
        assert spec.loader is not None
        spec.loader.exec_module(module)
        hello = module.hello_message()
        self.assertEqual(module.VERSION, "0.2.11")
        self.assertEqual(module.PROTOCOL_VERSION, 2)
        self.assertEqual(hello["type"], "hello")
        self.assertEqual(hello["version"], "0.2.11")
        self.assertEqual(hello["protocolVersion"], 2)
        self.assertTrue(EXPECTED_CAPABILITIES.issubset(set(hello["capabilities"])))

    def test_settings_surfaces_helper_version_protocol_and_errors(self):
        text = OPTIONS.read_text(encoding="utf-8")
        self.assertIn("result.helperVersion", text)
        self.assertIn("result.protocolVersion", text)
        self.assertIn("result.error", text)
        self.assertIn("protocol ${protocol} ready", text)

    def test_packaged_settings_label_is_lifecycle_neutral(self):
        text = OPTIONS_HTML.read_text(encoding="utf-8")
        self.assertIn("GoreeCloud Download Manager Extension 0.2.12", text)
        self.assertNotIn("source candidate", text.lower())
        self.assertNotIn("not stable", text.lower())
        self.assertNotIn(">stable<", text.lower())

    def test_inventory_matches_manifest_version(self):
        manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
        inventory = json.loads(INVENTORY.read_text(encoding="utf-8"))
        record = next(item for item in inventory["extensions"] if item["slug"] == "download-manager")
        self.assertEqual(record["source_version"], manifest["version"])
        self.assertEqual(record["source_state"], "source-candidate")
        self.assertIsNone(record["accepted_stable_version"])


if __name__ == "__main__":
    unittest.main()
