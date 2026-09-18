import assert from "node:assert/strict";
import test from "node:test";

import { createPortabilityManager } from "../src/background/portability.js";
import { PERSISTENT_STATE_KEY, createEmptyPersistentState } from "../src/core/persistent-state.js";
import { SNOOZE_STATE_KEY, createEmptySnoozeState } from "../src/core/snooze-store.js";
import { RULE_STATE_KEY, createEmptyRuleState } from "../src/core/rule-state.js";

function clone(value) { return JSON.parse(JSON.stringify(value)); }

function createStorage(initial = {}) {
  const data = clone(initial);
  return {
    local: {
      async get(keys) {
        const list = Array.isArray(keys) ? keys : [keys];
        const result = {};
        for (const key of list) if (Object.prototype.hasOwnProperty.call(data, key)) result[key] = clone(data[key]);
        return result;
      },
      async set(values) { Object.assign(data, clone(values)); },
      async remove(keys) { for (const key of Array.isArray(keys) ? keys : [keys]) delete data[key]; }
    },
    data
  };
}

function seeded() {
  return {
    [PERSISTENT_STATE_KEY]: { ...createEmptyPersistentState(), revision: 2 },
    [SNOOZE_STATE_KEY]: { ...createEmptySnoozeState(), revision: 3 },
    [RULE_STATE_KEY]: { ...createEmptyRuleState(), revision: 4 }
  };
}

test("portability export is local and includes each extension-owned store", async () => {
  const storage = createStorage(seeded());
  const manager = createPortabilityManager({
    browser: { storage },
    getManifest: () => ({ version: "0.2.0" }),
    clearTreeRelationships: async () => ({ ok: true, cleared: 0 }),
    reconcileSnoozeAlarms: async () => ({ ok: true }),
    broadcastChange() {},
    now: () => 555
  });
  const result = await manager.exportPortableState();
  assert.equal(result.ok, true);
  assert.equal(result.bundle.sourceVersion, "0.2.0");
  assert.equal(result.bundle.exportedAt, 555);
  assert.equal(result.bundle.stores.organizational.revision, 2);
  assert.equal(result.bundle.stores.snooze.revision, 3);
  assert.equal(result.bundle.stores.rules.revision, 4);
});

test("failed post-import snooze reconciliation restores previous stores", async () => {
  const previous = seeded();
  const storage = createStorage(previous);
  let reconcileCalls = 0;
  const manager = createPortabilityManager({
    browser: { storage },
    getManifest: () => ({ version: "0.2.0" }),
    clearTreeRelationships: async () => ({ ok: true, cleared: 0 }),
    reconcileSnoozeAlarms: async () => ({ ok: ++reconcileCalls > 1 }),
    broadcastChange() {}
  });
  const bundle = {
    schemaVersion: 1,
    product: "GoreeCloud Advanced Tab Manager",
    sourceVersion: "0.2.0",
    exportedAt: 1,
    stores: {
      organizational: createEmptyPersistentState(),
      snooze: createEmptySnoozeState(),
      rules: createEmptyRuleState()
    }
  };
  const result = await manager.importPortableState(bundle);
  assert.equal(result.ok, false);
  assert.equal(result.rolledBack, true);
  assert.deepEqual(storage.data, previous);
});

test("delete rolls persistent stores back when tree relationship clearing fails", async () => {
  const previous = seeded();
  const storage = createStorage(previous);
  const manager = createPortabilityManager({
    browser: { storage },
    getManifest: () => ({ version: "0.2.0" }),
    clearTreeRelationships: async () => ({ ok: false, rolledBack: true }),
    reconcileSnoozeAlarms: async () => ({ ok: true }),
    broadcastChange() {}
  });
  const result = await manager.deleteSavedData();
  assert.equal(result.ok, false);
  assert.equal(result.rolledBack, true);
  assert.deepEqual(storage.data, previous);
});
