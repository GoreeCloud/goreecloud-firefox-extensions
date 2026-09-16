import test from "node:test";
import assert from "node:assert/strict";
import { createSnoozeManager } from "../src/background/snooze.js";
import { SNOOZE_STATE_KEY } from "../src/core/snooze-store.js";
import { alarmNameForSnooze } from "../src/core/snooze.js";

function clone(value) { return JSON.parse(JSON.stringify(value)); }

function makeHarness() {
  let nextTabId = 10;
  let nextGroupId = 20;
  let nextLogical = 1;
  const storageData = new Map();
  const alarms = new Map();
  const broadcasts = [];
  const windows = [{
    id: 1,
    focused: true,
    incognito: false,
    tabs: [
      { id: 1, logicalId: "root", treeParentLogicalId: null, windowId: 1, index: 0, groupId: 7, active: true, pinned: false, audible: false, discarded: false, hidden: false, incognito: false, title: "Root", url: "https://example.com/root" },
      { id: 2, logicalId: "child", treeParentLogicalId: "root", windowId: 1, index: 1, groupId: 7, active: false, pinned: false, audible: false, discarded: false, hidden: false, incognito: false, title: "Child", url: "https://example.com/child" }
    ]
  }];
  const groups = [{ id: 7, windowId: 1, title: "Research", color: "blue", collapsed: false }];

  function findTab(id) {
    for (const window of windows) {
      const tab = window.tabs.find((candidate) => candidate.id === id);
      if (tab) return tab;
    }
    return null;
  }

  function snapshot() {
    return clone({ schemaVersion: 2, capturedAt: Date.now(), windows, groups });
  }

  const browser = {
    storage: {
      local: {
        async get(key) { return storageData.has(key) ? { [key]: clone(storageData.get(key)) } : {}; },
        async set(object) { for (const [key, value] of Object.entries(object)) storageData.set(key, clone(value)); },
        async remove(key) { storageData.delete(key); }
      }
    },
    alarms: {
      async create(name, info) { alarms.set(name, { name, scheduledTime: info.when }); },
      async get(name) { return alarms.has(name) ? clone(alarms.get(name)) : undefined; },
      async getAll() { return clone([...alarms.values()]); },
      async clear(name) { return alarms.delete(name); }
    },
    tabs: {
      async remove(tabId) {
        for (const window of windows) {
          const index = window.tabs.findIndex((tab) => tab.id === tabId);
          if (index >= 0) {
            window.tabs.splice(index, 1);
            window.tabs.forEach((tab, position) => { tab.index = position; });
            return;
          }
        }
        throw new Error("tab not found");
      },
      async create({ windowId, url, active }) {
        const window = windows.find((candidate) => candidate.id === windowId);
        if (!window) throw new Error("window not found");
        if (active) for (const tab of window.tabs) tab.active = false;
        const tab = { id: nextTabId++, logicalId: null, treeParentLogicalId: null, windowId, index: window.tabs.length, groupId: -1, active: Boolean(active), pinned: false, audible: false, discarded: false, hidden: false, incognito: false, title: url, url };
        window.tabs.push(tab);
        return clone(tab);
      },
      async update(tabId, properties) {
        const tab = findTab(tabId);
        if (!tab) throw new Error("tab not found");
        if ("pinned" in properties) tab.pinned = Boolean(properties.pinned);
        return clone(tab);
      },
      async group({ createProperties, tabIds }) {
        const groupId = nextGroupId++;
        const ids = Array.isArray(tabIds) ? tabIds : [tabIds];
        for (const id of ids) findTab(id).groupId = groupId;
        groups.push({ id: groupId, windowId: createProperties.windowId, title: "", color: "grey", collapsed: false });
        return groupId;
      }
    },
    tabGroups: {
      async update(groupId, properties) {
        const group = groups.find((candidate) => candidate.id === groupId);
        if (!group) throw new Error("group not found");
        Object.assign(group, properties);
        return clone(group);
      }
    }
  };

  async function ensureLogicalId(tabId) {
    const tab = findTab(tabId);
    if (!tab.logicalId) tab.logicalId = `logical-${nextLogical++}`;
    return tab.logicalId;
  }

  async function setTreeParent(tabId, parentTabId) {
    const tab = findTab(tabId);
    const parent = findTab(parentTabId);
    if (!tab || !parent) return { ok: false, reason: "tab-not-found" };
    tab.treeParentLogicalId = parent.logicalId;
    return { ok: true };
  }

  const manager = createSnoozeManager({
    browser,
    readLiveSnapshot: async () => snapshot(),
    setTreeParent,
    ensureLogicalId,
    broadcastChange: (reason) => broadcasts.push(reason),
    idFactory: () => "snooze-1"
  });

  return { browser, manager, windows, groups, storageData, alarms, broadcasts, snapshot };
}

test("snooze manager persists, verifies alarm, then closes the source tab", async () => {
  const h = makeHarness();
  const wakeAt = Date.now() + 60_000;
  const result = await h.manager.snoozeTab(2, wakeAt);
  assert.equal(result.ok, true);
  assert.equal(h.windows[0].tabs.some((tab) => tab.id === 2), false);
  const stored = h.storageData.get(SNOOZE_STATE_KEY);
  assert.equal(stored.items.length, 1);
  assert.equal(stored.items[0].treeParentLogicalId, "root");
  assert.equal(h.alarms.has(alarmNameForSnooze("snooze-1")), true);
  assert.deepEqual(h.broadcasts, ["tab-snoozed"]);
});

test("startup reconciliation recreates a lost browser-session alarm from persisted deadline", async () => {
  const h = makeHarness();
  const wakeAt = Date.now() + 60_000;
  assert.equal((await h.manager.snoozeTab(2, wakeAt)).ok, true);
  h.alarms.clear();
  const result = await h.manager.reconcileSnoozeAlarms();
  assert.equal(result.ok, true);
  assert.equal(result.scheduled, 1);
  assert.equal(h.alarms.has(alarmNameForSnooze("snooze-1")), true);
});

test("due alarm recreates the tab before consuming persisted recovery state", async () => {
  const h = makeHarness();
  const wakeAt = Date.now() + 60_000;
  assert.equal((await h.manager.snoozeTab(2, wakeAt)).ok, true);

  const result = await h.manager.handleAlarm({ name: alarmNameForSnooze("snooze-1") });
  assert.equal(result.ok, true);
  const stored = h.storageData.get(SNOOZE_STATE_KEY);
  assert.equal(stored.items.length, 0);
  const restored = h.windows[0].tabs.find((tab) => tab.url === "https://example.com/child");
  assert.ok(restored);
  assert.equal(restored.treeParentLogicalId, "root");
  const restoredGroup = h.groups.find((group) => group.id === restored.groupId);
  assert.equal(restoredGroup.title, "Research");
  assert.equal(h.alarms.has(alarmNameForSnooze("snooze-1")), false);
});

test("failed due restore keeps recovery state and schedules a retry", async () => {
  const h = makeHarness();
  const wakeAt = Date.now() + 60_000;
  assert.equal((await h.manager.snoozeTab(2, wakeAt)).ok, true);
  h.windows[0].incognito = true;
  const result = await h.manager.handleAlarm({ name: alarmNameForSnooze("snooze-1") });
  assert.equal(result.ok, false);
  assert.equal(result.retryScheduled, true);
  assert.equal(h.storageData.get(SNOOZE_STATE_KEY).items.length, 1);
});

test("rescheduling updates the persisted deadline and replaces the session alarm", async () => {
  const h = makeHarness();
  const firstWakeAt = Date.now() + 60_000;
  assert.equal((await h.manager.snoozeTab(2, firstWakeAt)).ok, true);

  const secondWakeAt = Date.now() + 120_000;
  const result = await h.manager.rescheduleSnoozedItem("snooze-1", secondWakeAt);
  assert.equal(result.ok, true);
  assert.equal(h.storageData.get(SNOOZE_STATE_KEY).items[0].wakeAt, secondWakeAt);
  assert.equal(h.alarms.get(alarmNameForSnooze("snooze-1")).scheduledTime, secondWakeAt);
  assert.equal(h.broadcasts.at(-1), "snoozed-item-rescheduled");
});

test("failed reschedule restores the prior deadline and prior alarm", async () => {
  const h = makeHarness();
  const firstWakeAt = Date.now() + 60_000;
  assert.equal((await h.manager.snoozeTab(2, firstWakeAt)).ok, true);

  const realGet = h.browser.alarms.get;
  let failNextVerification = true;
  h.browser.alarms.get = async (name) => {
    if (failNextVerification) {
      failNextVerification = false;
      return undefined;
    }
    return realGet(name);
  };

  const secondWakeAt = Date.now() + 120_000;
  const result = await h.manager.rescheduleSnoozedItem("snooze-1", secondWakeAt);
  assert.equal(result.ok, false);
  assert.equal(result.rolledBack, true);
  assert.equal(result.previousAlarmRestored, true);
  assert.equal(h.storageData.get(SNOOZE_STATE_KEY).items[0].wakeAt, firstWakeAt);
  assert.equal(h.alarms.get(alarmNameForSnooze("snooze-1")).scheduledTime, firstWakeAt);
});
