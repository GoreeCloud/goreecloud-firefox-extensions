import test from "node:test";
import assert from "node:assert/strict";
import { migrateTab } from "../src/tab-migration.js";

function browserMock({
  source = { id: 7, cookieStoreId: "firefox-default", windowId: 1, index: 3, active: true, pinned: false },
  failUrlUpdate = false,
  failSourceRemoval = false
} = {}) {
  const calls = [];
  const api = {
    tabs: {
      async get(id) {
        calls.push(["get", id]);
        return { ...source };
      },
      async create(properties) {
        calls.push(["create", properties]);
        return { id: 42, ...properties };
      },
      async update(id, properties) {
        calls.push(["update", id, properties]);
        if (failUrlUpdate && properties.url) throw new Error("navigation rejected");
        return { id, ...properties };
      },
      async remove(id) {
        calls.push(["remove", id]);
        if (failSourceRemoval && id === source.id) throw new Error("source removal rejected");
      }
    }
  };
  return { api, calls };
}

test("does nothing when the tab already uses the target Webspace", async () => {
  const { api, calls } = browserMock({
    source: { id: 7, cookieStoreId: "firefox-container-4", windowId: 1, index: 3, active: true, pinned: false }
  });
  const result = await migrateTab(api, {
    sourceTabId: 7,
    url: "https://google.com",
    targetCookieStoreId: "firefox-container-4"
  });
  assert.equal(result.status, "already-target");
  assert.deepEqual(calls, [["get", 7]]);
});

test("stages a blank destination before starting website navigation", async () => {
  const { api, calls } = browserMock();
  const marked = [];
  const result = await migrateTab(api, {
    sourceTabId: 7,
    url: "https://mail.google.com/inbox",
    targetCookieStoreId: "firefox-container-4",
    onTransition: (tabId) => marked.push(tabId)
  });

  assert.equal(result.status, "migrated");
  assert.deepEqual(marked, [7, 42]);
  assert.deepEqual(calls[1], ["create", {
    url: "about:blank",
    cookieStoreId: "firefox-container-4",
    windowId: 1,
    index: 3,
    active: false,
    pinned: false
  }]);
  assert.deepEqual(calls[2], ["update", 42, { url: "https://mail.google.com/inbox" }]);
  assert.deepEqual(calls[3], ["update", 42, { active: true }]);
  assert.deepEqual(calls[4], ["remove", 7]);
});

test("keeps the source tab when destination navigation setup fails", async () => {
  const { api, calls } = browserMock({ failUrlUpdate: true });
  await assert.rejects(() => migrateTab(api, {
    sourceTabId: 7,
    url: "https://google.com",
    targetCookieStoreId: "firefox-container-4"
  }), /navigation rejected/);

  assert.deepEqual(calls.at(-1), ["remove", 42]);
  assert.equal(calls.some((call) => call[0] === "remove" && call[1] === 7), false);
});

test("keeps the replacement if source cleanup fails", async () => {
  const { api } = browserMock({ failSourceRemoval: true });
  const originalWarn = console.warn;
  console.warn = () => {};
  try {
    const result = await migrateTab(api, {
      sourceTabId: 7,
      url: "https://google.com",
      targetCookieStoreId: "firefox-container-4"
    });
    assert.equal(result.status, "migrated");
    assert.equal(result.tabId, 42);
  } finally {
    console.warn = originalWarn;
  }
});
