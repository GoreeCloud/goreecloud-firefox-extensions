import subprocess
import textwrap
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RECOVERY = ROOT / "recovery.js"


class RecoveryControllerTests(unittest.TestCase):
    def run_node(self, body: str):
        harness = r'''
const fs = require("fs");
const vm = require("vm");
const assert = require("assert");
const code = fs.readFileSync(process.argv[1], "utf8");
let jobs = new Map();
let pumpCount = 0;
let readyCount = 0;
let fallbackLaunchCount = 0;
let nativeLaunchCount = 0;
let failReady = false;
let failNativeLaunch = false;
let messageListener = null;
let startupListener = null;
let queuedMicrotask = null;
const context = {
  console,
  Date,
  Promise,
  Set,
  String,
  queueMicrotask: (callback) => { queuedMicrotask = callback; },
  browser: {
    runtime: {
      onMessage: { addListener: (listener) => { messageListener = listener; } },
      onStartup: { addListener: (listener) => { startupListener = listener; } }
    }
  },
  getJob: async (id) => jobs.get(id) || null,
  updateJob: async (id, patch) => {
    const next = { ...(jobs.get(id) || { id }), ...patch };
    jobs.set(id, next);
    return next;
  },
  rawJobs: async () => [...jobs.values()],
  readyNativePort: async () => {
    readyCount += 1;
    if (failReady) throw new Error("host unavailable");
    return {};
  },
  pumpQueue: () => {
    pumpCount += 1;
    return Promise.resolve();
  },
  launchJob: async () => {
    fallbackLaunchCount += 1;
    return "compatibility-fallback";
  },
  launchNativeJob: async () => {
    nativeLaunchCount += 1;
    if (failNativeLaunch) throw new Error("native launch failed");
    return "native-launch";
  }
};
vm.createContext(context);
vm.runInContext(code, context, { filename: "recovery.js" });
assert.ok(messageListener, "recover-job listener must register");
assert.ok(startupListener, "startup recovery listener must register");
assert.ok(queuedMicrotask, "background-context recovery must register");
(async () => {
'''
        trailer = r'''
})().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
'''
        script = harness + textwrap.dedent(body) + trailer
        result = subprocess.run(
            ["node", "-e", script, str(RECOVERY)],
            cwd=ROOT,
            text=True,
            capture_output=True,
            check=False,
        )
        if result.returncode != 0:
            self.fail(f"Node recovery test failed:\nSTDOUT:\n{result.stdout}\nSTDERR:\n{result.stderr}")

    def test_interrupted_native_job_recovers_same_id_and_progress(self):
        self.run_node(
            r'''
            jobs.set("native-1", {
              id: "native-1", url: "https://example.test/file.bin",
              state: "interrupted", native: true, nativeStarted: true,
              engine: "native", bytesReceived: 123456, totalBytes: 999999,
              segments: 8, directory: "/tmp/downloads"
            });
            const result = await messageListener({ type: "recover-job", id: "native-1" });
            assert.strictEqual(result, true);
            const job = jobs.get("native-1");
            assert.strictEqual(job.id, "native-1");
            assert.strictEqual(job.state, "queued");
            assert.strictEqual(job.engine, "native");
            assert.strictEqual(job.nativeStarted, true);
            assert.strictEqual(job.bytesReceived, 123456);
            assert.strictEqual(job.segments, 8);
            assert.strictEqual(job.directory, "/tmp/downloads");
            assert.strictEqual(readyCount, 1);
            assert.strictEqual(pumpCount, 1);
            '''
        )

    def test_browser_job_is_not_recovered_as_native(self):
        self.run_node(
            r'''
            jobs.set("browser-1", {
              id: "browser-1", state: "interrupted", native: false,
              nativeStarted: false, engine: "browser"
            });
            const result = await messageListener({ type: "recover-job", id: "browser-1" });
            assert.strictEqual(result, false);
            assert.strictEqual(jobs.get("browser-1").state, "interrupted");
            assert.strictEqual(readyCount, 0);
            assert.strictEqual(pumpCount, 0);
            '''
        )

    def test_unavailable_host_keeps_same_native_job_interrupted(self):
        self.run_node(
            r'''
            failReady = true;
            jobs.set("native-2", {
              id: "native-2", state: "interrupted", native: true,
              nativeStarted: true, engine: "native", bytesReceived: 42
            });
            const result = await messageListener({ type: "recover-job", id: "native-2" });
            assert.strictEqual(result, false);
            const job = jobs.get("native-2");
            assert.strictEqual(job.id, "native-2");
            assert.strictEqual(job.state, "interrupted");
            assert.strictEqual(job.bytesReceived, 42);
            assert.match(job.error, /Native recovery unavailable/);
            assert.strictEqual(pumpCount, 0);
            '''
        )

    def test_stale_active_native_job_requeues_on_background_start(self):
        self.run_node(
            r'''
            jobs.set("stale-native", {
              id: "stale-native", state: "downloading", native: true,
              nativeStarted: true, engine: "native", bytesReceived: 7654321
            });
            jobs.set("paused-native", {
              id: "paused-native", state: "paused", native: true,
              nativeStarted: true, engine: "native", bytesReceived: 100
            });
            await startupListener();
            const stale = jobs.get("stale-native");
            assert.strictEqual(stale.id, "stale-native");
            assert.strictEqual(stale.state, "queued");
            assert.strictEqual(stale.bytesReceived, 7654321);
            assert.strictEqual(jobs.get("paused-native").state, "paused");
            assert.strictEqual(readyCount, 1);
            assert.strictEqual(pumpCount, 1);
            '''
        )

    def test_recovering_native_job_never_silently_falls_back(self):
        self.run_node(
            r'''
            failNativeLaunch = true;
            const recovering = {
              id: "native-recovery-race",
              state: "queued",
              engine: "native",
              native: true,
              nativeStarted: true
            };
            await assert.rejects(
              () => context.launchJob(recovering, {}),
              /native launch failed/
            );
            assert.strictEqual(nativeLaunchCount, 1);
            assert.strictEqual(fallbackLaunchCount, 0);
            '''
        )

    def test_new_native_job_keeps_compatibility_fallback(self):
        self.run_node(
            r'''
            const fresh = {
              id: "native-new",
              state: "queued",
              engine: "native",
              native: true,
              nativeStarted: false
            };
            const result = await context.launchJob(fresh, {});
            assert.strictEqual(result, "compatibility-fallback");
            assert.strictEqual(nativeLaunchCount, 0);
            assert.strictEqual(fallbackLaunchCount, 1);
            '''
        )


if __name__ == "__main__":
    unittest.main()
