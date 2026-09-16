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

function fixture({ snapshotFactory } = {}) {
  const storage = memoryStorage();
  const changes = [];
  const updates = [];
  const discards = [];
  let snapshotReads = 0;
  const baseSnapshot = { groups: [], windows: [{ id: 1, tabs: [{ id: 3, logicalId: "x", treeParentLogicalId: null, windowId: 1, index: 0, groupId: -1, incognito: false, title: "Docs", url: "https://docs.example.com/", pinned: false, audible: false, muted: false, discarded: false }] }] };
  const liveTab = { id: 3, windowId: 1, incognito: false, pinned: false, muted: false, mutedInfo: { muted: false }, discarded: false };
  const manager = createRuleManager({
    browser: {
      storage: { local: storage },
      tabs: {
        async get(tabId) {
          if (tabId !== liveTab.id) throw new Error("missing");
          return structuredClone(liveTab);
        },
        async update(tabId, patch) {
          updates.push({ tabId, patch: structuredClone(patch) });
          Object.assign(liveTab, patch);
          if (Object.prototype.hasOwnProperty.call(patch, "muted")) liveTab.mutedInfo = { muted: patch.muted };
          return structuredClone(liveTab);
        },
        async discard(tabId) {
          discards.push(tabId);
          liveTab.discarded = true;
          return structuredClone(liveTab);
        }
      }
    },
    readLiveSnapshot: async () => {
      snapshotReads += 1;
      return structuredClone(snapshotFactory ? snapshotFactory(snapshotReads, baseSnapshot) : baseSnapshot);
    },
    broadcastChange: (reason) => changes.push(reason),
    idFactory: () => "rule-1",
    now: () => 100
  });
  return { manager, storage, changes, updates, discards, liveTab, get snapshotReads() { return snapshotReads; } };
}

test("creates, reads, updates, and deletes a rule", async () => {
  const f = fixture();
  const created = await f.manager.upsertRule({ name: "Docs", priority: 5, conditions: [{ field: "hostname", operator: "equals", value: "docs.example.com" }], actions: ["pin"] });
  assert.equal(created.ok, true);
  assert.equal(created.rule.id, "rule-1");
  assert.deepEqual(created.rule.actions, ["pin"]);
  assert.equal((await f.manager.readRuleState()).state.rules.length, 1);
  const updated = await f.manager.upsertRule({ id: "rule-1", name: "Docs high", priority: 9, enabled: false, conditions: [{ field: "title", operator: "contains", value: "Docs" }], actions: ["mute"] });
  assert.equal(updated.rule.priority, 9);
  assert.deepEqual(updated.rule.actions, ["mute"]);
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
  await f.manager.upsertRule({ name: "Docs", conditions: [{ field: "hostname", operator: "equals", value: "docs.example.com" }], actions: ["pin"] });
  await f.manager.setRuleEngineEnabled(true);
  const preview = await f.manager.previewRuleEvaluation();
  assert.equal(preview.ok, true);
  assert.equal(preview.previewOnly, true);
  assert.equal(preview.evaluation.matches[0].tabId, 3);
  assert.equal(preview.plan.actions[0].tabId, 3);
  assert.equal(f.snapshotReads, 1);
  assert.equal(f.updates.length, 0);
});

test("explicit apply rechecks live state before applying a bounded action", async () => {
  const f = fixture();
  await f.manager.upsertRule({ name: "Docs", conditions: [{ field: "hostname", operator: "equals", value: "docs.example.com" }], actions: ["pin"] });
  await f.manager.setRuleEngineEnabled(true);
  const result = await f.manager.applyRuleActions();
  assert.equal(result.ok, true);
  assert.equal(result.plannedTabCount, 1);
  assert.equal(result.changedTabCount, 1);
  assert.equal(f.snapshotReads, 2);
  assert.deepEqual(f.updates, [{ tabId: 3, patch: { pinned: true } }]);
  assert.deepEqual(result.applied[0].executedActions, ["pin"]);
  assert.equal(f.changes.includes("rule-actions-applied"), true);
});

test("equal-priority action conflict fails closed before browser mutation", async () => {
  const f = fixture();
  await f.manager.upsertRule({ name: "Pin", priority: 5, conditions: [{ field: "hostname", operator: "equals", value: "docs.example.com" }], actions: ["pin"] });
  f.storage.data[RULE_STATE_KEY].rules.push({
    id: "rule-2", name: "Mute", enabled: true, priority: 5, createdAt: 100, updatedAt: 100,
    conditions: [{ field: "hostname", operator: "equals", value: "docs.example.com" }], actions: ["mute"]
  });
  await f.manager.setRuleEngineEnabled(true);
  const result = await f.manager.applyRuleActions();
  assert.equal(result.ok, false);
  assert.equal(result.reason, "rule-action-conflict");
  assert.equal(result.conflicts.length, 1);
  assert.equal(f.updates.length, 0);
});

test("changed browser snapshot aborts before browser mutation", async () => {
  const f = fixture({
    snapshotFactory(read, base) {
      const copy = structuredClone(base);
      if (read === 2) copy.windows[0].tabs[0].url = "https://other.example.com/";
      return copy;
    }
  });
  await f.manager.upsertRule({ name: "Docs", conditions: [{ field: "hostname", operator: "equals", value: "docs.example.com" }], actions: ["pin"] });
  await f.manager.setRuleEngineEnabled(true);
  const result = await f.manager.applyRuleActions();
  assert.equal(result.ok, false);
  assert.equal(result.reason, "browser-state-changed");
  assert.equal(f.updates.length, 0);
});

test("unknown update fails closed instead of creating a replacement rule", async () => {
  const f = fixture();
  const result = await f.manager.upsertRule({ id: "missing", name: "No", conditions: [{ field: "pinned", operator: "is", value: true }] });
  assert.deepEqual(result, { ok: false, reason: "rule-not-found" });
});
