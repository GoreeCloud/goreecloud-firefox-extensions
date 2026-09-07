import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
REPOSITORY_ROOT = ROOT.parents[1]
WORKFLOW = REPOSITORY_ROOT / ".github" / "workflows" / "download-manager-mozilla-signing.yml"
SMOKE = ROOT / "tests" / "signed_restart_smoke.py"
AMO_RECOVERY = ROOT / "tests" / "amo_signed_version_recovery.py"
SIGNING = ROOT / "SIGNING.md"
PLATFORM_REVIEW = ROOT / "PLATFORM_SYSTEM_RELEASE_REVIEW.md"


class SigningContractTests(unittest.TestCase):
    def test_signing_workflow_is_governed_and_unlisted(self):
        text = WORKFLOW.read_text(encoding="utf-8")
        self.assertIn("release/download-manager-signing", text)
        self.assertIn("AMO_JWT_ISSUER", text)
        self.assertIn("AMO_JWT_SECRET", text)
        self.assertIn("web-ext@10.5.0 sign", text)
        self.assertIn("--channel=unlisted", text)
        self.assertIn("download-manager@goreecloud.com", text)
        self.assertIn("META-INF/", text)
        self.assertIn("signed_restart_smoke.py", text)
        self.assertIn("download-manager-signing-evidence.json", text)
        self.assertIn("stablePromoted", text)

    def test_signing_branch_must_match_authoritative_main(self):
        text = WORKFLOW.read_text(encoding="utf-8")
        self.assertIn("git rev-parse origin/main", text)
        self.assertIn('if [[ "$GITHUB_SHA" != "$main_sha" ]]', text)

    def test_existing_signed_version_can_be_recovered_only_with_exact_payload_verification(self):
        workflow = WORKFLOW.read_text(encoding="utf-8")
        recovery = AMO_RECOVERY.read_text(encoding="utf-8")
        self.assertIn("already exists", workflow)
        self.assertIn("amo_signed_version_recovery.py", workflow)
        self.assertIn("/api/v5/addons/addon/", recovery)
        self.assertIn("AMO existing file is not approved/public", recovery)
        self.assertIn("AMO existing file is missing a SHA-256 hash", recovery)
        self.assertIn("signed XPI does not contain Mozilla signature metadata", workflow)
        self.assertIn("Mozilla-signed XPI payload inventory differs", workflow)
        self.assertIn("Mozilla-signed XPI changed runtime payload bytes", workflow)
        self.assertIn("signedPayloadMatchesCandidate", workflow)
        self.assertIn("mozillaSigningSource", workflow)
        self.assertIn("mozilla-signing-source.txt", workflow)
        self.assertIn("amo-existing-version-metadata.json", workflow)
        self.assertIn("amoExistingVersion", workflow)

    def test_existing_version_download_uses_authenticated_file_api_without_redirect_credential_forwarding(self):
        recovery = AMO_RECOVERY.read_text(encoding="utf-8")
        self.assertIn("/api/v4/file/{file_id}/", recovery)
        self.assertIn('"Authorization": f"JWT {token}"', recovery)
        self.assertIn("class NoRedirect", recovery)
        self.assertIn("X-Target-Digest", recovery)
        self.assertIn('mirror_request = Request(location, headers={"User-Agent": USER_AGENT})', recovery)
        self.assertNotIn(
            'mirror_request = Request(location, headers={"Authorization"',
            recovery,
        )
        self.assertIn("AMO signed-file hash mismatch", recovery)
        self.assertIn("AMO redirect X-Target-Digest mismatch", recovery)
        self.assertIn("authenticatedDownloadApi", recovery)

    def test_internal_certificate_flag_is_informational_not_ordinary_signing_gate(self):
        recovery = AMO_RECOVERY.read_text(encoding="utf-8")
        self.assertIn("internal-certificate flag (informational)", recovery)
        self.assertIn("is_mozilla_signed_extension", recovery)
        self.assertNotIn("AMO existing file is not marked Mozilla-signed", recovery)

    def test_signed_restart_smoke_requires_persistent_install_and_no_reinstall(self):
        text = SMOKE.read_text(encoding="utf-8")
        self.assertIn('EXPECTED_ADDON_ID = "download-manager@goreecloud.com"', text)
        self.assertIn("temporary=False", text)
        self.assertIn("install_addon", text)
        self.assertIn("install_addon() is intentionally", text)
        self.assertIn("signed extension survived full Firefox restart", text)
        self.assertIn("post-restart HTTP Range requests resumed inside preserved segments", text)
        self.assertIn("post-restart SHA-256 integrity", text)
        self.assertIn("post-restart native helper reconnect", text)

    def test_signing_and_platform_review_docs_preserve_release_boundary(self):
        signing = SIGNING.read_text(encoding="utf-8")
        review = PLATFORM_REVIEW.read_text(encoding="utf-8")
        self.assertIn("0.2.10", signing)
        self.assertIn("Mozilla-signed", signing)
        self.assertIn("not Stable", signing)
        for system in (
            "GoreeCloud Manager",
            "Privacy Shield",
            "Wardveil Security",
            "Everkeep",
            "Glaze UI",
            "GoreeCloud Mesh",
            "GoreeCloud Identity",
        ):
            self.assertIn(system, review)
        self.assertIn("does not claim platform integration", review)
        self.assertIn("Stable promotion remains gated", review)


if __name__ == "__main__":
    unittest.main()
