import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { createPortabilityManager } from "../src/background/portability.js";

const digestHex = async (text) => createHash("sha256").update(text).digest("hex");

function fakeStorage(initial = {}, { corruptAfterSet = false } = {}) {
  const data = structuredClone(initial);
  let corrupt = corruptAfterSet;
  return {
    data,
    async get(key) {
      if (typeof key === "string") return key in data ? { [key]: structuredClone(data[key]) } : {};
      return structuredClone(data);
    },
    async set(values) {
      Object.assign(data, structuredClone(values));
      if (corrupt) {
        corrupt = false;
        const key = "goreecloud.advancedTabManager.persistentState.v1";
        if (data[key]) data[key].revision += 99;
      }
    },
    async remove(keys) {
      for (const key of Array.isArray(keys) ? keys : [keys]) delete data[key];
    }
  };
}

const ORG = "goreecloud.advancedTabManager.persistentState.v1";
const SNOOZE = "goreecloud.advancedTabManager.snoozeState.v1";
const RULES = "goreecloud.advancedTabManager.ruleState.v1";

function initialState() {
  return {
    [ORG]: {
      schemaVersion: 1, revision: 5,
      tabSets: [{ id: "old-set", name: "Saved", createdAt: 10, updatedAt: 10, groups: [], items: [], activeItemId: null }],
      stashedItems: [{ id: "old-stash", url: "https://example.com/stash", title: "Stash", pinned: false, createdAt: 10, treeParentLogicalId: null, nativeGroup: null }]
    },
    [SNOOZE]: {
      schemaVersion: 1, revision: 6,
      items: [{ id: "old-snooze", url: "https://example.com/snooze", title: "Snooze", pinned: false, createdAt: 10, wakeAt: 20, treeParentLogicalId: null, nativeGroup: null }]
    },
    [RULES]: {
      schemaVersion: 1, revision: 7, enabled: false,
      rules: [{ id: "old-rule", name: "Rule", enabled: true, priority: 0, createdAt: 10, updatedAt: 10, conditions: [{ field: "hostname", operator: "equals", value: "example.com" }], actions: ["mute"] }]
    }
  };
}

function managerFor(storage, overrides = {}) {
  const changes = [];
  return {
    changes,
    manager: createPortabilityManager({
      browser: { storage: { local: storage } },
      getManifest: () => ({ version: "0.1.9" }),
      reconcileSnoozeAlarms: overrides.reconcileSnoozeAlarms || (async () => ({ ok: true })),
      broadcastChange: (reason) => changes.push(reason),
      now: () => 1700000000000,
      digestHex
    })
  };
}

test("export and preview preserve state but reveal only counts and conflicts", async () => {
  const storage = fakeStorage(initialState());
  const { manager } = managerFor(storage);
  const exported = await manager.exportBackup();
  assert.equal(exported.ok, true);
  assert.match(exported.filename, /^goreecloud-advanced-tab-manager-backup-/);
  const preview = await manager.previewImport(exported.bundle);
  assert.equal(preview.ok, true);
  assert.deepEqual(preview.preview.expectedRevisions, { organizational: 5, snooze: 6, rules: 7 });
  assert.deepEqual(preview.preview.conflictCounts, { tabSets: 1, stashed: 1, snoozed: 1, rules: 1 });
  assert.equal(JSON.stringify(preview.preview).includes("old-set"), false);
});

test("apply replaces all stores together and advances local revisions", async () => {
  const source = fakeStorage(initialState());
  const { manager: sourceManager } = managerFor(source);
  const exported = await sourceManager.exportBackup();

  const target = fakeStorage({
    [ORG]: { schemaVersion: 1, revision: 10, tabSets: [], stashedItems: [] },
    [SNOOZE]: { schemaVersion: 1, revision: 11, items: [] },
    [RULES]: { schemaVersion: 1, revision: 12, enabled: true, rules: [] }
  });
  const { manager, changes } = managerFor(target);
  const preview = await manager.previewImport(exported.bundle);
  const applied = await manager.applyImport(exported.bundle, preview.preview.expectedRevisions);
  assert.equal(applied.ok, true);
  assert.deepEqual(applied.revisions, { organizational: 11, snooze: 12, rules: 13 });
  assert.equal(target.data[ORG].tabSets[0].id, "old-set");
  assert.deepEqual(changes, ["portability-import-applied"]);
});

test("apply fails closed when state changes after preview", async () => {
  const storage = fakeStorage(initialState());
  const { manager } = managerFor(storage);
  const exported = await manager.exportBackup();
  const preview = await manager.previewImport(exported.bundle);
  storage.data[ORG].revision += 1;
  const applied = await manager.applyImport(exported.bundle, preview.preview.expectedRevisions);
  assert.deepEqual(applied, { ok: false, reason: "state-changed-since-preview" });
});

test("readback verification failure restores exact prior records", async () => {
  const goodSource = fakeStorage(initialState());
  const { manager: sourceManager } = managerFor(goodSource);
  const exported = await sourceManager.exportBackup();

  const before = initialState();
  const target = fakeStorage(before, { corruptAfterSet: true });
  const { manager } = managerFor(target);
  const preview = await manager.previewImport(exported.bundle);
  const applied = await manager.applyImport(exported.bundle, preview.preview.expectedRevisions);
  assert.equal(applied.ok, false);
  assert.equal(applied.reason, "import-verification-failed");
  assert.equal(applied.rolledBack, true);
  assert.deepEqual(target.data, before);
});

test("snooze reconciliation failure rolls storage back and reconciles previous alarms", async () => {
  const source = fakeStorage(initialState());
  const { manager: sourceManager } = managerFor(source);
  const exported = await sourceManager.exportBackup();
  const targetBefore = {
    [ORG]: { schemaVersion: 1, revision: 20, tabSets: [], stashedItems: [] },
    [SNOOZE]: { schemaVersion: 1, revision: 21, items: [] },
    [RULES]: { schemaVersion: 1, revision: 22, enabled: false, rules: [] }
  };
  const target = fakeStorage(targetBefore);
  let calls = 0;
  const { manager } = managerFor(target, { reconcileSnoozeAlarms: async () => ({ ok: ++calls > 1 }) });
  const preview = await manager.previewImport(exported.bundle);
  const applied = await manager.applyImport(exported.bundle, preview.preview.expectedRevisions);
  assert.equal(applied.ok, false);
  assert.equal(applied.reason, "snooze-reconciliation-failed");
  assert.equal(applied.rolledBack, true);
  assert.equal(applied.alarmsRestored, true);
  assert.deepEqual(target.data, targetBefore);
});
