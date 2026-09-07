from pathlib import Path
import json
import unittest

ROOT = Path(__file__).resolve().parents[1]
REPO = ROOT.parents[1]


class SchedulerHardeningContractTests(unittest.TestCase):
    def test_manifest_loads_scheduler_hardening_after_protocol_background_and_recovery(self):
        manifest = json.loads((ROOT / "manifest.json").read_text())
        scripts = manifest["background"]["scripts"]
        self.assertEqual(
            scripts[:3],
            ["native_protocol.js", "background.js", "recovery.js"],
        )
        self.assertEqual(scripts[-1], "scheduler_hardening.js")

    def test_scheduler_hardening_source_and_node_regression_exist(self):
        self.assertTrue((ROOT / "scheduler_hardening.js").is_file())
        self.assertTrue((ROOT / "tests" / "test_browser_scheduler.js").is_file())

    def test_ci_executes_node_scheduler_regression(self):
        workflow = (REPO / ".github" / "workflows" / "firefox-repository.yml").read_text()
        self.assertIn(
            "node extensions/download-manager/tests/test_browser_scheduler.js",
            workflow,
        )


if __name__ == "__main__":
    unittest.main()
