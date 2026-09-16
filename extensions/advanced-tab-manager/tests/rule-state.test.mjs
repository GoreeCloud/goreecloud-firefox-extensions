import assert from "node:assert/strict";
import test from "node:test";
import {
  RULE_STATE_KEY,
  commitRuleStateMutation,
  createEmptyRuleState,
  readRuleStateRecord,
  validateRuleState
} from "../src/core/rule-state.js";

function memoryStorage(initial = {}) {
  const data = structuredClone(initial);
  let failNextSet = false;
  return {
    data,
    failNextSet() { failNextSet = true; },
    async get(key) { return Object.prototype.hasOwnProperty.call(data, key) ? { [key]: structuredClone(data[key]) } : {}; },
    async set(values) {
      if (failNextSet) { failNextSet = false; throw new Error("set failed"); }
      Object.assign(data, structuredClone(values));
    },
    async remove(key) { delete data[key]; }
  };
}

const rule = {
  id: "rule-1", name: "Docs", enabled: true, priority: 5, createdAt: 10, updatedAt: 10,
  conditions: [{ field: "hostname", operator: "equals", value: "docs.example.com" }],
  actions: ["pin"]
};

test("empty rule state is globally disabled", () => {
  assert.deepEqual(createEmptyRuleState(), { schemaVersion: 1, revision: 0, enabled: false, rules: [] });
});

test("valid rule state round-trips from storage", async () => {
  const state = { schemaVersion: 1, revision: 2, enabled: true, rules: [rule] };
  const storage = memoryStorage({ [RULE_STATE_KEY]: state });
  assert.deepEqual((await readRuleStateRecord(storage)).state, state);
});

test("pre-0.1.6 rules without actions remain valid and preview-only", () => {
  const legacyRule = { ...rule };
  delete legacyRule.actions;
  assert.equal(validateRuleState({ schemaVersion: 1, revision: 2, enabled: true, rules: [legacyRule] }).rules[0].actions, undefined);
});

test("invalid unsupported field fails closed", () => {
  assert.throws(() => validateRuleState({ schemaVersion: 1, revision: 0, enabled: true, rules: [{ ...rule, conditions: [{ field: "pageContent", operator: "contains", value: "secret" }] }] }), /unsupported/);
});

test("unsupported or contradictory actions fail closed", () => {
  assert.throws(() => validateRuleState({ schemaVersion: 1, revision: 0, enabled: true, rules: [{ ...rule, actions: ["close"] }] }), /action/);
  assert.throws(() => validateRuleState({ schemaVersion: 1, revision: 0, enabled: true, rules: [{ ...rule, actions: ["pin", "unpin"] }] }), /conflict/);
});

test("verified mutation increments revision", async () => {
  const storage = memoryStorage();
  const result = await commitRuleStateMutation({ storage, mutate(state) { state.enabled = true; state.rules.push(rule); } });
  assert.equal(result.ok, true);
  assert.equal(result.state.revision, 1);
  assert.equal((await readRuleStateRecord(storage)).state.rules.length, 1);
});

test("failed write restores exact absent previous record", async () => {
  const storage = memoryStorage();
  storage.failNextSet();
  const result = await commitRuleStateMutation({ storage, mutate(state) { state.enabled = true; } });
  assert.equal(result.ok, false);
  assert.equal(result.rolledBack, true);
  assert.equal(Object.prototype.hasOwnProperty.call(storage.data, RULE_STATE_KEY), false);
});
