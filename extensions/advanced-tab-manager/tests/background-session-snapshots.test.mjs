import assert from "node:assert/strict";
import test from "node:test";

import { createSavedState } from "../src/background/saved-state.js";

function clone(value) { return structuredClone(value); }

function fakeStorage() {
  const data = new Map();
  return {
    async get(key) { return data.has(key) ? { [key]: clone(data.get(key)) } : {}; },
    async set(values) { for (const [key, value] of Object.entries(values)) data.set(key, clone(value)); },
    async remove(key) { data.delete(key); },
    data
  };
}

function makeHarness() {
  let nextTabId = 100;
  let nextWindowId = 20;
  let nextGroupId = 200;
  let id = 0;
  const storage = fakeStorage();
  const changes = [];
  const windows = [{
    id: 1,
    focused: true,
    incognito: false,
    tabs: [
      { id: 1, windowId: 1, index: 0, active: true, pinned: false, incognito: false, groupId: 7, title: "Root", url: "https://example.test/root", logicalId: "logical-root", treeParentLogicalId: null },
      { id: 2, windowId: 1, index: 1, active: false, pinned: false, incognito: false, groupId: 7, title: "Child", url: "https://example.test/child", logicalId: "logical-child", treeParentLogicalId: "logical-root" }
    ]
  }];
  const groups = [{ id: 7, windowId: 1, title: "Research", color: "blue", collapsed: false }];

  function findWindow(windowId) { return windows.find((window) => window.id === windowId); }
  function findTab(tabId) {
    for (const window of windows) {
      const tab = window.tabs.find((candidate) => candidate.id === tabId);
      if (tab) return tab;
    }
    throw new Error("tab not found");
  }

  const browser = {
    storage: { local: storage },
    windows: {
      async create({ url }) {
        windows.forEach((window) => { window.focused = false; });
        const windowId = nextWindowId++;
        const tab = { id: nextTabId++, windowId, index: 0, active: true, pinned: false, incognito: false, groupId: -1, title: url, url };
        const created = { id: windowId, focused: true, incognito: false, tabs: [tab] };
        windows.push(created);
        return clone(created);
      },
      async update(windowId, values) {
        if (values.focused) windows.forEach((window) => { window.focused = window.id === windowId; });
        return clone(findWindow(windowId));
      },
      async remove(windowId) {
        const index = windows.findIndex((window) => window.id === windowId);
        if (index >= 0) windows.splice(index, 1);
      }
    },
    tabs: {
      async create({ windowId, url, active }) {
        const window = findWindow(windowId);
        const tab = { id: nextTabId++, windowId, index: window.tabs.length, active: Boolean(active), pinned: false, incognito: false, groupId: -1, title: url, url };
        window.tabs.push(tab);
        return clone(tab);
      },
      async update(tabId, values) {
        const tab = findTab(tabId);
        Object.assign(tab, values);
        return clone(tab);
      },
      async group({ createProperties, tabIds }) {
        const groupId = nextGroupId++;
        for (const tabId of tabIds) findTab(tabId).groupId = groupId;
        groups.push({ id: groupId, windowId: createProperties.windowId, title: "", color: "grey", collapsed: false });
        return groupId;
      }
    },
    tabGroups: {
      async update(groupId, values) {
        const group = groups.find((candidate) => candidate.id === groupId);
        Object.assign(group, values);
        return clone(group);
      }
    }
  };

  const readLiveSnapshot = async () => clone({ windows, groups });
  const savedState = createSavedState({
    browser,
    readLiveSnapshot,
    setTreeParent: async () => ({ ok: true }),
    ensureLogicalId: async () => "logical",
    broadcastChange: (reason) => changes.push(reason),
    idFactory: () => `id-${++id}`
  });

  return { browser, changes, savedState, windows };
}

test("session snapshot capture persists bounded organizational recovery state", async () => {
  const { savedState } = makeHarness();
  const result = await savedState.createSessionSnapshot();
  assert.equal(result.ok, true);
  assert.equal(result.windowCount, 1);
  assert.equal(result.tabCount, 2);

  const dashboard = await savedState.readDashboardState();
  assert.equal(dashboard.state.sessionSnapshots.length, 1);
  assert.equal(dashboard.state.snapshotRetention, 10);
});

test("session snapshot restore is additive and leaves the saved record intact", async () => {
  const { savedState, windows } = makeHarness();
  const captured = await savedState.createSessionSnapshot();
  const restored = await savedState.restoreSessionSnapshot(captured.sessionSnapshotId);
  assert.equal(restored.ok, true);
  assert.equal(restored.restoredWindowCount, 1);
  assert.equal(restored.restoredTabCount, 2);
  assert.equal(windows.length, 2);

  const dashboard = await savedState.readDashboardState();
  assert.equal(dashboard.state.sessionSnapshots.length, 1);
});

test("retention update prunes old snapshots and deletion is explicit", async () => {
  const { savedState } = makeHarness();
  const first = await savedState.createSessionSnapshot();
  await new Promise((resolve) => setTimeout(resolve, 2));
  await savedState.createSessionSnapshot();

  const retained = await savedState.setSnapshotRetention(1);
  assert.equal(retained.ok, true);
  assert.equal(retained.retention, 1);
  assert.equal(retained.prunedCount, 1);

  const dashboard = await savedState.readDashboardState();
  assert.equal(dashboard.state.sessionSnapshots.length, 1);
  assert.notEqual(dashboard.state.sessionSnapshots[0].id, first.sessionSnapshotId);

  const removed = await savedState.deleteSessionSnapshot(dashboard.state.sessionSnapshots[0].id);
  assert.equal(removed.ok, true);
  const after = await savedState.readDashboardState();
  assert.equal(after.state.sessionSnapshots.length, 0);
});

test("invalid retention fails closed without changing storage", async () => {
  const { savedState } = makeHarness();
  await savedState.createSessionSnapshot();
  const result = await savedState.setSnapshotRetention(0);
  assert.deepEqual(result, { ok: false, reason: "invalid-snapshot-retention" });
  const dashboard = await savedState.readDashboardState();
  assert.equal(dashboard.state.snapshotRetention, 10);
  assert.equal(dashboard.state.sessionSnapshots.length, 1);
});
