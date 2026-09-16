import test from "node:test";
import assert from "node:assert/strict";
import {
  SNOOZE_STATE_KEY,
  commitSnoozeMutation,
  createEmptySnoozeState,
  readSnoozeStateRecord,
  validateSnoozeState
} from "../src/core/snooze-store.js";

function clone(value) { return JSON.parse(JSON.stringify(value)); }

function makeStorage({ corruptAfterWrite = false } = {}) {
  const data = new Map();
  return {
    data,
    async get(key) { return data.has(key) ? { [key]: clone(data.get(key)) } : {}; },
    async set(object) {
      for (const [key, value] of Object.entries(object)) {
        data.set(key, clone(value));
        if (corruptAfterWrite) data.get(key).revision += 10;
      }
    },
    async remove(key) { data.delete(key); }
  };
}

function item(overrides = {}) {
  return {
    id: "s1",
    url: "https://example.com/",
    title: "Example",
    pinned: false,
    createdAt: 1000,
    wakeAt: 2000,
    treeParentLogicalId: null,
    nativeGroup: null,
    ...overrides
  };
}

test("empty snooze state is versioned and valid", () => {
  assert.deepEqual(validateSnoozeState(createEmptySnoozeState()), { schemaVersion: 1, revision: 0, items: [] });
});

test("snooze state rejects non-future deadlines", () => {
  assert.throws(() => validateSnoozeState({ schemaVersion: 1, revision: 0, items: [item({ wakeAt: 1000 })] }), /timestamps are invalid/);
});

test("verified snooze mutation commits and increments revision", async () => {
  const storage = makeStorage();
  const result = await commitSnoozeMutation({ storage, mutate(state) { state.items.push(item()); } });
  assert.equal(result.ok, true);
  assert.equal(result.state.revision, 1);
  const readback = await readSnoozeStateRecord(storage);
  assert.equal(readback.state.items.length, 1);
});

test("failed snooze write verification restores an absent previous record", async () => {
  const storage = makeStorage({ corruptAfterWrite: true });
  const result = await commitSnoozeMutation({ storage, mutate(state) { state.items.push(item()); } });
  assert.equal(result.ok, false);
  assert.equal(result.rolledBack, true);
  assert.equal(storage.data.has(SNOOZE_STATE_KEY), false);
});
