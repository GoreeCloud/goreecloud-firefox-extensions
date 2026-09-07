import hashlib
import importlib.util
import json
import tempfile
import threading
import unittest
import urllib.request
from http.server import ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SERVER_PATH = ROOT / "concurrency_test_server.py"
SPEC = importlib.util.spec_from_file_location("concurrency_test_server", SERVER_PATH)
MODULE = importlib.util.module_from_spec(SPEC)
assert SPEC and SPEC.loader
SPEC.loader.exec_module(MODULE)


class ConcurrencyServerTests(unittest.TestCase):
    def test_parse_range(self):
        self.assertEqual(MODULE.parse_range("bytes=0-99", 1000), (0, 99))
        self.assertEqual(MODULE.parse_range("bytes=900-", 1000), (900, 999))
        self.assertEqual(MODULE.parse_range("bytes=-100", 1000), (900, 999))
        self.assertIsNone(MODULE.parse_range(None, 1000))
        with self.assertRaises(ValueError):
            MODULE.parse_range("bytes=1000-1001", 1000)
        with self.assertRaises(ValueError):
            MODULE.parse_range("bytes=0-1,4-5", 1000)

    def test_head_range_and_status_endpoints(self):
        MODULE.reset_counters()
        with tempfile.TemporaryDirectory() as tmpdir:
            payload = Path(tmpdir) / "payload.bin"
            payload.write_bytes(b"\0" * (1024 * 1024))
            sha256 = hashlib.sha256(payload.read_bytes()).hexdigest()

            server = ThreadingHTTPServer(("127.0.0.1", 0), MODULE.Handler)
            server.payload = payload
            server.payload_size = payload.stat().st_size
            server.payload_sha256 = sha256
            thread = threading.Thread(target=server.serve_forever, daemon=True)
            thread.start()
            base = f"http://127.0.0.1:{server.server_address[1]}"
            try:
                request = urllib.request.Request(
                    f"{base}/goreecloud-concurrency-01.bin",
                    method="HEAD",
                )
                with urllib.request.urlopen(request, timeout=3) as response:
                    self.assertEqual(response.status, 200)
                    self.assertEqual(response.headers["Accept-Ranges"], "bytes")
                    self.assertEqual(int(response.headers["Content-Length"]), 1024 * 1024)

                request = urllib.request.Request(
                    f"{base}/goreecloud-concurrency-01.bin",
                    headers={"Range": "bytes=0-1023"},
                )
                with urllib.request.urlopen(request, timeout=3) as response:
                    self.assertEqual(response.status, 206)
                    self.assertEqual(response.headers["Content-Range"], "bytes 0-1023/1048576")
                    self.assertEqual(len(response.read()), 1024)

                with urllib.request.urlopen(f"{base}/status", timeout=3) as response:
                    status = json.load(response)
                self.assertGreaterEqual(status["peakRequests"], 1)
                self.assertEqual(
                    status["requestCounts"].get("/goreecloud-concurrency-01.bin"),
                    1,
                )

                with urllib.request.urlopen(f"{base}/reset", timeout=3) as response:
                    self.assertTrue(json.load(response)["reset"])
                with urllib.request.urlopen(f"{base}/status", timeout=3) as response:
                    status = json.load(response)
                self.assertEqual(status["activeRequests"], 0)
                self.assertEqual(status["peakRequests"], 0)
                self.assertEqual(status["requestCounts"], {})
            finally:
                server.shutdown()
                server.server_close()
                thread.join(timeout=3)


if __name__ == "__main__":
    unittest.main()
