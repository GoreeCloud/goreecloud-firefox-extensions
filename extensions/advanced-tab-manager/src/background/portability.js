import {
  PERSISTENT_STATE_KEY,
  PersistentStateError,
  readPersistentStateRecord,
  validatePersistentState
} from "../core/persistent-state.js";
import {
  RULE_STATE_KEY,
  RuleStateError,
  readRuleStateRecord,
  validateRuleState
} from "../core/rule-state.js";
import {
  SNOOZE_STATE_KEY,
  SnoozeStateError,
  readSnoozeStateRecord,
  validateSnoozeState
} from "../core/snooze-store.js";
import {
  PortabilityError,
  buildImportPreview,
  createBackupBundle,
  sha256Hex,
  verifyBackupBundle
} from "../core/portability.js";

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function stateEqual(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function reasonFromError(error) {
  if (error instanceof PortabilityError || error instanceof PersistentStateError || error instanceof RuleStateError || error instanceof SnoozeStateError) {
    return error.code;
  }
  return "operation-failed";
}

async function readAllRecords(storage) {
  const [organizational, snooze, rules] = await Promise.all([
    readPersistentStateRecord(storage),
    readSnoozeStateRecord(storage),
    readRuleStateRecord(storage)
  ]);
  return { organizational, snooze, rules };
}

function recordRevisions(records) {
  return {
    organizational: records.organizational.state.revision,
    snooze: records.snooze.state.revision,
    rules: records.rules.state.revision
  };
}

function revisionsMatch(expected, records) {
  if (!expected || typeof expected !== "object") return false;
  const current = recordRevisions(records);
  return ["organizational", "snooze", "rules"].every((key) => Number.isInteger(expected[key]) && expected[key] === current[key]);
}

function nextImportedStates(imported, currentRecords) {
  const organizational = validatePersistentState({
    ...clone(imported.organizational),
    revision: currentRecords.organizational.state.revision + 1
  });
  const snooze = validateSnoozeState({
    ...clone(imported.snooze),
    revision: currentRecords.snooze.state.revision + 1
  });
  const rules = validateRuleState({
    ...clone(imported.rules),
    revision: currentRecords.rules.state.revision + 1
  });
  return { organizational, snooze, rules };
}

async function verifyApplied(storage, expected) {
  const records = await readAllRecords(storage);
  return records.organizational.exists && records.snooze.exists && records.rules.exists
    && stateEqual(records.organizational.state, expected.organizational)
    && stateEqual(records.snooze.state, expected.snooze)
    && stateEqual(records.rules.state, expected.rules);
}

async function restoreAllRecords(storage, previous) {
  try {
    const setValues = {};
    const removeKeys = [];
    const entries = [
      [PERSISTENT_STATE_KEY, previous.organizational],
      [SNOOZE_STATE_KEY, previous.snooze],
      [RULE_STATE_KEY, previous.rules]
    ];
    for (const [key, record] of entries) {
      if (record.exists) setValues[key] = record.state;
      else removeKeys.push(key);
    }
    if (Object.keys(setValues).length) await storage.set(setValues);
    if (removeKeys.length) await storage.remove(removeKeys);

    const verified = await readAllRecords(storage);
    return ["organizational", "snooze", "rules"].every((key) =>
      verified[key].exists === previous[key].exists && stateEqual(verified[key].state, previous[key].state)
    );
  } catch {
    return false;
  }
}

export function createPortabilityManager({
  browser,
  getManifest,
  reconcileSnoozeAlarms,
  broadcastChange,
  now = Date.now,
  digestHex = sha256Hex
}) {
  let operationTail = Promise.resolve();

  function serialize(operation) {
    const run = operationTail.then(operation, operation);
    operationTail = run.catch(() => {});
    return run;
  }

  async function validatedImportedStates(bundle) {
    const payload = await verifyBackupBundle(bundle, { digestHex });
    return {
      payload,
      states: {
        organizational: validatePersistentState(payload.stores.organizational),
        snooze: validateSnoozeState(payload.stores.snooze),
        rules: validateRuleState(payload.stores.rules)
      }
    };
  }

  async function exportBackup() {
    return serialize(async () => {
      try {
        const records = await readAllRecords(browser.storage.local);
        const manifest = getManifest();
        const exportedAt = now();
        const bundle = await createBackupBundle({
          extensionVersion: String(manifest.version),
          exportedAt,
          organizationalState: records.organizational.state,
          snoozeState: records.snooze.state,
          ruleState: records.rules.state
        }, { digestHex });
        const date = new Date(exportedAt).toISOString().slice(0, 10);
        return {
          ok: true,
          bundle,
          filename: `goreecloud-advanced-tab-manager-backup-${date}.json`
        };
      } catch (error) {
        return { ok: false, reason: reasonFromError(error) };
      }
    });
  }

  async function previewImport(bundle) {
    return serialize(async () => {
      try {
        const imported = await validatedImportedStates(bundle);
        const currentRecords = await readAllRecords(browser.storage.local);
        const preview = buildImportPreview({
          current: {
            organizational: currentRecords.organizational.state,
            snooze: currentRecords.snooze.state,
            rules: currentRecords.rules.state
          },
          imported: imported.states
        });
        return {
          ok: true,
          preview: {
            ...preview,
            sourceVersion: imported.payload.source.extensionVersion,
            exportedAt: imported.payload.exportedAt,
            integrityVerified: true
          }
        };
      } catch (error) {
        return { ok: false, reason: reasonFromError(error) };
      }
    });
  }

  async function applyImport(bundle, expectedRevisions) {
    return serialize(async () => {
      let previous = null;
      try {
        const imported = await validatedImportedStates(bundle);
        previous = await readAllRecords(browser.storage.local);
        if (!revisionsMatch(expectedRevisions, previous)) {
          return { ok: false, reason: "state-changed-since-preview" };
        }

        const next = nextImportedStates(imported.states, previous);
        await browser.storage.local.set({
          [PERSISTENT_STATE_KEY]: next.organizational,
          [SNOOZE_STATE_KEY]: next.snooze,
          [RULE_STATE_KEY]: next.rules
        });
        if (!await verifyApplied(browser.storage.local, next)) throw new PortabilityError("import-verification-failed");

        const alarmResult = await reconcileSnoozeAlarms();
        if (!alarmResult?.ok) throw new PortabilityError("snooze-reconciliation-failed");

        broadcastChange("portability-import-applied");
        return { ok: true, revisions: recordRevisions(await readAllRecords(browser.storage.local)) };
      } catch (error) {
        const rolledBack = previous ? await restoreAllRecords(browser.storage.local, previous) : false;
        let alarmsRestored = false;
        if (rolledBack) {
          try { alarmsRestored = Boolean((await reconcileSnoozeAlarms())?.ok); } catch {}
        }
        return { ok: false, reason: reasonFromError(error), rolledBack, alarmsRestored };
      }
    });
  }

  return { applyImport, exportBackup, previewImport };
}
