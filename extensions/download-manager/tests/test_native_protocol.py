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
const context = {
  console,
  Number,
  String,
  Error,
  module: { exports: {} },
  exports: {}
};
context.globalThis = context;
vm.createContext(context);
vm.runInContext(code, context, { filename: "native_protocol.js" });
const api = context.GoreeCloudNativeProtocol;
assert.ok(api, "protocol API must be exported");
const capabilities = [...api.REQUIRED_CAPABILITIES];
'''
        result = subprocess.run(
            ["node", "-e", script + textwrap.dedent(body), str(PROTOCOL)],
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
            const result = api.validateNativeHello({
              type: "hello",
              version: "0.2.8",
              protocolVersion: 2,
              capabilities
            });
            assert.strictEqual(result.compatible, true);
            assert.strictEqual(result.helperVersion, "0.2.8");
            assert.strictEqual(result.protocolVersion, 2);
            assert.deepStrictEqual(Array.from(result.missingCapabilities), []);
            '''
        )

    def test_future_helper_on_same_protocol_is_accepted(self):
        self.run_node(
            r'''
            const result = api.validateNativeHello({
              type: "hello",
              version: "0.3.0",
              protocolVersion: 2,
              capabilities: [...capabilities, "future-capability"]
            });
            assert.strictEqual(result.compatible, true);
            assert.ok(result.capabilities.includes("future-capability"));
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
            '''
        )

    def test_old_helper_on_protocol_two_is_rejected(self):
        self.run_node(
            r'''
            const result = api.validateNativeHello({
              type: "hello",
              version: "0.2.7",
              protocolVersion: 2,
              capabilities
            });
            assert.strictEqual(result.compatible, false);
            assert.match(result.error, /older than the supported 0\.2\.8/);
            '''
        )

    def test_mismatched_protocol_is_rejected(self):
        self.run_node(
            r'''
            for (const protocolVersion of [1, 3, "3", -1, 2.5]) {
              const result = api.validateNativeHello({
                type: "hello",
                version: "9.9.9",
                protocolVersion,
                capabilities
              });
              assert.strictEqual(result.compatible, false);
              assert.strictEqual(result.requiredProtocolVersion, 2);
            }
            '''
        )

    def test_missing_required_capability_is_rejected(self):
        self.run_node(
            r'''
            const missing = capabilities.filter((item) => item !== "no-overwrite-publish");
            const result = api.validateNativeHello({
              type: "hello",
              version: "0.2.8",
              protocolVersion: 2,
              capabilities: missing
            });
            assert.strictEqual(result.compatible, false);
            assert.deepStrictEqual(Array.from(result.missingCapabilities), ["no-overwrite-publish"]);
            assert.match(result.error, /missing required capabilities/);
            '''
        )

    def test_capabilities_are_normalized_and_deduplicated(self):
        self.run_node(
            r'''
            const duplicated = [...capabilities, capabilities[0], "  future-capability  ", ""];
            const result = api.validateNativeHello({
              type: "hello",
              version: "0.2.8+test",
              protocolVersion: "2",
              capabilities: duplicated
            });
            assert.strictEqual(result.compatible, true);
            assert.strictEqual(result.capabilities.filter((item) => item === capabilities[0]).length, 1);
            assert.ok(result.capabilities.includes("future-capability"));
            '''
        )

    def test_invalid_handshake_is_rejected(self):
        self.run_node(
            r'''
            const result = api.validateNativeHello({
              type: "progress",
              version: "0.2.8",
              protocolVersion: 2,
              capabilities
            });
            assert.strictEqual(result.compatible, false);
            assert.match(result.error, /invalid handshake/);
            '''
        )


if __name__ == "__main__":
    unittest.main()
