import { flattenTabs } from "../core/state.js";
import {
  PersistentStateError,
  commitPersistentMutation,
  readPersistentStateRecord,
  restorePersistentRecord
} from "../core/persistent-state.js";
import { captureWindowAsTabSet, prepareStashedItem } from "../core/tab-sets.js";
import {
  captureSessionSnapshot,
  normalizeSnapshotRetention,
  snapshotTabCount,
  trimSessionSnapshots
} from "../core/session-snapshots.js";
import { createThenRemoveStored, persistThenClose } from "../core/stash-transaction.js";

export function createSavedState({ browser, readLiveSnapshot, setTreeParent, ensureLogicalId, broadcastChange, idFactory }) {
  let persistentOperationTail = Promise.resolve();

  function serializePersistentOperation(operation) {
    const run = persistentOperationTail.then(operation, operation);
    persistentOperationTail = run.catch(() => {});
    return run;
  }

  function reasonFromError(error) {
    if (error instanceof PersistentStateError) return error.code;
    return "operation-failed";
  }

  async function readOrganizationalState() {
    return serializePersistentOperation(async () => {
      try {
        const record = await readPersistentStateRecord(browser.storage.local);
        return { ok: true, state: record.state };
      } catch (error) {
        console.error("Advanced Tab Manager persistent state could not be read", error);
        return { ok: false, reason: reasonFromError(error), state: null };
      }
    });
  }

  async function readDashboardState() {
    return serializePersistentOperation(async () => {
      try {
        const [snapshot, record] = await Promise.all([
          readLiveSnapshot(),
          readPersistentStateRecord(browser.storage.local)
        ]);
        return { ok: true, snapshot, state: record.state };
      } catch (error) {
        console.error("Advanced Tab Manager dashboard state could not be read", error);
        return { ok: false, reason: reasonFromError(error), snapshot: null, state: null };
      }
    });
  }

async function saveFocusedWindowAsTabSet(name = "") {
  return serializePersistentOperation(async () => {
    try {
      const snapshot = await readLiveSnapshot();
      const sourceWindow = snapshot.windows.find((window) => window.focused) || snapshot.windows[0];
      if (!sourceWindow) return { ok: false, reason: "no-normal-window" };

      const captured = captureWindowAsTabSet({
        window: sourceWindow,
        groups: snapshot.groups,
        name,
        idFactory: idFactory,
        now: Date.now()
      });
      if (!captured.ok) return captured;

      const committed = await commitPersistentMutation({
        storage: browser.storage.local,
        mutate(state) {
          state.tabSets.unshift(captured.tabSet);
          return state;
        }
      });
      if (!committed.ok) {
        return { ok: false, reason: "storage-verification-failed", rolledBack: committed.rolledBack };
      }

      broadcastChange("tab-set-saved");
      return {
        ok: true,
        tabSetId: captured.tabSet.id,
        name: captured.tabSet.name,
        itemCount: captured.tabSet.items.length,
        skippedTabCount: captured.skippedTabCount
      };
    } catch (error) {
      console.error("Advanced Tab Manager could not save a Tab Set", error);
      return { ok: false, reason: reasonFromError(error) };
    }
  });
}

async function deleteTabSet(tabSetId) {
  return serializePersistentOperation(async () => {
    try {
      const record = await readPersistentStateRecord(browser.storage.local);
      if (!record.state.tabSets.some((tabSet) => tabSet.id === tabSetId)) {
        return { ok: false, reason: "tab-set-not-found" };
      }

      const committed = await commitPersistentMutation({
        storage: browser.storage.local,
        mutate(state) {
          state.tabSets = state.tabSets.filter((tabSet) => tabSet.id !== tabSetId);
          return state;
        }
      });
      if (!committed.ok) return { ok: false, reason: "storage-verification-failed", rolledBack: committed.rolledBack };
      broadcastChange("tab-set-deleted");
      return { ok: true };
    } catch (error) {
      return { ok: false, reason: reasonFromError(error) };
    }
  });
}

async function stashTab(tabId) {
  return serializePersistentOperation(async () => {
    try {
      const snapshot = await readLiveSnapshot();
      const tab = flattenTabs(snapshot).find((candidate) => candidate.id === tabId);
      if (!tab) return { ok: false, reason: "tab-not-found" };

      const prepared = prepareStashedItem({
        tab,
        groups: snapshot.groups,
        idFactory: idFactory,
        now: Date.now()
      });
      if (!prepared.ok) return prepared;

      const result = await persistThenClose({
        persist: () => commitPersistentMutation({
          storage: browser.storage.local,
          mutate(state) {
            state.stashedItems.unshift(prepared.item);
            return state;
          }
        }),
        closeSource: () => browser.tabs.remove(tabId),
        rollbackPersist: (previousRecord) => restorePersistentRecord(browser.storage.local, previousRecord)
      });

      if (!result.ok) {
        return {
          ok: false,
          reason: result.phase === "persist" ? "storage-verification-failed" : "tab-close-failed",
          rolledBack: result.rolledBack ?? result.persisted?.rolledBack ?? false
        };
      }

      broadcastChange("tab-stashed");
      return { ok: true, stashedItemId: prepared.item.id, title: prepared.item.title };
    } catch (error) {
      console.error("Advanced Tab Manager could not stash a tab", error);
      return { ok: false, reason: reasonFromError(error) };
    }
  });
}

async function deleteStashedItem(stashedItemId) {
  return serializePersistentOperation(async () => {
    try {
      const record = await readPersistentStateRecord(browser.storage.local);
      if (!record.state.stashedItems.some((item) => item.id === stashedItemId)) {
        return { ok: false, reason: "stashed-item-not-found" };
      }

      const committed = await commitPersistentMutation({
        storage: browser.storage.local,
        mutate(state) {
          state.stashedItems = state.stashedItems.filter((item) => item.id !== stashedItemId);
          return state;
        }
      });
      if (!committed.ok) return { ok: false, reason: "storage-verification-failed", rolledBack: committed.rolledBack };
      broadcastChange("stashed-item-deleted");
      return { ok: true };
    } catch (error) {
      return { ok: false, reason: reasonFromError(error) };
    }
  });
}

async function clearSavedItems() {
  return serializePersistentOperation(async () => {
    try {
      const record = await readPersistentStateRecord(browser.storage.local);
      if (!record.state.tabSets.length && !record.state.stashedItems.length) return { ok: true, changed: false };

      const committed = await commitPersistentMutation({
        storage: browser.storage.local,
        mutate(state) {
          state.tabSets = [];
          state.stashedItems = [];
          return state;
        }
      });
      if (!committed.ok) return { ok: false, reason: "storage-verification-failed", rolledBack: committed.rolledBack };
      broadcastChange("saved-items-cleared");
      return { ok: true, changed: true };
    } catch (error) {
      return { ok: false, reason: reasonFromError(error) };
    }
  });
}

async function restoreStashedItem(stashedItemId) {
  return serializePersistentOperation(async () => {
    let item;
    try {
      const record = await readPersistentStateRecord(browser.storage.local);
      item = record.state.stashedItems.find((candidate) => candidate.id === stashedItemId);
      if (!item) return { ok: false, reason: "stashed-item-not-found" };
    } catch (error) {
      return { ok: false, reason: reasonFromError(error) };
    }

    const result = await createThenRemoveStored({
      createReplacement: async () => {
        const snapshot = await readLiveSnapshot();
        const targetWindow = snapshot.windows.find((window) => window.focused) || snapshot.windows[0];
        if (!targetWindow) throw new Error("no normal window is available");

        const created = await browser.tabs.create({
          windowId: targetWindow.id,
          url: item.url,
          active: true
        });
        if (item.pinned) await browser.tabs.update(created.id, { pinned: true });
        await ensureLogicalId(created.id);

        let treeRestored = false;
        if (item.treeParentLogicalId) {
          const current = await readLiveSnapshot();
          const parent = flattenTabs(current).find((tab) =>
            tab.windowId === targetWindow.id && tab.logicalId === item.treeParentLogicalId
          );
          if (parent) {
            const attached = await setTreeParent(created.id, parent.id);
            treeRestored = Boolean(attached.ok);
          }
        }
        return { tabId: created.id, treeRestored };
      },
      removeStored: () => commitPersistentMutation({
        storage: browser.storage.local,
        mutate(state) {
          state.stashedItems = state.stashedItems.filter((candidate) => candidate.id !== stashedItemId);
          return state;
        }
      }),
      rollbackReplacement: async (replacement) => {
        await browser.tabs.remove(replacement.tabId);
        return true;
      }
    });

    if (!result.ok) {
      return {
        ok: false,
        reason: result.phase === "create" ? "tab-restore-failed" : "storage-verification-failed",
        rolledBack: result.rolledBack ?? false
      };
    }

    broadcastChange("stashed-item-restored");
    return { ok: true, tabId: result.replacement.tabId, treeRestored: result.replacement.treeRestored };
  });
}

async function createSessionSnapshot() {
  return serializePersistentOperation(async () => {
    try {
      const snapshot = await readLiveSnapshot();
      const captured = captureSessionSnapshot({
        snapshot,
        idFactory,
        now: Date.now()
      });
      if (!captured.ok) return captured;

      let prunedCount = 0;
      const committed = await commitPersistentMutation({
        storage: browser.storage.local,
        mutate(state) {
          const next = [captured.sessionSnapshot, ...state.sessionSnapshots];
          const retained = trimSessionSnapshots(next, state.snapshotRetention);
          prunedCount = next.length - retained.length;
          state.sessionSnapshots = retained;
          return state;
        }
      });
      if (!committed.ok) return { ok: false, reason: "storage-verification-failed", rolledBack: committed.rolledBack };

      broadcastChange("session-snapshot-created");
      return {
        ok: true,
        sessionSnapshotId: captured.sessionSnapshot.id,
        windowCount: captured.sessionSnapshot.windows.length,
        tabCount: snapshotTabCount(captured.sessionSnapshot),
        skippedWindowCount: captured.skippedWindowCount,
        skippedTabCount: captured.skippedTabCount,
        prunedCount
      };
    } catch (error) {
      console.error("Advanced Tab Manager could not create a session snapshot", error);
      return { ok: false, reason: reasonFromError(error) };
    }
  });
}

async function deleteSessionSnapshot(sessionSnapshotId) {
  return serializePersistentOperation(async () => {
    try {
      const record = await readPersistentStateRecord(browser.storage.local);
      if (!record.state.sessionSnapshots.some((snapshot) => snapshot.id === sessionSnapshotId)) {
        return { ok: false, reason: "session-snapshot-not-found" };
      }
      const committed = await commitPersistentMutation({
        storage: browser.storage.local,
        mutate(state) {
          state.sessionSnapshots = state.sessionSnapshots.filter((snapshot) => snapshot.id !== sessionSnapshotId);
          return state;
        }
      });
      if (!committed.ok) return { ok: false, reason: "storage-verification-failed", rolledBack: committed.rolledBack };
      broadcastChange("session-snapshot-deleted");
      return { ok: true };
    } catch (error) {
      return { ok: false, reason: reasonFromError(error) };
    }
  });
}

async function setSnapshotRetention(value) {
  return serializePersistentOperation(async () => {
    const normalized = normalizeSnapshotRetention(value);
    if (!normalized.ok) return normalized;
    try {
      let prunedCount = 0;
      const committed = await commitPersistentMutation({
        storage: browser.storage.local,
        mutate(state) {
          state.snapshotRetention = normalized.value;
          const retained = trimSessionSnapshots(state.sessionSnapshots, normalized.value);
          prunedCount = state.sessionSnapshots.length - retained.length;
          state.sessionSnapshots = retained;
          return state;
        }
      });
      if (!committed.ok) return { ok: false, reason: "storage-verification-failed", rolledBack: committed.rolledBack };
      broadcastChange("session-snapshot-retention-updated");
      return { ok: true, retention: normalized.value, prunedCount };
    } catch (error) {
      return { ok: false, reason: reasonFromError(error) };
    }
  });
}

async function restoreCapturedWindow(windowSnapshot) {
  const items = [...windowSnapshot.items].sort((left, right) => left.sourceIndex - right.sourceIndex);
  if (!items.length) throw new Error("empty session snapshot window");

  const createdWindow = await browser.windows.create({ url: items[0].url });
  const restoredWindowId = createdWindow.id;
  const firstRuntimeTab = createdWindow.tabs?.[0];
  if (!Number.isInteger(restoredWindowId) || !Number.isInteger(firstRuntimeTab?.id)) {
    throw new Error("new window did not return a usable tab");
  }

  const runtimeTabByItemId = new Map([[items[0].id, firstRuntimeTab.id]]);
  for (const item of items.slice(1)) {
    const created = await browser.tabs.create({
      windowId: restoredWindowId,
      url: item.url,
      active: false
    });
    runtimeTabByItemId.set(item.id, created.id);
  }

  for (const group of windowSnapshot.groups) {
    const tabIds = items
      .filter((item) => item.groupId === group.id && !item.pinned)
      .map((item) => runtimeTabByItemId.get(item.id))
      .filter(Number.isInteger);
    if (!tabIds.length) continue;
    const runtimeGroupId = await browser.tabs.group({
      createProperties: { windowId: restoredWindowId },
      tabIds
    });
    await browser.tabGroups.update(runtimeGroupId, {
      title: group.title,
      color: group.color,
      collapsed: group.collapsed
    });
  }

  for (const item of items) {
    if (item.pinned) await browser.tabs.update(runtimeTabByItemId.get(item.id), { pinned: true });
  }

  for (const item of items) {
    if (!item.parentItemId) continue;
    const attached = await setTreeParent(
      runtimeTabByItemId.get(item.id),
      runtimeTabByItemId.get(item.parentItemId)
    );
    if (!attached.ok) throw new Error(`session snapshot tree restore failed: ${attached.reason}`);
  }

  const activeTabId = runtimeTabByItemId.get(windowSnapshot.activeItemId) || runtimeTabByItemId.get(items[0].id);
  await browser.tabs.update(activeTabId, { active: true });
  return { windowId: restoredWindowId, restoredTabCount: items.length };
}

async function restoreSessionSnapshot(sessionSnapshotId) {
  return serializePersistentOperation(async () => {
    let sessionSnapshot;
    try {
      const record = await readPersistentStateRecord(browser.storage.local);
      sessionSnapshot = record.state.sessionSnapshots.find((snapshot) => snapshot.id === sessionSnapshotId);
      if (!sessionSnapshot) return { ok: false, reason: "session-snapshot-not-found" };
    } catch (error) {
      return { ok: false, reason: reasonFromError(error) };
    }

    const createdWindowIds = [];
    let restoredTabCount = 0;
    try {
      const runtimeWindowBySavedId = new Map();
      for (const savedWindow of sessionSnapshot.windows) {
        const restored = await restoreCapturedWindow(savedWindow);
        createdWindowIds.push(restored.windowId);
        runtimeWindowBySavedId.set(savedWindow.id, restored.windowId);
        restoredTabCount += restored.restoredTabCount;
      }

      const focusedSavedWindow = sessionSnapshot.windows.find((window) => window.focused) || sessionSnapshot.windows[0];
      const focusedWindowId = runtimeWindowBySavedId.get(focusedSavedWindow.id);
      if (Number.isInteger(focusedWindowId)) await browser.windows.update(focusedWindowId, { focused: true });

      broadcastChange("session-snapshot-restored");
      return {
        ok: true,
        restoredWindowCount: createdWindowIds.length,
        restoredTabCount
      };
    } catch (error) {
      console.error("Advanced Tab Manager could not restore a session snapshot", error);
      for (const windowId of [...createdWindowIds].reverse()) {
        try { await browser.windows.remove(windowId); } catch {}
      }
      return {
        ok: false,
        reason: "session-snapshot-restore-failed",
        rolledBackWindowCount: createdWindowIds.length
      };
    }
  });
}

async function restoreTabSet(tabSetId) {
  return serializePersistentOperation(async () => {
    let tabSet;
    try {
      const record = await readPersistentStateRecord(browser.storage.local);
      tabSet = record.state.tabSets.find((candidate) => candidate.id === tabSetId);
      if (!tabSet) return { ok: false, reason: "tab-set-not-found" };
    } catch (error) {
      return { ok: false, reason: reasonFromError(error) };
    }

    const items = [...tabSet.items].sort((left, right) => left.sourceIndex - right.sourceIndex);
    if (!items.length) return { ok: false, reason: "empty-tab-set" };

    let restoredWindowId = null;
    try {
      const createdWindow = await browser.windows.create({ url: items[0].url });
      restoredWindowId = createdWindow.id;
      const firstRuntimeTab = createdWindow.tabs?.[0];
      if (!Number.isInteger(restoredWindowId) || !Number.isInteger(firstRuntimeTab?.id)) {
        throw new Error("new window did not return a usable tab");
      }

      const runtimeTabByItemId = new Map([[items[0].id, firstRuntimeTab.id]]);
      for (const item of items.slice(1)) {
        const created = await browser.tabs.create({
          windowId: restoredWindowId,
          url: item.url,
          active: false
        });
        runtimeTabByItemId.set(item.id, created.id);
      }

      for (const group of tabSet.groups) {
        const tabIds = items
          .filter((item) => item.groupId === group.id && !item.pinned)
          .map((item) => runtimeTabByItemId.get(item.id))
          .filter(Number.isInteger);
        if (!tabIds.length) continue;

        const runtimeGroupId = await browser.tabs.group({
          createProperties: { windowId: restoredWindowId },
          tabIds
        });
        await browser.tabGroups.update(runtimeGroupId, {
          title: group.title,
          color: group.color,
          collapsed: group.collapsed
        });
      }

      for (const item of items) {
        if (!item.pinned) continue;
        await browser.tabs.update(runtimeTabByItemId.get(item.id), { pinned: true });
      }

      for (const item of items) {
        if (!item.parentItemId) continue;
        const childTabId = runtimeTabByItemId.get(item.id);
        const parentTabId = runtimeTabByItemId.get(item.parentItemId);
        const attached = await setTreeParent(childTabId, parentTabId);
        if (!attached.ok) throw new Error(`tree restore failed: ${attached.reason}`);
      }

      const activeTabId = runtimeTabByItemId.get(tabSet.activeItemId) || runtimeTabByItemId.get(items[0].id);
      await browser.tabs.update(activeTabId, { active: true });
      await browser.windows.update(restoredWindowId, { focused: true });

      broadcastChange("tab-set-restored");
      return { ok: true, windowId: restoredWindowId, restoredTabCount: items.length };
    } catch (error) {
      console.error("Advanced Tab Manager could not restore a Tab Set", error);
      if (Number.isInteger(restoredWindowId)) {
        try {
          await browser.windows.remove(restoredWindowId);
        } catch {
          // Best-effort rollback. The saved Tab Set remains authoritative recovery state.
        }
      }
      return { ok: false, reason: "tab-set-restore-failed" };
    }
  });
}


  return {
    clearSavedItems,
    createSessionSnapshot,
    deleteSessionSnapshot,
    deleteStashedItem,
    deleteTabSet,
    readDashboardState,
    readOrganizationalState,
    restoreSessionSnapshot,
    restoreStashedItem,
    restoreTabSet,
    saveFocusedWindowAsTabSet,
    setSnapshotRetention,
    stashTab
  };
}
