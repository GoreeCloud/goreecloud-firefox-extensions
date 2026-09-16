import { createThenRemoveStored } from "../core/stash-transaction.js";
import {
  SnoozeStateError,
  commitSnoozeMutation,
  readSnoozeStateRecord,
  restoreSnoozeRecord
} from "../core/snooze-store.js";
import {
  SNOOZE_ALARM_PREFIX,
  SNOOZE_RETRY_DELAY_MS,
  alarmNameForSnooze,
  nextSnoozeAlarmTime,
  prepareSnoozedItem,
  snoozeIdFromAlarmName
} from "../core/snooze.js";
import { persistScheduleThenClose } from "../core/snooze-transaction.js";

export function createSnoozeManager({ browser, readLiveSnapshot, setTreeParent, ensureLogicalId, broadcastChange, idFactory }) {
  let operationTail = Promise.resolve();

  function serialize(operation) {
    const run = operationTail.then(operation, operation);
    operationTail = run.catch(() => {});
    return run;
  }

  function reasonFromError(error) {
    if (error instanceof SnoozeStateError) return error.code;
    return "operation-failed";
  }

  function flatten(snapshot) {
    return snapshot.windows.flatMap((window) => window.tabs);
  }

  async function scheduleVerified(item, when = nextSnoozeAlarmTime(item.wakeAt)) {
    const name = alarmNameForSnooze(item.id);
    await browser.alarms.create(name, { when });
    const alarm = await browser.alarms.get(name);
    return Boolean(alarm && alarm.name === name);
  }

  async function clearAlarm(itemId) {
    return browser.alarms.clear(alarmNameForSnooze(itemId));
  }

  async function readSnoozeState() {
    return serialize(async () => {
      try {
        const record = await readSnoozeStateRecord(browser.storage.local);
        return { ok: true, state: record.state };
      } catch (error) {
        console.error("Advanced Tab Manager snooze state could not be read", error);
        return { ok: false, reason: reasonFromError(error), state: null };
      }
    });
  }

  async function snoozeTab(tabId, wakeAt) {
    return serialize(async () => {
      try {
        const snapshot = await readLiveSnapshot();
        const tab = flatten(snapshot).find((candidate) => candidate.id === tabId);
        if (!tab) return { ok: false, reason: "tab-not-found" };

        const prepared = prepareSnoozedItem({
          tab,
          groups: snapshot.groups,
          wakeAt,
          idFactory,
          now: Date.now()
        });
        if (!prepared.ok) return prepared;

        const result = await persistScheduleThenClose({
          persist: () => commitSnoozeMutation({
            storage: browser.storage.local,
            mutate(state) {
              state.items.unshift(prepared.item);
              return state;
            }
          }),
          schedule: () => browser.alarms.create(alarmNameForSnooze(prepared.item.id), { when: prepared.item.wakeAt }),
          verifySchedule: async () => Boolean(await browser.alarms.get(alarmNameForSnooze(prepared.item.id))),
          closeSource: () => browser.tabs.remove(tabId),
          rollbackPersist: (previousRecord) => restoreSnoozeRecord(browser.storage.local, previousRecord),
          clearSchedule: () => clearAlarm(prepared.item.id)
        });

        if (!result.ok) {
          return {
            ok: false,
            reason: result.phase === "persist" ? "storage-verification-failed" : result.phase === "schedule" ? "alarm-schedule-failed" : "tab-close-failed",
            rolledBack: result.rolledBack ?? result.persisted?.rolledBack ?? false,
            scheduleCleared: result.scheduleCleared ?? false
          };
        }

        broadcastChange("tab-snoozed");
        return { ok: true, snoozedItemId: prepared.item.id, title: prepared.item.title, wakeAt: prepared.item.wakeAt };
      } catch (error) {
        console.error("Advanced Tab Manager could not snooze a tab", error);
        return { ok: false, reason: reasonFromError(error) };
      }
    });
  }

  async function createReplacement(item) {
    const snapshot = await readLiveSnapshot();
    const targetWindow = snapshot.windows.find((window) => window.focused && !window.incognito)
      || snapshot.windows.find((window) => !window.incognito);
    if (!targetWindow) throw new Error("no normal window is available");

    let created = null;
    try {
      created = await browser.tabs.create({ windowId: targetWindow.id, url: item.url, active: true });
      if (item.pinned) await browser.tabs.update(created.id, { pinned: true });
      if (item.nativeGroup && !item.pinned) {
        const groupId = await browser.tabs.group({
          createProperties: { windowId: targetWindow.id },
          tabIds: [created.id]
        });
        await browser.tabGroups.update(groupId, item.nativeGroup);
      }
      await ensureLogicalId(created.id);

      let treeRestored = false;
      if (item.treeParentLogicalId) {
        const current = await readLiveSnapshot();
        const parent = flatten(current).find((tab) =>
          tab.windowId === targetWindow.id && tab.logicalId === item.treeParentLogicalId
        );
        if (parent) {
          const attached = await setTreeParent(created.id, parent.id);
          treeRestored = Boolean(attached.ok);
        }
      }
      return { tabId: created.id, treeRestored };
    } catch (error) {
      if (Number.isInteger(created?.id)) {
        try { await browser.tabs.remove(created.id); } catch {}
      }
      throw error;
    }
  }

  async function restoreSnoozedItemInternal(snoozedItemId) {
    let item;
    try {
      const record = await readSnoozeStateRecord(browser.storage.local);
      item = record.state.items.find((candidate) => candidate.id === snoozedItemId);
      if (!item) return { ok: false, reason: "snoozed-item-not-found" };
    } catch (error) {
      return { ok: false, reason: reasonFromError(error) };
    }

    const result = await createThenRemoveStored({
      createReplacement: () => createReplacement(item),
      removeStored: () => commitSnoozeMutation({
        storage: browser.storage.local,
        mutate(state) {
          state.items = state.items.filter((candidate) => candidate.id !== snoozedItemId);
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

    await clearAlarm(snoozedItemId).catch(() => false);
    broadcastChange("snoozed-item-restored");
    return { ok: true, tabId: result.replacement.tabId, treeRestored: result.replacement.treeRestored };
  }

  async function restoreSnoozedItem(snoozedItemId) {
    return serialize(() => restoreSnoozedItemInternal(snoozedItemId));
  }

  async function rescheduleSnoozedItem(snoozedItemId, wakeAt) {
    return serialize(async () => {
      if (!Number.isInteger(wakeAt) || wakeAt <= Date.now()) return { ok: false, reason: "deadline-not-in-future" };

      let previousItem;
      let committed;
      try {
        const record = await readSnoozeStateRecord(browser.storage.local);
        previousItem = record.state.items.find((candidate) => candidate.id === snoozedItemId);
        if (!previousItem) return { ok: false, reason: "snoozed-item-not-found" };

        committed = await commitSnoozeMutation({
          storage: browser.storage.local,
          mutate(state) {
            const item = state.items.find((candidate) => candidate.id === snoozedItemId);
            item.wakeAt = wakeAt;
            return state;
          }
        });
        if (!committed.ok) return { ok: false, reason: "storage-verification-failed", rolledBack: committed.rolledBack };

        const scheduled = await scheduleVerified({ ...previousItem, wakeAt }, wakeAt);
        if (!scheduled) throw new Error("rescheduled alarm verification failed");

        broadcastChange("snoozed-item-rescheduled");
        return { ok: true, snoozedItemId, wakeAt };
      } catch (error) {
        let rolledBack = false;
        let previousAlarmRestored = false;
        if (committed?.ok) {
          const rollback = await restoreSnoozeRecord(browser.storage.local, committed.previousRecord);
          rolledBack = Boolean(rollback.ok);
          try {
            previousAlarmRestored = await scheduleVerified(previousItem, nextSnoozeAlarmTime(previousItem.wakeAt));
          } catch {
            previousAlarmRestored = false;
          }
        }
        return { ok: false, reason: "alarm-schedule-failed", rolledBack, previousAlarmRestored };
      }
    });
  }

  async function handleAlarm(alarm) {
    const itemId = snoozeIdFromAlarmName(alarm?.name);
    if (!itemId) return { ok: true, ignored: true };
    return serialize(async () => {
      const result = await restoreSnoozedItemInternal(itemId);
      if (result.ok || result.reason === "snoozed-item-not-found") return result;

      try {
        await browser.alarms.create(alarmNameForSnooze(itemId), { when: Date.now() + SNOOZE_RETRY_DELAY_MS });
        const retry = await browser.alarms.get(alarmNameForSnooze(itemId));
        return { ...result, retryScheduled: Boolean(retry) };
      } catch (error) {
        return { ...result, retryScheduled: false, retryError: error };
      }
    });
  }

  async function reconcileSnoozeAlarms() {
    return serialize(async () => {
      try {
        const record = await readSnoozeStateRecord(browser.storage.local);
        const items = record.state.items;
        const expectedNames = new Set(items.map((item) => alarmNameForSnooze(item.id)));
        const currentAlarms = await browser.alarms.getAll();

        let cleared = 0;
        for (const alarm of currentAlarms) {
          if (alarm.name?.startsWith(SNOOZE_ALARM_PREFIX) && !expectedNames.has(alarm.name)) {
            if (await browser.alarms.clear(alarm.name)) cleared += 1;
          }
        }

        let scheduled = 0;
        let failed = 0;
        const now = Date.now();
        for (const item of items) {
          try {
            if (await scheduleVerified(item, nextSnoozeAlarmTime(item.wakeAt, now))) scheduled += 1;
            else failed += 1;
          } catch {
            failed += 1;
          }
        }
        return { ok: failed === 0, scheduled, cleared, failed, itemCount: items.length };
      } catch (error) {
        console.error("Advanced Tab Manager could not reconstruct snooze alarms", error);
        return { ok: false, reason: reasonFromError(error) };
      }
    });
  }

  return {
    handleAlarm,
    readSnoozeState,
    reconcileSnoozeAlarms,
    rescheduleSnoozedItem,
    restoreSnoozedItem,
    snoozeTab
  };
}
