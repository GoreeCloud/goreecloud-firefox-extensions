import test from "node:test";
import assert from "node:assert/strict";

function eventSlot() {
  return { listeners: [], addListener(listener) { this.listeners.push(listener); } };
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function makeBrowser() {
  let nextTabId = 20;
  let nextWindowId = 5;
  let nextGroupId = 50;
  const sessionValues = new Map();
  const localStorage = new Map();

  const windows = [
    {
      id: 1,
      focused: true,
      incognito: false,
      type: "normal",
      tabs: [
        { id: 1, windowId: 1, index: 0, active: true, highlighted: true, pinned: false, audible: false, discarded: false, hidden: false, incognito: false, groupId: 7, title: "Root", url: "https://example.com/root", favIconUrl: "", mutedInfo: { muted: false } },
        { id: 2, windowId: 1, index: 1, active: false, highlighted: false, pinned: false, audible: false, discarded: false, hidden: false, incognito: false, groupId: 7, title: "Child", url: "https://example.com/child", favIconUrl: "", mutedInfo: { muted: false }, openerTabId: 1 }
      ]
    }
  ];
  const groups = [{ id: 7, windowId: 1, title: "Research", color: "blue", collapsed: false }];

  function findTab(tabId) {
    for (const window of windows) {
      const tab = window.tabs.find((candidate) => candidate.id === tabId);
      if (tab) return tab;
    }
    throw new Error(`tab ${tabId} not found`);
  }

  function reindex(windowId) {
    const window = windows.find((candidate) => candidate.id === windowId);
    if (window) window.tabs.forEach((tab, index) => { tab.index = index; });
  }

  const runtimeOnMessage = eventSlot();

  const browser = {
    runtime: {
      onMessage: runtimeOnMessage,
      async sendMessage() { return undefined; }
    },
    sessions: {
      onChanged: eventSlot(),
      async getTabValue(tabId, key) {
        return sessionValues.get(`${tabId}:${key}`);
      },
      async setTabValue(tabId, key, value) {
        sessionValues.set(`${tabId}:${key}`, value);
      },
      async removeTabValue(tabId, key) {
        sessionValues.delete(`${tabId}:${key}`);
      }
    },
    storage: {
      local: {
        async get(key) {
          return localStorage.has(key) ? { [key]: clone(localStorage.get(key)) } : {};
        },
        async set(object) {
          for (const [key, value] of Object.entries(object)) localStorage.set(key, clone(value));
        },
        async remove(key) {
          localStorage.delete(key);
        }
      }
    },
    windows: {
      onCreated: eventSlot(),
      onRemoved: eventSlot(),
      onFocusChanged: eventSlot(),
      async getAll() { return clone(windows); },
      async create({ url }) {
        for (const window of windows) window.focused = false;
        const windowId = nextWindowId++;
        const tab = { id: nextTabId++, windowId, index: 0, active: true, highlighted: true, pinned: false, audible: false, discarded: false, hidden: false, incognito: false, groupId: -1, title: url, url, favIconUrl: "", mutedInfo: { muted: false } };
        const created = { id: windowId, focused: true, incognito: false, type: "normal", tabs: [tab] };
        windows.push(created);
        return clone(created);
      },
      async update(windowId, properties) {
        const target = windows.find((window) => window.id === windowId);
        if (!target) throw new Error("window not found");
        if (properties.focused) {
          for (const window of windows) window.focused = window.id === windowId;
        }
        return clone(target);
      },
      async remove(windowId) {
        const index = windows.findIndex((window) => window.id === windowId);
        if (index < 0) throw new Error("window not found");
        windows.splice(index, 1);
      }
    },
    tabs: {
      onCreated: eventSlot(),
      onUpdated: eventSlot(),
      onRemoved: eventSlot(),
      onMoved: eventSlot(),
      onAttached: eventSlot(),
      onDetached: eventSlot(),
      onActivated: eventSlot(),
      onHighlighted: eventSlot(),
      onReplaced: eventSlot(),
      async get(tabId) { return clone(findTab(tabId)); },
      async remove(tabId) {
        for (const window of windows) {
          const index = window.tabs.findIndex((tab) => tab.id === tabId);
          if (index >= 0) {
            window.tabs.splice(index, 1);
            reindex(window.id);
            return;
          }
        }
        throw new Error("tab not found");
      },
      async create({ windowId = 1, url = "about:blank", active = true }) {
        const window = windows.find((candidate) => candidate.id === windowId);
        if (!window) throw new Error("window not found");
        if (active) for (const tab of window.tabs) tab.active = false;
        const tab = { id: nextTabId++, windowId, index: window.tabs.length, active, highlighted: active, pinned: false, audible: false, discarded: false, hidden: false, incognito: false, groupId: -1, title: url, url, favIconUrl: "", mutedInfo: { muted: false } };
        window.tabs.push(tab);
        return clone(tab);
      },
      async update(tabId, properties) {
        const tab = findTab(tabId);
        if (properties.active) {
          const window = windows.find((candidate) => candidate.id === tab.windowId);
          for (const candidate of window.tabs) candidate.active = candidate.id === tabId;
        }
        if ("pinned" in properties) tab.pinned = Boolean(properties.pinned);
        if ("muted" in properties) tab.mutedInfo = { muted: Boolean(properties.muted) };
        return clone(tab);
      },
      async discard(tabId) {
        const tab = findTab(tabId);
        tab.discarded = true;
        return clone(tab);
      },
      async group({ createProperties, tabIds }) {
        const ids = Array.isArray(tabIds) ? tabIds : [tabIds];
        const windowId = createProperties?.windowId ?? findTab(ids[0]).windowId;
        const groupId = nextGroupId++;
        for (const id of ids) {
          const tab = findTab(id);
          tab.groupId = groupId;
          tab.pinned = false;
        }
        groups.push({ id: groupId, windowId, title: "", color: "grey", collapsed: false });
        return groupId;
      }
    },
    tabGroups: {
      onCreated: eventSlot(),
      onUpdated: eventSlot(),
      onRemoved: eventSlot(),
      onMoved: eventSlot(),
      async query() { return clone(groups); },
      async update(groupId, properties) {
        const group = groups.find((candidate) => candidate.id === groupId);
        if (!group) throw new Error("group not found");
        Object.assign(group, properties);
        return clone(group);
      }
    },
    __state: { windows, groups, localStorage, sessionValues }
  };
  return browser;
}

test("background ATM-005 flow saves, stashes, restores, and reconstructs a Tab Set without removing its recovery record", async () => {
  const browser = makeBrowser();
  globalThis.browser = browser;
  if (!globalThis.crypto?.randomUUID) {
    let value = 0;
    globalThis.crypto = { randomUUID: () => `uuid-${++value}` };
  }

  await import(`../src/background/background.js?integration=${Date.now()}`);
  const onMessage = browser.runtime.onMessage.listeners.at(-1);
  assert.equal(typeof onMessage, "function");

  const saved = await onMessage({ type: "atm:save-focused-window-tab-set" });
  assert.equal(saved.ok, true);
  assert.equal(saved.itemCount, 2);

  const stashed = await onMessage({ type: "atm:stash-tab", tabId: 2 });
  assert.equal(stashed.ok, true);
  assert.equal(browser.__state.windows[0].tabs.length, 1);

  let dashboard = await onMessage({ type: "atm:get-dashboard-state" });
  assert.equal(dashboard.ok, true);
  assert.equal(dashboard.snapshot.windows[0].tabs.length, 1);
  assert.equal(dashboard.state.tabSets.length, 1);
  assert.equal(dashboard.state.stashedItems.length, 1);

  const restoredStash = await onMessage({ type: "atm:restore-stashed-item", stashedItemId: stashed.stashedItemId });
  assert.equal(restoredStash.ok, true);
  dashboard = await onMessage({ type: "atm:get-dashboard-state" });
  assert.equal(dashboard.state.stashedItems.length, 0);
  assert.equal(dashboard.snapshot.windows[0].tabs.length, 2);

  const restoredSet = await onMessage({ type: "atm:restore-tab-set", tabSetId: saved.tabSetId });
  assert.equal(restoredSet.ok, true);
  assert.equal(restoredSet.restoredTabCount, 2);
  assert.equal(browser.__state.windows.length, 2);

  dashboard = await onMessage({ type: "atm:get-dashboard-state" });
  assert.equal(dashboard.state.tabSets.length, 1, "restoring a Tab Set must not consume its recovery record");
  assert.equal(dashboard.snapshot.windows.flatMap((window) => window.tabs).length, 4);
});
