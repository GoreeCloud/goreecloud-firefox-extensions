import test from "node:test";
import assert from "node:assert/strict";
import { createDuplicateCleanup } from "../src/background/duplicate-cleanup.js";

function tab(id, overrides = {}) {
  return {
    id,
    logicalId: `logical-${id}`,
    treeParentLogicalId: null,
    windowId: 1,
    index: id,
    groupId: -1,
    active: false,
    highlighted: false,
    pinned: false,
    audible: false,
    muted: false,
    discarded: false,
    hidden: false,
    incognito: false,
    title: `Tab ${id}`,
    url: "https://example.com",
    favIconUrl: "",
    ...overrides
  };
}

function snapshot(tabs) {
  return { schemaVersion: 2, capturedAt: 1, groups: [], windows: [{ id: 1, focused: true, incognito: false, tabs }] };
}

test("background cleanup rechecks live state and closes only currently eligible duplicates", async () => {
  const removed = [];
  const reasons = [];
  const browser = { tabs: { remove: async (ids) => removed.push(...ids) } };
  const cleanup = createDuplicateCleanup({
    browser,
    readLiveSnapshot: async () => snapshot([
      tab(1, { active: true }),
      tab(2),
      tab(3, { pinned: true }),
      tab(4)
    ]),
    broadcastChange: (reason) => reasons.push(reason)
  });
  const result = await cleanup.cleanupExactDuplicates({ url: "https://example.com", keepTabId: 4 });
  assert.equal(result.ok, true);
  assert.equal(result.closed, 1);
  assert.deepEqual(removed, [2]);
  assert.deepEqual(result.blocked.map((item) => item.tabId), [1, 3]);
  assert.deepEqual(reasons, ["duplicate-cleanup"]);
});

test("background cleanup fails closed when review selection is stale", async () => {
  let removeCalled = false;
  const cleanup = createDuplicateCleanup({
    browser: { tabs: { remove: async () => { removeCalled = true; } } },
    readLiveSnapshot: async () => snapshot([tab(1), tab(2)]),
    broadcastChange: () => {}
  });
  const result = await cleanup.cleanupExactDuplicates({ url: "https://example.com", keepTabId: 9 });
  assert.equal(result.ok, false);
  assert.equal(result.reason, "selected-keeper-not-in-current-set");
  assert.equal(removeCalled, false);
});
