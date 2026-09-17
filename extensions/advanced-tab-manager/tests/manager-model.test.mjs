import assert from "node:assert/strict";
import test from "node:test";

import { buildManagerModel } from "../src/core/manager-model.js";

const manifest = {
  version: "0.1.8",
  permissions: ["tabs", "storage", "sessions", "tabGroups", "alarms"],
  host_permissions: [],
  incognito: "not_allowed",
  browser_specific_settings: { gecko: { strict_min_version: "139.0" } }
};

test("manager model aggregates counts without exposing tab or saved-item contents", () => {
  const model = buildManagerModel({
    generatedAt: 1234,
    manifest,
    dashboard: {
      ok: true,
      snapshot: {
        windows: [{
          tabs: [
            { title: "Secret title", url: "https://example.test/private", pinned: true, discarded: false, treeParentLogicalId: null },
            { title: "Another", url: "https://example.test/child", pinned: false, discarded: true, treeParentLogicalId: "logical-parent" }
          ]
        }],
        groups: [{ id: 1 }]
      },
      state: {
        schemaVersion: 1,
        revision: 7,
        tabSets: [{ id: "set", tabs: [{ url: "https://saved.test/" }] }],
        stashedItems: [{ id: "stash", url: "https://stash.test/" }]
      }
    },
    snooze: {
      ok: true,
      state: { schemaVersion: 1, revision: 3, items: [{ id: "snooze", url: "https://later.test/" }] }
    },
    rules: {
      ok: true,
      state: { schemaVersion: 1, revision: 5, enabled: true, rules: [{ id: "rule", name: "Local rule" }] }
    }
  });

  assert.equal(model.generatedAt, 1234);
  assert.deepEqual(model.source, {
    version: "0.1.8",
    state: "source-candidate",
    lifecycle: "In Development",
    componentClass: "Browser extension",
    minimumFirefoxVersion: "139.0"
  });
  assert.deepEqual(model.counts, {
    tabs: 2,
    windows: 1,
    nativeGroups: 1,
    pinned: 1,
    discarded: 1,
    treeChildren: 1,
    tabSets: 1,
    stashed: 1,
    snoozed: 1,
    rules: 1
  });
  assert.equal(model.stores.rules.enabled, true);

  const serialized = JSON.stringify(model);
  assert.equal(serialized.includes("Secret title"), false);
  assert.equal(serialized.includes("https://"), false);
  assert.equal(serialized.includes("Local rule"), false);
});

test("manager model sorts permission declarations and reports the privacy boundary", () => {
  const model = buildManagerModel({
    dashboard: { ok: false, snapshot: { windows: [], groups: [] } },
    snooze: { ok: false },
    rules: { ok: false },
    manifest: {
      ...manifest,
      permissions: ["tabs", "alarms", "storage"],
      host_permissions: ["https://b.test/*", "https://a.test/*"],
      content_scripts: [{ matches: ["https://a.test/*"] }]
    }
  });

  assert.deepEqual(model.permissions.extension, ["alarms", "storage", "tabs"]);
  assert.deepEqual(model.permissions.hosts, ["https://a.test/*", "https://b.test/*"]);
  assert.equal(model.permissions.contentScripts, 1);
  assert.equal(model.permissions.incognitoMode, "not_allowed");
});

test("manager model remains usable when extension-owned stores are unavailable", () => {
  const model = buildManagerModel({
    manifest,
    dashboard: {
      ok: false,
      snapshot: { windows: [{ tabs: [{ pinned: false, discarded: false }] }], groups: [] }
    },
    snooze: { ok: false },
    rules: { ok: false }
  });

  assert.equal(model.availability.liveBrowserState, true);
  assert.equal(model.availability.organizationalState, false);
  assert.equal(model.counts.tabs, 1);
  assert.equal(model.counts.tabSets, 0);
  assert.equal(model.stores.organizational.available, false);
  assert.equal(model.stores.organizational.schemaVersion, null);
});
