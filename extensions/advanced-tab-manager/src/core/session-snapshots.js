import {
  DEFAULT_SNAPSHOT_RETENTION,
  MAX_SNAPSHOT_RETENTION,
  MIN_SNAPSHOT_RETENTION
} from "./persistent-state.js";
import { captureWindowAsTabSet } from "./tab-sets.js";

export function normalizeSnapshotRetention(value) {
  const parsed = typeof value === "string" && value.trim() ? Number(value) : value;
  if (!Number.isInteger(parsed) || parsed < MIN_SNAPSHOT_RETENTION || parsed > MAX_SNAPSHOT_RETENTION) {
    return { ok: false, reason: "invalid-snapshot-retention" };
  }
  return { ok: true, value: parsed };
}

export function snapshotTabCount(snapshot) {
  return Array.isArray(snapshot?.windows)
    ? snapshot.windows.reduce((sum, window) => sum + (Array.isArray(window?.items) ? window.items.length : 0), 0)
    : 0;
}

export function trimSessionSnapshots(snapshots, retention = DEFAULT_SNAPSHOT_RETENTION) {
  const normalized = normalizeSnapshotRetention(retention);
  if (!normalized.ok) throw new Error(normalized.reason);
  return [...(Array.isArray(snapshots) ? snapshots : [])]
    .sort((left, right) => (right?.createdAt || 0) - (left?.createdAt || 0))
    .slice(0, normalized.value);
}

export function captureSessionSnapshot({ snapshot, idFactory, now = Date.now() }) {
  if (!snapshot || !Array.isArray(snapshot.windows) || !Array.isArray(snapshot.groups) || typeof idFactory !== "function") {
    throw new Error("invalid session snapshot input");
  }

  const capturedWindows = [];
  let skippedWindowCount = 0;
  let skippedTabCount = 0;

  for (const window of snapshot.windows) {
    if (window?.incognito) {
      skippedWindowCount += 1;
      skippedTabCount += Array.isArray(window?.tabs) ? window.tabs.length : 0;
      continue;
    }

    const captured = captureWindowAsTabSet({
      window,
      groups: snapshot.groups,
      idFactory,
      now
    });
    if (!captured.ok) {
      skippedWindowCount += 1;
      skippedTabCount += Array.isArray(window?.tabs) ? window.tabs.length : 0;
      continue;
    }

    skippedTabCount += captured.skippedTabCount;
    capturedWindows.push({
      id: idFactory(),
      focused: Boolean(window.focused),
      activeItemId: captured.tabSet.activeItemId,
      groups: captured.tabSet.groups,
      items: captured.tabSet.items
    });
  }

  if (!capturedWindows.length) {
    return { ok: false, reason: "no-restorable-windows", skippedWindowCount, skippedTabCount };
  }

  return {
    ok: true,
    skippedWindowCount,
    skippedTabCount,
    sessionSnapshot: {
      id: idFactory(),
      createdAt: now,
      windows: capturedWindows
    }
  };
}
