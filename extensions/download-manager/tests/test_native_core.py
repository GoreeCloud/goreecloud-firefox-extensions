import importlib.util
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location(
    "goreecloud_download_manager_native",
    ROOT / "scripts" / "native-host" / "goreecloud_download_manager_native.py",
)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)


class NativeCoreTests(unittest.TestCase):
    def test_safe_filename(self):
        self.assertEqual(mod.safe_filename('../bad:name?.zip'), 'bad_name_.zip')

    def test_name_from_url(self):
        self.assertEqual(
            mod.name_from_url('https://example.com/files/test%20file.iso'),
            'test file.iso',
        )

    def test_filtered_request_headers_only_allows_bounded_headers(self):
        headers = mod.filtered_request_headers({
            "Cookie": "session=abc",
            "Referer": "https://example.com/page",
            "Authorization": "Bearer secret",
            "X-Test": "no",
        })
        self.assertEqual(headers, {
            "Cookie": "session=abc",
            "Referer": "https://example.com/page",
        })

    def test_filtered_request_headers_rejects_newlines(self):
        self.assertEqual(
            mod.filtered_request_headers({"Cookie": "x=1\r\nX-Evil: yes"}),
            {},
        )

    def test_safe_job_id(self):
        self.assertEqual(mod.safe_job_id("../../job id"), ".._.._job_id")


if __name__ == "__main__":
    unittest.main()
