import {
  PERSISTENT_STATE_KEY,
  validatePersistentState
} from "./persistent-state.js";
import {
  SNOOZE_STATE_KEY,
  validateSnoozeState
} from "./snooze-store.js";
import {
  RULE_STATE_KEY,
  validateRuleState
} from "./rule-state.js";

export const PORTABLE_BUNDLE_SCHEMA_VERSION = 1;
export const PORTABLE_BUNDLE_PRODUCT = "GoreeCloud Advanced Tab Manager";

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function exactKeys(value, keys) {
  return isObject(value)
    && Object.keys(value).length === keys.length
    && keys.every((key) => Object.prototype.hasOwnProperty.call(value, key));
}

function statesEqual(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function createPortableBundle({ version, exportedAt, organizational, snooze, rules }) {
  if (typeof version !== "string" || !version) throw new Error("invalid-export-version");
  if (!Number.isInteger(exportedAt) || exportedAt < 0) throw new Error("invalid-export-time");

  return {
    schemaVersion: PORTABLE_BUNDLE_SCHEMA_VERSION,
    product: PORTABLE_BUNDLE_PRODUCT,
    sourceVersion: version,
    exportedAt,
    stores: {
      organizational: validatePersistentState(organizational),
      snooze: validateSnoozeState(snooze),
      rules: validateRuleState(rules)
    }
  };
}

export function validatePortableBundle(value) {
  if (!exactKeys(value, ["schemaVersion", "product", "sourceVersion", "exportedAt", "stores"])) {
    throw new Error("invalid-portable-bundle");
  }
  if (value.schemaVersion !== PORTABLE_BUNDLE_SCHEMA_VERSION) throw new Error("unsupported-portable-bundle-schema");
  if (value.product !== PORTABLE_BUNDLE_PRODUCT) throw new Error("wrong-portable-bundle-product");
  if (typeof value.sourceVersion !== "string" || !value.sourceVersion) throw new Error("invalid-portable-bundle-version");
  if (!Number.isInteger(value.exportedAt) || value.exportedAt < 0) throw new Error("invalid-portable-bundle-time");
  if (!exactKeys(value.stores, ["organizational", "snooze", "rules"])) throw new Error("invalid-portable-bundle-stores");

  return {
    schemaVersion: PORTABLE_BUNDLE_SCHEMA_VERSION,
    product: PORTABLE_BUNDLE_PRODUCT,
    sourceVersion: value.sourceVersion,
    exportedAt: value.exportedAt,
    stores: {
      organizational: validatePersistentState(value.stores.organizational),
      snooze: validateSnoozeState(value.stores.snooze),
      rules: validateRuleState(value.stores.rules)
    }
  };
}

async function readRawRecords(storage) {
  const result = await storage.get([PERSISTENT_STATE_KEY, SNOOZE_STATE_KEY, RULE_STATE_KEY]);
  return {
    [PERSISTENT_STATE_KEY]: Object.prototype.hasOwnProperty.call(result, PERSISTENT_STATE_KEY)
      ? clone(result[PERSISTENT_STATE_KEY])
      : undefined,
    [SNOOZE_STATE_KEY]: Object.prototype.hasOwnProperty.call(result, SNOOZE_STATE_KEY)
      ? clone(result[SNOOZE_STATE_KEY])
      : undefined,
    [RULE_STATE_KEY]: Object.prototype.hasOwnProperty.call(result, RULE_STATE_KEY)
      ? clone(result[RULE_STATE_KEY])
      : undefined
  };
}

async function replaceRawRecords(storage, records) {
  const toSet = {};
  const toRemove = [];
  for (const key of [PERSISTENT_STATE_KEY, SNOOZE_STATE_KEY, RULE_STATE_KEY]) {
    if (records[key] === undefined) toRemove.push(key);
    else toSet[key] = records[key];
  }
  if (Object.keys(toSet).length) await storage.set(toSet);
  if (toRemove.length) await storage.remove(toRemove);
}

async function rawRecordsEqual(storage, expected) {
  const current = await readRawRecords(storage);
  return [PERSISTENT_STATE_KEY, SNOOZE_STATE_KEY, RULE_STATE_KEY].every((key) =>
    statesEqual(current[key], expected[key])
  );
}

export async function restorePortableRecords(storage, previousRecords) {
  try {
    await replaceRawRecords(storage, previousRecords);
    return { ok: await rawRecordsEqual(storage, previousRecords) };
  } catch (error) {
    return { ok: false, error };
  }
}

export async function commitPortableImport({ storage, bundle }) {
  const validated = validatePortableBundle(bundle);
  const previousRecords = await readRawRecords(storage);
  const nextRecords = {
    [PERSISTENT_STATE_KEY]: validated.stores.organizational,
    [SNOOZE_STATE_KEY]: validated.stores.snooze,
    [RULE_STATE_KEY]: validated.stores.rules
  };

  try {
    await replaceRawRecords(storage, nextRecords);
    if (!await rawRecordsEqual(storage, nextRecords)) throw new Error("portable-import-verification-failed");
    return { ok: true, bundle: validated, previousRecords };
  } catch (error) {
    const rollback = await restorePortableRecords(storage, previousRecords);
    return { ok: false, reason: "portable-import-verification-failed", rolledBack: rollback.ok, error };
  }
}

export async function commitPortableClear({ storage }) {
  const previousRecords = await readRawRecords(storage);
  const emptyRecords = {
    [PERSISTENT_STATE_KEY]: undefined,
    [SNOOZE_STATE_KEY]: undefined,
    [RULE_STATE_KEY]: undefined
  };

  try {
    await replaceRawRecords(storage, emptyRecords);
    if (!await rawRecordsEqual(storage, emptyRecords)) throw new Error("portable-clear-verification-failed");
    return { ok: true, previousRecords };
  } catch (error) {
    const rollback = await restorePortableRecords(storage, previousRecords);
    return { ok: false, reason: "portable-clear-verification-failed", rolledBack: rollback.ok, error };
  }
}
