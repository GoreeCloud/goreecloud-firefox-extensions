import assert from "node:assert/strict";
import test from "node:test";

import {
  commitPortableClear,
  commitPortableImport,
  createPortableBundle,
  validatePortableBundle
} from "../src/core/portable-state.js";
import { PERSISTENT_STATE_KEY, createEmptyPersistentState } from "../src/core/persistent-state.js";
import { SNOOZE_STATE_KEY, createEmptySnoozeState } from "../src/core/snooze-store.js";
import { RULE_STATE_KEY, createEmptyRuleState } from "../src/core/rule-state.js";

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function storage(initial = {}, { corruptAfterSet = false } = {}) {
  const data = clone(initial);
  return {
    async get(keys) {
      const result = {};
      for (const key of Array.isArray(keys) ? keys : [keys]) {
        if (Object.prototype.hasOwnProperty.call(data, key)) result[key] = clone(data[key]);
      }
      return result;
    },
    async set(values) {
      Object.assign(data, clone(values));
      if (corruptAfterSet && Object.prototype.hasOwnProperty.call(values, RULE_STATE_KEY)) {
        data[RULE_STATE_KEY] = { schemaVersion: 999 };
      }
    },
    async remove(keys) {
      for (const key of Array.isArray(keys) ? keys : [keys]) delete data[key];
    },
    data
  };
}

function bundle() {
  return createPortableBundle({
    version: "0.2.0",
    exportedAt: 123,
    organizational: createEmptyPersistentState(),
    snooze: createEmptySnoozeState(),
    rules: createEmptyRuleState()
  });
}

test("portable bundle round-trips all three validated stores", () => {
  const value = bundle();
  assert.deepEqual(validatePortableBundle(JSON.parse(JSON.stringify(value))), value);
});

test("portable import commits and verifies all three stores together", async () => {
  const target = storage();
  const result = await commitPortableImport({ storage: target, bundle: bundle() });
  assert.equal(result.ok, true);
  assert.equal(target.data[PERSISTENT_STATE_KEY].schemaVersion, 1);
  assert.equal(target.data[SNOOZE_STATE_KEY].schemaVersion, 1);
  assert.equal(target.data[RULE_STATE_KEY].schemaVersion, 1);
});

test("portable import restores the exact previous records when verification fails", async () => {
  const previous = {
    [PERSISTENT_STATE_KEY]: { ...createEmptyPersistentState(), revision: 4 },
    [SNOOZE_STATE_KEY]: { ...createEmptySnoozeState(), revision: 5 },
    [RULE_STATE_KEY]: { ...createEmptyRuleState(), revision: 6 }
  };
  const target = storage(previous, { corruptAfterSet: true });
  const result = await commitPortableImport({ storage: target, bundle: bundle() });
  assert.equal(result.ok, false);
  assert.equal(result.rolledBack, true);
  assert.deepEqual(target.data[PERSISTENT_STATE_KEY], previous[PERSISTENT_STATE_KEY]);
  assert.deepEqual(target.data[SNOOZE_STATE_KEY], previous[SNOOZE_STATE_KEY]);
  assert.deepEqual(target.data[RULE_STATE_KEY], previous[RULE_STATE_KEY]);
});

test("portable clear removes all persistent stores and can preserve rollback evidence", async () => {
  const previous = {
    [PERSISTENT_STATE_KEY]: createEmptyPersistentState(),
    [SNOOZE_STATE_KEY]: createEmptySnoozeState(),
    [RULE_STATE_KEY]: createEmptyRuleState()
  };
  const target = storage(previous);
  const result = await commitPortableClear({ storage: target });
  assert.equal(result.ok, true);
  assert.deepEqual(Object.keys(target.data), []);
  assert.deepEqual(result.previousRecords, previous);
});

test("portable bundle rejects unexpected top-level fields", () => {
  assert.throws(
    () => validatePortableBundle({ ...bundle(), extra: true }),
    /invalid-portable-bundle/
  );
});
