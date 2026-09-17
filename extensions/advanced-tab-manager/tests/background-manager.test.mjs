import assert from "node:assert/strict";
import test from "node:test";

import { createManagerState } from "../src/background/manager.js";

const manifest = {
  version: "0.1.8",
  permissions: ["alarms", "sessions", "storage", "tabGroups", "tabs"],
  incognito: "not_allowed",
  browser_specific_settings: { gecko: { strict_min_version: "139.0" } }
};

test("manager state reads all established stores and returns one bounded model", async () => {
  const calls = [];
  const manager = createManagerState({
    getManifest: () => manifest,
    now: () => 42,
    readDashboardState: async () => {
      calls.push("dashboard");
      return {
        ok: true,
        snapshot: { windows: [{ tabs: [] }], groups: [] },
        state: { schemaVersion: 1, revision: 2, tabSets: [], stashedItems: [] }
      };
    },
    readSnoozeState: async () => {
      calls.push("snooze");
      return { ok: true, state: { schemaVersion: 1, revision: 3, items: [] } };
    },
    readRuleState: async () => {
      calls.push("rules");
      return { ok: true, state: { schemaVersion: 1, revision: 4, enabled: false, rules: [] } };
    }
  });

  const result = await manager.readManagerState();
  assert.equal(result.ok, true);
  assert.equal(result.model.generatedAt, 42);
  assert.equal(result.model.source.version, "0.1.8");
  assert.deepEqual(new Set(calls), new Set(["dashboard", "snooze", "rules"]));
});

test("manager diagnostics fail soft when one store read throws", async () => {
  const manager = createManagerState({
    getManifest: () => manifest,
    readDashboardState: async () => ({
      ok: true,
      snapshot: { windows: [], groups: [] },
      state: { schemaVersion: 1, revision: 1, tabSets: [], stashedItems: [] }
    }),
    readSnoozeState: async () => {
      throw new Error("simulated unavailable snooze store");
    },
    readRuleState: async () => ({ ok: false })
  });

  const result = await manager.readManagerState();
  assert.equal(result.ok, true);
  assert.equal(result.model.availability.organizationalState, true);
  assert.equal(result.model.availability.snoozeState, false);
  assert.equal(result.model.availability.ruleState, false);
});
