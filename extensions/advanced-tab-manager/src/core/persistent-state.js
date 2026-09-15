export const PERSISTENT_STATE_KEY = "goreecloud.advancedTabManager.persistentState.v1";
export const PERSISTENT_STATE_SCHEMA_VERSION = 1;

export class PersistentStateError extends Error {
  constructor(code, message = code) {
    super(message);
    this.name = "PersistentStateError";
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

export function isRestorableUrl(value) {
  if (value === "about:blank") return true;
  if (!isNonEmptyString(value)) return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function createEmptyPersistentState() {
  return {
    schemaVersion: PERSISTENT_STATE_SCHEMA_VERSION,
    revision: 0,
    tabSets: [],
    stashedItems: []
  };
}

function validateGroup(group, path) {
  if (!isObject(group)) throw new PersistentStateError("invalid-persistent-state", `${path} must be an object`);
  if (!isNonEmptyString(group.id)) throw new PersistentStateError("invalid-persistent-state", `${path}.id is invalid`);
  if (typeof group.title !== "string") throw new PersistentStateError("invalid-persistent-state", `${path}.title is invalid`);
  if (!isNonEmptyString(group.color)) throw new PersistentStateError("invalid-persistent-state", `${path}.color is invalid`);
  if (typeof group.collapsed !== "boolean") throw new PersistentStateError("invalid-persistent-state", `${path}.collapsed is invalid`);
}

function validateTabSet(tabSet, index) {
  const path = `tabSets[${index}]`;
  if (!isObject(tabSet)) throw new PersistentStateError("invalid-persistent-state", `${path} must be an object`);
  if (!isNonEmptyString(tabSet.id)) throw new PersistentStateError("invalid-persistent-state", `${path}.id is invalid`);
  if (!isNonEmptyString(tabSet.name)) throw new PersistentStateError("invalid-persistent-state", `${path}.name is invalid`);
  if (!isTimestamp(tabSet.createdAt) || !isTimestamp(tabSet.updatedAt) || tabSet.updatedAt < tabSet.createdAt) throw new PersistentStateError("invalid-persistent-state", `${path} timestamps are invalid`);
  if (!Array.isArray(tabSet.groups) || !Array.isArray(tabSet.items)) throw new PersistentStateError("invalid-persistent-state", `${path} collections are invalid`);
  if (!isOptionalString(tabSet.activeItemId)) throw new PersistentStateError("invalid-persistent-state", `${path}.activeItemId is invalid`);

  const groupIds = new Set();
  tabSet.groups.forEach((group, groupIndex) => {
    validateGroup(group, `${path}.groups[${groupIndex}]`);
    if (groupIds.has(group.id)) throw new PersistentStateError("invalid-persistent-state", `${path} has duplicate group IDs`);
    groupIds.add(group.id);
  });

  const itemIds = new Set();
  for (let itemIndex = 0; itemIndex < tabSet.items.length; itemIndex += 1) {
    const item = tabSet.items[itemIndex];
    const itemPath = `${path}.items[${itemIndex}]`;
    if (!isObject(item) || !isNonEmptyString(item.id) || !isRestorableUrl(item.url)) throw new PersistentStateError("invalid-persistent-state", `${itemPath} is invalid`);
    if (typeof item.title !== "string" || typeof item.pinned !== "boolean" || !Number.isInteger(item.sourceIndex) || item.sourceIndex < 0) throw new PersistentStateError("invalid-persistent-state", `${itemPath} fields are invalid`);
    if (!isOptionalString(item.groupId) || !isOptionalString(item.parentItemId)) throw new PersistentStateError("invalid-persistent-state", `${itemPath} relationships are invalid`);
    if (item.groupId && !groupIds.has(item.groupId)) throw new PersistentStateError("invalid-persistent-state", `${itemPath}.groupId is missing`);
    if (itemIds.has(item.id)) throw new PersistentStateError("invalid-persistent-state", `${path} has duplicate item IDs`);
    itemIds.add(item.id);
  }
  if (tabSet.activeItemId && !itemIds.has(tabSet.activeItemId)) throw new PersistentStateError("invalid-persistent-state", `${path}.activeItemId is missing`);

  const parentByItem = new Map();
  for (const item of tabSet.items) {
    if (!item.parentItemId) continue;
    if (!itemIds.has(item.parentItemId) || item.parentItemId === item.id) throw new PersistentStateError("invalid-persistent-state", `${path} has an invalid parent relationship`);
    parentByItem.set(item.id, item.parentItemId);
  }
  for (const item of tabSet.items) {
    const seen = new Set();
    let cursor = item.id;
    while (parentByItem.has(cursor)) {
      if (seen.has(cursor)) throw new PersistentStateError("invalid-persistent-state", `${path} contains a parent cycle`);
      seen.add(cursor);
      cursor = parentByItem.get(cursor);
    }
  }
}

function validateStashedItem(item, index) {
  const path = `stashedItems[${index}]`;
  if (!isObject(item) || !isNonEmptyString(item.id) || !isRestorableUrl(item.url)) throw new PersistentStateError("invalid-persistent-state", `${path} is invalid`);
  if (typeof item.title !== "string" || typeof item.pinned !== "boolean" || !isTimestamp(item.createdAt)) throw new PersistentStateError("invalid-persistent-state", `${path} fields are invalid`);
  if (!isOptionalString(item.treeParentLogicalId)) throw new PersistentStateError("invalid-persistent-state", `${path}.treeParentLogicalId is invalid`);
  if (item.nativeGroup !== null) {
    if (!isObject(item.nativeGroup) || typeof item.nativeGroup.title !== "string" || !isNonEmptyString(item.nativeGroup.color) || typeof item.nativeGroup.collapsed !== "boolean") {
      throw new PersistentStateError("invalid-persistent-state", `${path}.nativeGroup is invalid`);
    }
  }
}

export function validatePersistentState(value) {
  if (!isObject(value)) throw new PersistentStateError("invalid-persistent-state", "persistent state must be an object");
  if (value.schemaVersion !== PERSISTENT_STATE_SCHEMA_VERSION) throw new PersistentStateError("unsupported-persistent-state-schema");
  if (!Number.isInteger(value.revision) || value.revision < 0) throw new PersistentStateError("invalid-persistent-state", "revision is invalid");
  if (!Array.isArray(value.tabSets) || !Array.isArray(value.stashedItems)) throw new PersistentStateError("invalid-persistent-state", "collections are invalid");

  const tabSetIds = new Set();
  value.tabSets.forEach((tabSet, index) => {
    validateTabSet(tabSet, index);
    if (tabSetIds.has(tabSet.id)) throw new PersistentStateError("invalid-persistent-state", "duplicate Tab Set ID");
    tabSetIds.add(tabSet.id);
  });

  const stashIds = new Set();
  value.stashedItems.forEach((item, index) => {
    validateStashedItem(item, index);
    if (stashIds.has(item.id)) throw new PersistentStateError("invalid-persistent-state", "duplicate stash ID");
    stashIds.add(item.id);
  });

  return clone(value);
}

export async function readPersistentStateRecord(storage) {
  const result = await storage.get(PERSISTENT_STATE_KEY);
  const exists = Object.prototype.hasOwnProperty.call(result, PERSISTENT_STATE_KEY);
  if (!exists || result[PERSISTENT_STATE_KEY] === undefined) {
    return { exists: false, state: createEmptyPersistentState() };
  }
  return { exists: true, state: validatePersistentState(result[PERSISTENT_STATE_KEY]) };
}

function statesEqual(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

export async function restorePersistentRecord(storage, record) {
  try {
    if (record.exists) await storage.set({ [PERSISTENT_STATE_KEY]: record.state });
    else await storage.remove(PERSISTENT_STATE_KEY);
    const verified = await readPersistentStateRecord(storage);
    const ok = verified.exists === record.exists && statesEqual(verified.state, record.state);
    return { ok };
  } catch (error) {
    return { ok: false, error };
  }
}

export async function commitPersistentMutation({ storage, mutate }) {
  const previousRecord = await readPersistentStateRecord(storage);
  const draft = clone(previousRecord.state);
  const mutated = await mutate(draft);
  const candidate = mutated === undefined ? draft : mutated;
  candidate.schemaVersion = PERSISTENT_STATE_SCHEMA_VERSION;
  candidate.revision = previousRecord.state.revision + 1;
  const nextState = validatePersistentState(candidate);

  try {
    await storage.set({ [PERSISTENT_STATE_KEY]: nextState });
    const verified = await readPersistentStateRecord(storage);
    if (verified.exists && statesEqual(verified.state, nextState)) {
      return { ok: true, state: nextState, previousRecord, rolledBack: false };
    }
    throw new Error("persistent state verification failed");
  } catch (error) {
    const rollback = await restorePersistentRecord(storage, previousRecord);
    return { ok: false, state: nextState, previousRecord, rolledBack: rollback.ok, error };
  }
}
