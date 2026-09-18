import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import {
  PORTABILITY_FORMAT,
  PORTABILITY_MAX_BYTES,
  PortabilityError,
  buildImportPreview,
  canonicalJson,
  createBackupBundle,
  verifyBackupBundle
} from "../src/core/portability.js";

const digestHex = async (text) => createHash("sha256").update(text).digest("hex");

const states = {
  organizationalState: { schemaVersion: 1, revision: 2, tabSets: [{ id: "set-a" }], stashedItems: [{ id: "stash-a" }] },
  snoozeState: { schemaVersion: 1, revision: 3, items: [{ id: "snooze-a" }] },
  ruleState: { schemaVersion: 1, revision: 4, enabled: false, rules: [{ id: "rule-a" }] }
};

test("backup bundle is canonical, versioned, identity-bound, and integrity-checked", async () => {
  const bundle = await createBackupBundle({ extensionVersion: "0.1.10", exportedAt: 123, ...states }, { digestHex });
  assert.equal(bundle.format, PORTABILITY_FORMAT);
  assert.equal(bundle.schemaVersion, 1);
  assert.equal(bundle.source.geckoId, "advanced-tab-manager@goreecloud.com");
  assert.equal(bundle.integrity.algorithm, "SHA-256");
  const payload = await verifyBackupBundle(bundle, { digestHex });
  assert.equal(payload.stores.organizational.revision, 2);
});

test("canonical JSON is independent of object key insertion order", () => {
  assert.equal(canonicalJson({ b: 2, a: { d: 4, c: 3 } }), canonicalJson({ a: { c: 3, d: 4 }, b: 2 }));
});

test("backup verification rejects payload mutation", async () => {
  const bundle = await createBackupBundle({ extensionVersion: "0.1.10", exportedAt: 123, ...states }, { digestHex });
  bundle.stores.organizational.revision = 99;
  await assert.rejects(() => verifyBackupBundle(bundle, { digestHex }), (error) => error instanceof PortabilityError && error.code === "backup-integrity-mismatch");
});

test("backup verification rejects wrong extension identity", async () => {
  const bundle = await createBackupBundle({ extensionVersion: "0.1.10", exportedAt: 123, ...states }, { digestHex });
  bundle.source.geckoId = "other@example.com";
  bundle.integrity.digest = await digestHex(canonicalJson({
    format: bundle.format,
    schemaVersion: bundle.schemaVersion,
    exportedAt: bundle.exportedAt,
    source: bundle.source,
    stores: bundle.stores
  }));
  await assert.rejects(() => verifyBackupBundle(bundle, { digestHex }), (error) => error.code === "wrong-extension-identity");
});

test("import preview reports replacement scope without browsing content", () => {
  const preview = buildImportPreview({
    current: {
      organizational: { revision: 8, tabSets: [{ id: "set-a" }, { id: "set-b" }], stashedItems: [{ id: "stash-a" }], sessionSnapshots: [{ id: "snapshot-a" }] },
      snooze: { revision: 9, items: [{ id: "snooze-a" }] },
      rules: { revision: 10, rules: [{ id: "rule-a" }] }
    },
    imported: {
      organizational: { revision: 2, tabSets: [{ id: "set-a" }], stashedItems: [{ id: "stash-z" }], sessionSnapshots: [{ id: "snapshot-a" }, { id: "snapshot-b" }] },
      snooze: { revision: 3, items: [{ id: "snooze-a" }, { id: "snooze-b" }] },
      rules: { revision: 4, rules: [{ id: "rule-z" }] }
    }
  });
  assert.deepEqual(preview.expectedRevisions, { organizational: 8, snooze: 9, rules: 10 });
  assert.deepEqual(preview.importedCounts, { tabSets: 1, stashed: 1, sessionSnapshots: 2, snoozed: 2, rules: 1 });
  assert.deepEqual(preview.conflictCounts, { tabSets: 1, stashed: 0, sessionSnapshots: 1, snoozed: 1, rules: 0 });
  assert.equal(preview.willReplace, true);
  assert.equal(preview.opensTabs, false);
  assert.equal(JSON.stringify(preview).includes("http"), false);
});

test("backup size limit fails closed before integrity work", async () => {
  const oversized = { format: PORTABILITY_FORMAT, padding: "x".repeat(PORTABILITY_MAX_BYTES + 1) };
  await assert.rejects(() => verifyBackupBundle(oversized, { digestHex }), (error) => error.code === "backup-too-large");
});
