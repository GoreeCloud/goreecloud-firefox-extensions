import assert from "node:assert/strict";
import test from "node:test";

import {
  captureSessionSnapshot,
  normalizeSnapshotRetention,
  snapshotTabCount,
  trimSessionSnapshots
} from "../src/core/session-snapshots.js";

function idFactory() {
  let value = 0;
  return () => `id-${++value}`;
}

function liveSnapshot() {
  return {
    windows: [
      {
        id: 1,
        focused: true,
        incognito: false,
        tabs: [
          { id: 1, windowId: 1, index: 0, active: true, pinned: false, incognito: false, groupId: 7, title: "A", url: "https://a.example/", logicalId: "a", treeParentLogicalId: null },
          { id: 2, windowId: 1, index: 1, active: false, pinned: false, incognito: false, groupId: 7, title: "B", url: "https://b.example/", logicalId: "b", treeParentLogicalId: "a" },
          { id: 3, windowId: 1, index: 2, active: false, pinned: false, incognito: false, groupId: -1, title: "Unsupported", url: "about:config", logicalId: "c", treeParentLogicalId: null }
        ]
      },
      {
        id: 2,
        focused: false,
        incognito: true,
        tabs: [{ id: 4, windowId: 2, index: 0, active: true, pinned: false, incognito: true, groupId: -1, title: "Private", url: "https://private.example/" }]
      }
    ],
    groups: [{ id: 7, windowId: 1, title: "Research", color: "blue", collapsed: false }]
  };
}

test("session snapshot captures only restorable non-private state with trees and groups", () => {
  const captured = captureSessionSnapshot({ snapshot: liveSnapshot(), idFactory: idFactory(), now: 100 });
  assert.equal(captured.ok, true);
  assert.equal(captured.sessionSnapshot.createdAt, 100);
  assert.equal(captured.sessionSnapshot.windows.length, 1);
  assert.equal(snapshotTabCount(captured.sessionSnapshot), 2);
  assert.equal(captured.skippedWindowCount, 1);
  assert.equal(captured.skippedTabCount, 2);
  const savedWindow = captured.sessionSnapshot.windows[0];
  assert.equal(savedWindow.groups.length, 1);
  assert.equal(savedWindow.items[1].parentItemId, savedWindow.items[0].id);
  assert.equal(JSON.stringify(captured.sessionSnapshot).includes("private.example"), false);
  assert.equal(JSON.stringify(captured.sessionSnapshot).includes("about:config"), false);
});

test("snapshot retention is bounded and keeps newest snapshots", () => {
  assert.deepEqual(normalizeSnapshotRetention(10), { ok: true, value: 10 });
  assert.deepEqual(normalizeSnapshotRetention("5"), { ok: true, value: 5 });
  assert.equal(normalizeSnapshotRetention(0).ok, false);
  assert.equal(normalizeSnapshotRetention(51).ok, false);

  const snapshots = [
    { id: "old", createdAt: 1, windows: [] },
    { id: "new", createdAt: 3, windows: [] },
    { id: "middle", createdAt: 2, windows: [] }
  ];
  assert.deepEqual(trimSessionSnapshots(snapshots, 2).map((item) => item.id), ["new", "middle"]);
});

test("capture fails closed when no restorable non-private window remains", () => {
  const captured = captureSessionSnapshot({
    snapshot: {
      windows: [{ id: 1, focused: true, incognito: false, tabs: [{ id: 1, index: 0, incognito: false, url: "about:config" }] }],
      groups: []
    },
    idFactory: idFactory(),
    now: 100
  });
  assert.equal(captured.ok, false);
  assert.equal(captured.reason, "no-restorable-windows");
});
