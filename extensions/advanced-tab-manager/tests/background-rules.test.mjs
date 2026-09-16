import assert from "node:assert/strict";
import test from "node:test";
import { createRuleManager } from "../src/background/rules.js";
import { RULE_STATE_KEY } from "../src/core/rule-state.js";

function memoryStorage() {
  const data = {};
  return {
    data,
    async get(key) { return Object.prototype.hasOwnProperty.call(data, key) ? { [key]: structuredClone(data[key]) } : {}; },
    async set(values) { Object.assign(data, structuredClone(values)); },
    async remove(key) { delete data[key]; }
  };
}

function fixture() {
  const storage = memoryStorage();
  const changes = [];
  let snapshotReads = 0;
  const snapshot = { groups: [], windows: [{ id: 1, tabs: [{ id: 3, logicalId: "x", treeParentLogicalId: null, windowId: 1, index: 0, groupId: -1, incognito: false, title: "Docs", url: "https://docs.example.com/", pinned: false, audible: false, muted: false, discarded: false }] }] };
  const manager = createRuleManager({
    browser: { storage: { local: storage } },
    readLiveSnapshot: async () => { snapshotReads += 1; return structuredClone(snapshot); },
    broadcastChange: (reason) => changes.push(reason),
    idFactory: () => "rule-1",
    now: () => 100
  });
  return { manager, storage, changes, get snapshotReads() { return snapshotReads; } };
}

test("creates, reads, updates, and deletes a rule", async () => {
  const f = fixture();
  const created = await f.manager.upsertRule({ name: "Docs", priority: 5, conditions: [{ field: "hostname", operator: "equals", value: "docs.example.com" }] });
  assert.equal(created.ok, true);
  assert.equal(created.rule.id, "rule-1");
  assert.equal((await f.manager.readRuleState()).state.rules.length, 1);
  const updated = await f.manager.upsertRule({ id: "rule-1", name: "Docs high", priority: 9, enabled: false, conditions: [{ field: "title", operator: "contains", value: "Docs" }] });
  assert.equal(updated.rule.priority, 9);
  assert.equal(updated.rule.createdAt, 100);
  assert.equal((await f.manager.deleteRule("rule-1")).ok, true);
  assert.equal((await f.manager.readRuleState()).state.rules.length, 0);
});

test("engine is disabled by default and can be explicitly enabled", async () => {
  const f = fixture();
  assert.equal((await f.manager.readRuleState()).state.enabled, false);
  assert.deepEqual(await f.manager.setRuleEngineEnabled(true), { ok: true, enabled: true, revision: 1 });
  assert.equal(f.storage.data[RULE_STATE_KEY].enabled, true);
});

test("preview uses a fresh snapshot and never mutates browser tabs", async () => {
  const f = fixture();
  await f.manager.upsertRule({ name: "Docs", conditions: [{ field: "hostname", operator: "equals", value: "docs.example.com" }] });
  await f.manager.setRuleEngineEnabled(true);
  const preview = await f.manager.previewRuleEvaluation();
  assert.equal(preview.ok, true);
  assert.equal(preview.previewOnly, true);
  assert.equal(preview.evaluation.matches[0].tabId, 3);
  assert.equal(f.snapshotReads, 1);
});

test("unknown update fails closed instead of creating a replacement rule", async () => {
  const f = fixture();
  const result = await f.manager.upsertRule({ id: "missing", name: "No", conditions: [{ field: "pinned", operator: "is", value: true }] });
  assert.deepEqual(result, { ok: false, reason: "rule-not-found" });
});
