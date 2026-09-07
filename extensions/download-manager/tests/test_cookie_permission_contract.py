import json
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


class CookiePermissionContractTests(unittest.TestCase):
    def test_permission_request_is_directly_bound_to_settings_click(self):
        source = (ROOT / "ui" / "options.js").read_text(encoding="utf-8")
        self.assertIn('$("#grantCookies").addEventListener("click", () => {', source)
        self.assertIn("browser.permissions.request(COOKIE_PERMISSION)", source)
        self.assertNotIn('runtime.sendMessage({ type: "request-cookie-permission"', source)

    def test_cookie_permission_remains_optional(self):
        manifest = json.loads((ROOT / "manifest.json").read_text(encoding="utf-8"))
        self.assertIn("cookies", manifest.get("optional_permissions", []))
        self.assertIn("<all_urls>", manifest.get("optional_host_permissions", []))
        self.assertNotIn("cookies", manifest.get("permissions", []))

    def test_save_does_not_attempt_to_request_permission_after_await(self):
        source = (ROOT / "ui" / "options.js").read_text(encoding="utf-8")
        save_block = source.split('$("#save").addEventListener', 1)[1]
        self.assertNotIn("browser.permissions.request", save_block)
        self.assertIn("Cookie forwarding was not saved", save_block)


if __name__ == "__main__":
    unittest.main()
