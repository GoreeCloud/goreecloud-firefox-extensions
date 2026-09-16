export const SNOOZE_STATE_KEY = "goreecloud.advancedTabManager.snoozeState.v1";
export const SNOOZE_STATE_SCHEMA_VERSION = 1;

export class SnoozeStateError extends Error {
  constructor(code, message = code) {
    super(message);
    this.name = "SnoozeStateError";
    this.code = code;
  }
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.length > 0;
}

function isOptionalString(value) {
  return value === null || isNonEmptyString(value);
}

function isTimestamp(value) {
  return Number.isInteger(value) && value >= 0;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function statesEqual(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function isSnoozeRestorableUrl(value) {
  if (value === "about:blank") return true;
  if (!isNonEmptyString(value)) return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function createEmptySnoozeState() {
  return {
    schemaVersion: SNOOZE_STATE_SCHEMA_VERSION,
    revision: 0,
    items: []
  };
}

function validateNativeGroup(group, path) {
  if (group === null) return;
  if (!isObject(group) || typeof group.title !== "string" || !isNonEmptyString(group.color) || typeof group.collapsed !== "boolean") {
    throw new SnoozeStateError("invalid-snooze-state", `${path}.nativeGroup is invalid`);
  }
}

function validateItem(item, index) {
  const path = `items[${index}]`;
  if (!isObject(item) || !isNonEmptyString(item.id) || !isSnoozeRestorableUrl(item.url)) {
    throw new SnoozeStateError("invalid-snooze-state", `${path} is invalid`);
  }
  if (typeof item.title !== "string" || typeof item.pinned !== "boolean") {
    throw new SnoozeStateError("invalid-snooze-state", `${path} fields are invalid`);
  }
  if (!isTimestamp(item.createdAt) || !isTimestamp(item.wakeAt) || item.wakeAt <= item.createdAt) {
    throw new SnoozeStateError("invalid-snooze-state", `${path} timestamps are invalid`);
  }
  if (!isOptionalString(item.treeParentLogicalId)) {
    throw new SnoozeStateError("invalid-snooze-state", `${path}.treeParentLogicalId is invalid`);
  }
  validateNativeGroup(item.nativeGroup, path);
}

export function validateSnoozeState(value) {
  if (!isObject(value)) throw new SnoozeStateError("invalid-snooze-state", "snooze state must be an object");
  if (value.schemaVersion !== SNOOZE_STATE_SCHEMA_VERSION) throw new SnoozeStateError("unsupported-snooze-state-schema");
  if (!Number.isInteger(value.revision) || value.revision < 0) throw new SnoozeStateError("invalid-snooze-state", "revision is invalid");
  if (!Array.isArray(value.items)) throw new SnoozeStateError("invalid-snooze-state", "items is invalid");

  const ids = new Set();
  value.items.forEach((item, index) => {
    validateItem(item, index);
    if (ids.has(item.id)) throw new SnoozeStateError("invalid-snooze-state", "duplicate snooze ID");
    ids.add(item.id);
  });
  return clone(value);
}

export async function readSnoozeStateRecord(storage) {
  const result = await storage.get(SNOOZE_STATE_KEY);
  const exists = Object.prototype.hasOwnProperty.call(result, SNOOZE_STATE_KEY);
  if (!exists || result[SNOOZE_STATE_KEY] === undefined) {
    return { exists: false, state: createEmptySnoozeState() };
  }
  return { exists: true, state: validateSnoozeState(result[SNOOZE_STATE_KEY]) };
}

export async function restoreSnoozeRecord(storage, record) {
  try {
    if (record.exists) await storage.set({ [SNOOZE_STATE_KEY]: record.state });
    else await storage.remove(SNOOZE_STATE_KEY);
    const verified = await readSnoozeStateRecord(storage);
    return { ok: verified.exists === record.exists && statesEqual(verified.state, record.state) };
  } catch (error) {
    return { ok: false, error };
  }
}

export async function commitSnoozeMutation({ storage, mutate }) {
  const previousRecord = await readSnoozeStateRecord(storage);
  const draft = clone(previousRecord.state);
  const mutated = await mutate(draft);
  const candidate = mutated === undefined ? draft : mutated;
  candidate.schemaVersion = SNOOZE_STATE_SCHEMA_VERSION;
  candidate.revision = previousRecord.state.revision + 1;
  const nextState = validateSnoozeState(candidate);

  try {
    await storage.set({ [SNOOZE_STATE_KEY]: nextState });
    const verified = await readSnoozeStateRecord(storage);
    if (verified.exists && statesEqual(verified.state, nextState)) {
      return { ok: true, state: nextState, previousRecord, rolledBack: false };
    }
    throw new Error("snooze state verification failed");
  } catch (error) {
    const rollback = await restoreSnoozeRecord(storage, previousRecord);
    return { ok: false, state: nextState, previousRecord, rolledBack: rollback.ok, error };
  }
}
