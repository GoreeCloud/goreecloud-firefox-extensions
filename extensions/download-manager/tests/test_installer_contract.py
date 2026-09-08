import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
INSTALLER = ROOT / "scripts" / "install-native-host-linux.sh"


class InstallerContractTests(unittest.TestCase):
    def test_linux_installer_uses_durable_user_install_path(self):
        text = INSTALLER.read_text(encoding="utf-8")
        self.assertIn("$HOME/.local/lib/goreecloud-download-manager", text)
        self.assertIn("install -m 0755", text)
        self.assertIn("$HOME/.mozilla/native-messaging-hosts", text)
        self.assertIn("download-manager@goreecloud.com", text)

    def test_linux_installer_validates_native_version_protocol_and_capabilities(self):
        text = INSTALLER.read_text(encoding="utf-8")
        self.assertIn('EXPECTED_VERSION = "0.2.11"', text)
        self.assertIn("EXPECTED_PROTOCOL = 2", text)
        self.assertIn('value.get("protocolVersion")', text)
        self.assertIn("segmented-range-integrity", text)
        self.assertIn("same-job-recovery", text)
        self.assertIn("no-overwrite-publish", text)
        self.assertIn("ephemeral-request-headers", text)
        self.assertIn("staging-link-rejection", text)
        self.assertIn("Native host startup handshake", text)
        self.assertIn("Native host ping reply", text)
        self.assertIn("Native host version/protocol self-test: PASS", text)

    def test_linux_installer_has_flatpak_portal_diagnostics(self):
        text = INSTALLER.read_text(encoding="utf-8")
        self.assertIn("org.mozilla.firefox", text)
        self.assertIn("org.freedesktop.portal.WebExtensions", text)
        self.assertIn("widget.use-xdg-desktop-portal.native-messaging", text)


if __name__ == "__main__":
    unittest.main()
