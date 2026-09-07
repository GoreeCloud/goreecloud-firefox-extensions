import importlib.util
import os
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location(
    "goreecloud_download_manager_native_link_safety",
    ROOT / "scripts" / "native-host" / "goreecloud_download_manager_native.py",
)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)


@unittest.skipUnless(hasattr(os, "symlink"), "symbolic links are not available")
class StagingLinkSafetyTests(unittest.TestCase):
    def make_job(self, directory, job_id="link-safety"):
        return mod.DownloadJob({
            "jobId": job_id,
            "url": "https://example.test/file.bin",
            "directory": str(directory),
            "filename": "file.bin",
        })

    def test_staging_root_symlink_is_rejected(self):
        with tempfile.TemporaryDirectory() as tmp, tempfile.TemporaryDirectory() as outside:
            directory = Path(tmp)
            os.symlink(outside, directory / ".goreecloud-downloads")
            job = self.make_job(directory)
            with self.assertRaisesRegex(RuntimeError, "symbolic-link staging root"):
                job.ensure_staging_directory()

    def test_job_staging_directory_symlink_is_rejected(self):
        with tempfile.TemporaryDirectory() as tmp, tempfile.TemporaryDirectory() as outside:
            directory = Path(tmp)
            root = directory / ".goreecloud-downloads"
            root.mkdir()
            job = self.make_job(directory)
            os.symlink(outside, job.staging)
            with self.assertRaisesRegex(RuntimeError, "symbolic-link job staging directory"):
                job.ensure_staging_directory()

    def test_metadata_symlink_is_rejected_without_reading_target(self):
        with tempfile.TemporaryDirectory() as tmp:
            directory = Path(tmp)
            job = self.make_job(directory)
            job.ensure_staging_directory()
            outside = directory / "outside-metadata.json"
            outside.write_text('{"secret":"must-not-be-trusted"}', encoding="utf-8")
            os.symlink(outside, job.metadata_path)
            with self.assertRaisesRegex(RuntimeError, "symbolic-link metadata.json"):
                job.load_metadata()
            self.assertEqual(outside.read_text(encoding="utf-8"), '{"secret":"must-not-be-trusted"}')

    def test_partial_symlink_is_rejected_without_touching_target(self):
        with tempfile.TemporaryDirectory() as tmp:
            directory = Path(tmp)
            job = self.make_job(directory)
            job.ensure_staging_directory()
            outside = directory / "outside.bin"
            outside.write_bytes(b"external-content")
            part = job.single_part_path()
            os.symlink(outside, part)
            with self.assertRaisesRegex(RuntimeError, "symbolic-link staging file"):
                job.staging_size(part)
            self.assertEqual(outside.read_bytes(), b"external-content")

    def test_clear_staging_unlinks_link_entry_not_target(self):
        with tempfile.TemporaryDirectory() as tmp:
            directory = Path(tmp)
            job = self.make_job(directory)
            job.ensure_staging_directory()
            outside = directory / "outside.bin"
            outside.write_bytes(b"external-content")
            part = job.segment_part_path(0)
            os.symlink(outside, part)
            job.clear_staging_parts()
            self.assertFalse(part.exists())
            self.assertEqual(outside.read_bytes(), b"external-content")

    def test_commit_rejects_symlink_staging_source(self):
        with tempfile.TemporaryDirectory() as tmp:
            directory = Path(tmp)
            job = self.make_job(directory)
            job.ensure_staging_directory()
            outside = directory / "outside.bin"
            outside.write_bytes(b"external-content")
            part = job.single_part_path()
            os.symlink(outside, part)
            job.filename = "file.bin"
            job.destination = mod.reserve_unique_path(directory / job.filename, job.id)
            try:
                with self.assertRaisesRegex(RuntimeError, "symbolic-link completed staging file"):
                    job.commit_staged_file(part)
                self.assertEqual(outside.read_bytes(), b"external-content")
                self.assertFalse((directory / "file.bin").exists())
            finally:
                mod.release_destination(job.id, job.destination)

    def test_normal_regular_staging_file_remains_supported(self):
        with tempfile.TemporaryDirectory() as tmp:
            directory = Path(tmp)
            job = self.make_job(directory)
            job.ensure_staging_directory()
            part = job.single_part_path()
            with mod.open_nofollow(part, "wb") as stream:
                stream.write(b"safe")
            self.assertEqual(job.staging_size(part), 4)
            self.assertEqual(part.read_bytes(), b"safe")


if __name__ == "__main__":
    unittest.main()
