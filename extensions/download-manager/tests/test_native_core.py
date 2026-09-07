import importlib.util
import tempfile
import unittest
from pathlib import Path
from unittest import mock

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location(
    "goreecloud_download_manager_native",
    ROOT / "scripts" / "native-host" / "goreecloud_download_manager_native.py",
)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)


class FakeResponse:
    def __init__(self, status=206, content_range="bytes 0-0/1"):
        self.status = status
        self.headers = {"Content-Range": content_range}


class FakeThread:
    def __init__(self, alive):
        self.alive = alive

    def is_alive(self):
        return self.alive


class FakeJob:
    def __init__(self, state="error", alive=False):
        self.last_state = state
        self.thread = FakeThread(alive)
        self.resume_count = 0
        self.emit_states = []

    def resume(self):
        self.resume_count += 1

    def emit(self, state):
        self.emit_states.append(state)


class NativeCoreTests(unittest.TestCase):
    def setUp(self):
        with mod.JOBS_LOCK:
            mod.JOBS.clear()
        with mod.DESTINATION_LOCK:
            mod.DESTINATION_RESERVATIONS.clear()

    def tearDown(self):
        with mod.JOBS_LOCK:
            mod.JOBS.clear()
        with mod.DESTINATION_LOCK:
            mod.DESTINATION_RESERVATIONS.clear()

    def test_validate_download_url_restricts_native_transport(self):
        self.assertEqual(
            mod.validate_download_url("https://example.com/file.bin"),
            "https://example.com/file.bin",
        )
        for value in ("file:///etc/passwd", "ftp://example.com/file", "javascript:alert(1)", "https:///missing-host"):
            with self.subTest(value=value):
                with self.assertRaises(ValueError):
                    mod.validate_download_url(value)

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

    def test_filtered_request_headers_rejects_newlines_and_oversize_values(self):
        self.assertEqual(
            mod.filtered_request_headers({"Cookie": "x=1\r\nX-Evil: yes"}),
            {},
        )
        self.assertEqual(
            mod.filtered_request_headers({"Cookie": "x" * (64 * 1024 + 1)}),
            {},
        )

    def test_safe_job_id(self):
        self.assertEqual(mod.safe_job_id("../../job id"), ".._.._job_id")

    def test_source_url_change_invalidates_staged_parts(self):
        with tempfile.TemporaryDirectory() as tmp:
            job = mod.DownloadJob({
                "jobId": "job-source-change",
                "url": "https://example.test/new.bin",
                "directory": tmp,
            })
            metadata = {
                "url": "https://example.test/old.bin",
                "size": 1024,
                "etag": '"same"',
                "last_modified": "Mon, 01 Jan 2024 00:00:00 GMT",
            }
            info = {
                "size": 1024,
                "etag": '"same"',
                "last_modified": "Mon, 01 Jan 2024 00:00:00 GMT",
            }
            self.assertTrue(job.source_changed(metadata, info))

    def test_content_range_parser_and_exact_partial_validation(self):
        self.assertEqual(mod.parse_content_range("bytes 10-19/100"), (10, 19, 100))
        self.assertIsNone(mod.parse_content_range("bytes 20-10/100"))
        self.assertIsNone(mod.parse_content_range("not-a-range"))

        response = FakeResponse(content_range="bytes 10-19/100")
        self.assertEqual(
            mod.validate_partial_response(response, 10, 19, 100),
            (10, 19, 100),
        )

        for bad in (
            FakeResponse(status=200, content_range="bytes 10-19/100"),
            FakeResponse(content_range="bytes 11-19/100"),
            FakeResponse(content_range="bytes 10-18/100"),
            FakeResponse(content_range="bytes 10-19/101"),
            FakeResponse(content_range=""),
        ):
            with self.subTest(status=bad.status, content_range=bad.headers.get("Content-Range")):
                with self.assertRaises(RuntimeError):
                    mod.validate_partial_response(bad, 10, 19, 100)

    def test_destination_reservations_prevent_parallel_same_name_race(self):
        with tempfile.TemporaryDirectory() as tmp:
            requested = Path(tmp) / "same.bin"
            first = mod.reserve_unique_path(requested, "job-a")
            second = mod.reserve_unique_path(requested, "job-b")
            self.assertEqual(first, requested)
            self.assertNotEqual(second, requested)
            self.assertEqual(second.name, "same (1).bin")
            mod.release_destination("job-a", first)
            mod.release_destination("job-b", second)

    def test_final_commit_does_not_overwrite_external_collision(self):
        with tempfile.TemporaryDirectory() as tmp:
            directory = Path(tmp)
            job = mod.DownloadJob({
                "jobId": "job-commit",
                "url": "https://example.test/file.bin",
                "directory": tmp,
                "filename": "file.bin",
            })
            job.filename = "file.bin"
            job.destination = mod.reserve_unique_path(directory / job.filename, job.id)
            job.staging.mkdir(parents=True, exist_ok=True)
            part = job.single_part_path()
            part.write_bytes(b"new-download")

            # Simulate another process creating the selected destination after
            # GoreeCloud reserved it but before the transfer commits.
            job.destination.write_bytes(b"preexisting")
            committed = job.commit_staged_file(part)

            self.assertEqual((directory / "file.bin").read_bytes(), b"preexisting")
            self.assertNotEqual(committed, directory / "file.bin")
            self.assertEqual(committed.read_bytes(), b"new-download")
            self.assertFalse(part.exists())

    def test_resume_restarts_dead_error_job_with_same_id(self):
        existing = FakeJob(state="error", alive=False)
        with mod.JOBS_LOCK:
            mod.JOBS["same-id"] = existing
        message = {
            "type": "resume",
            "jobId": "same-id",
            "url": "https://example.test/file.bin",
        }
        with mock.patch.object(mod, "start_job", return_value=("replacement", True)) as start:
            result = mod.resume_job(message)
        self.assertEqual(result, ("replacement", True))
        start.assert_called_once_with(message, replace_existing=True)
        self.assertEqual(existing.resume_count, 0)

    def test_resume_live_job_is_idempotent_and_does_not_spawn_duplicate(self):
        existing = FakeJob(state="paused", alive=True)
        with mod.JOBS_LOCK:
            mod.JOBS["same-id"] = existing
        message = {
            "type": "resume",
            "jobId": "same-id",
            "url": "https://example.test/file.bin",
        }
        with mock.patch.object(mod, "start_job") as start:
            result = mod.resume_job(message)
        self.assertEqual(result, (existing, False))
        self.assertEqual(existing.resume_count, 1)
        start.assert_not_called()

    def test_resume_does_not_restart_completed_or_cancelled_job(self):
        for state in ("complete", "cancelled"):
            with self.subTest(state=state):
                existing = FakeJob(state=state, alive=False)
                with mod.JOBS_LOCK:
                    mod.JOBS.clear()
                    mod.JOBS["terminal-id"] = existing
                message = {
                    "type": "resume",
                    "jobId": "terminal-id",
                    "url": "https://example.test/file.bin",
                }
                with mock.patch.object(mod, "start_job") as start:
                    result = mod.resume_job(message)
                self.assertEqual(result, (existing, False))
                self.assertEqual(existing.emit_states, [state])
                start.assert_not_called()

    def test_duplicate_start_does_not_replace_existing_job(self):
        existing = FakeJob(state="error", alive=False)
        with mod.JOBS_LOCK:
            mod.JOBS["duplicate"] = existing
        message = {
            "type": "start",
            "jobId": "duplicate",
            "url": "https://example.test/file.bin",
        }
        with mock.patch.object(mod, "DownloadJob") as constructor:
            job, started = mod.start_job(message)
        self.assertIs(job, existing)
        self.assertFalse(started)
        constructor.assert_not_called()


if __name__ == "__main__":
    unittest.main()
