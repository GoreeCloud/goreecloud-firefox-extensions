import subprocess
import textwrap
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PROTOCOL = ROOT / "native_protocol.js"


class NativeProtocolTests(unittest.TestCase):
    def run_node(self, body: str):
        script = r'''
const fs = require("fs");
const vm = require("vm");
const assert = require("assert");
const code = fs.readFileSync(process.argv[1], "utf8");
let forwarded = [];
let rejected = null;
const context = {
  console,
  Number,
  String,
  Error,
  module: { exports: {} },
  exports: {},
  nativeReady: false,
  nativeReadyReject: (error) => { rejected = error; },
  onNativeMessage: async (message) => {
    forwarded.push(message);
    if (message?.type === "hello") context.nativeReady = true;
  }
};
context.globalThis = context;
vm.createContext(context);
vm.runInContext(code, context, { filename: "native_protocol.js" });
const api = context.GoreeCloudNativeProtocol;
assert.ok(api, "protocol API must be exported");
(async () => {
'''
        trailer = r'''
})().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
'''
        result = subprocess.run(
            ["node", "-e", script + textwrap.dedent(body) + trailer, str(PROTOCOL)],
            cwd=ROOT,
            text=True,
            capture_output=True,
            check=False,
        )
        if result.returncode != 0:
            self.fail(f"Node protocol test failed:\nSTDOUT:\n{result.stdout}\nSTDERR:\n{result.stderr}")

    def test_compatible_protocol_two_hello_passes(self):
        self.run_node(
            r'''
            const result = api.validateNativeHello({ type: "hello", version: "0.2.8", protocolVersion: 2 });
            assert.strictEqual(result.compatible, true);
            assert.strictEqual(result.helperVersion, "0.2.8");
            assert.strictEqual(result.protocolVersion, 2);
            await context.onNativeMessage({ type: "hello", version: "0.2.8", protocolVersion: 2 });
            assert.strictEqual(context.nativeReady, true);
            assert.strictEqual(forwarded.length, 1);
            assert.strictEqual(rejected, null);
            '''
        )

    def test_legacy_helper_without_protocol_is_rejected(self):
        self.run_node(
            r'''
            const result = api.validateNativeHello({ type: "hello", version: "0.2.7" });
            assert.strictEqual(result.compatible, false);
            assert.strictEqual(result.protocolVersion, null);
            assert.match(result.error, /legacy\/unknown/);
            assert.match(result.error, /required 2/);
            await context.onNativeMessage({ type: "hello", version: "0.2.7" });
            assert.strictEqual(context.nativeReady, false);
            assert.strictEqual(forwarded.length, 0);
            assert.ok(rejected instanceof Error);
            assert.match(rejected.message, /incompatible/);
            '''
        )

    def test_mismatched_protocol_is_rejected(self):
        self.run_node(
            r'''
            for (const protocolVersion of [1, 3, "3", -1, 2.5]) {
              const result = api.validateNativeHello({ type: "hello", version: "9.9.9", protocolVersion });
              assert.strictEqual(result.compatible, false);
              assert.strictEqual(result.requiredProtocolVersion, 2);
            }
            '''
        )

    def test_invalid_handshake_is_rejected(self):
        self.run_node(
            r'''
            const result = api.validateNativeHello({ type: "progress", version: "0.2.8", protocolVersion: 2 });
            assert.strictEqual(result.compatible, false);
            assert.match(result.error, /invalid handshake/);
            '''
        )


if __name__ == "__main__":
    unittest.main()
