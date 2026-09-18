import { readPersistentStateRecord } from "../core/persistent-state.js";
import { readSnoozeStateRecord } from "../core/snooze-store.js";
import { readRuleStateRecord } from "../core/rule-state.js";
import {
  commitPortableClear,
  commitPortableImport,
  createPortableBundle,
  restorePortableRecords
} from "../core/portable-state.js";

export function createPortabilityManager({
  browser,
  getManifest,
  clearTreeRelationships,
  reconcileSnoozeAlarms,
  broadcastChange,
  now = Date.now
}) {
  let operationTail = Promise.resolve();

  function serialize(operation) {
    const run = operationTail.then(operation, operation);
    operationTail = run.catch(() => {});
    return run;
  }

  async function exportPortableState() {
    return serialize(async () => {
      try {
        const [organizational, snooze, rules] = await Promise.all([
          readPersistentStateRecord(browser.storage.local),
          readSnoozeStateRecord(browser.storage.local),
          readRuleStateRecord(browser.storage.local)
        ]);
        return {
          ok: true,
          bundle: createPortableBundle({
            version: String(getManifest().version),
            exportedAt: now(),
            organizational: organizational.state,
            snooze: snooze.state,
            rules: rules.state
          })
        };
      } catch (error) {
        return { ok: false, reason: "portable-export-failed" };
      }
    });
  }

  async function importPortableState(bundle) {
    return serialize(async () => {
      const imported = await commitPortableImport({ storage: browser.storage.local, bundle });
      if (!imported.ok) return imported;

      const alarms = await reconcileSnoozeAlarms();
      if (!alarms.ok) {
        const rollback = await restorePortableRecords(browser.storage.local, imported.previousRecords);
        const restoredAlarms = rollback.ok ? await reconcileSnoozeAlarms() : { ok: false };
        return {
          ok: false,
          reason: "snooze-alarm-reconciliation-failed",
          rolledBack: rollback.ok && restoredAlarms.ok
        };
      }

      broadcastChange("portable-state-imported");
      return { ok: true, sourceVersion: imported.bundle.sourceVersion };
    });
  }

  async function deleteSavedData() {
    return serialize(async () => {
      const cleared = await commitPortableClear({ storage: browser.storage.local });
      if (!cleared.ok) return cleared;

      const relationships = await clearTreeRelationships();
      if (!relationships.ok) {
        const rollback = await restorePortableRecords(browser.storage.local, cleared.previousRecords);
        if (rollback.ok) await reconcileSnoozeAlarms();
        return {
          ok: false,
          reason: "tree-relationship-clear-failed",
          rolledBack: rollback.ok && Boolean(relationships.rolledBack)
        };
      }

      const alarms = await reconcileSnoozeAlarms();
      broadcastChange("saved-data-deleted");
      return {
        ok: true,
        treeRelationshipCount: relationships.cleared,
        snoozeAlarmsReconciled: Boolean(alarms.ok)
      };
    });
  }

  return {
    deleteSavedData,
    exportPortableState,
    importPortableState
  };
}
