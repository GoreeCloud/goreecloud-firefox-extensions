export const RULE_STATE_KEY = "goreecloud.advancedTabManager.ruleState.v1";
export const RULE_STATE_SCHEMA_VERSION = 1;

const RULE_FIELDS = new Set([
  "hostname",
  "title",
  "url",
  "nativeGroupTitle",
  "pinned",
  "audible",
  "muted",
  "discarded",
  "treeChild"
]);
const STRING_OPERATORS = new Set(["equals", "contains", "starts-with", "ends-with"]);

export class RuleStateError extends Error {
  constructor(code, message = code) {
    super(message);
    this.name = "RuleStateError";
    this.code = code;
  }
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isTimestamp(value) {
  return Number.isInteger(value) && value >= 0;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function validateCondition(condition, path) {
  if (!isObject(condition)) throw new RuleStateError("invalid-rule-state", `${path} must be an object`);
  if (!RULE_FIELDS.has(condition.field)) throw new RuleStateError("invalid-rule-state", `${path}.field is unsupported`);

  const booleanField = ["pinned", "audible", "muted", "discarded", "treeChild"].includes(condition.field);
  if (booleanField) {
    if (condition.operator !== "is" || typeof condition.value !== "boolean") {
      throw new RuleStateError("invalid-rule-state", `${path} boolean condition is invalid`);
    }
    return;
  }

  if (!STRING_OPERATORS.has(condition.operator) || !isNonEmptyString(condition.value)) {
    throw new RuleStateError("invalid-rule-state", `${path} string condition is invalid`);
  }
}

function validateRule(rule, index) {
  const path = `rules[${index}]`;
  if (!isObject(rule)) throw new RuleStateError("invalid-rule-state", `${path} must be an object`);
  if (!isNonEmptyString(rule.id)) throw new RuleStateError("invalid-rule-state", `${path}.id is invalid`);
  if (!isNonEmptyString(rule.name) || rule.name.trim().length > 120) throw new RuleStateError("invalid-rule-state", `${path}.name is invalid`);
  if (typeof rule.enabled !== "boolean") throw new RuleStateError("invalid-rule-state", `${path}.enabled is invalid`);
  if (!Number.isInteger(rule.priority) || rule.priority < -1000 || rule.priority > 1000) throw new RuleStateError("invalid-rule-state", `${path}.priority is invalid`);
  if (!isTimestamp(rule.createdAt) || !isTimestamp(rule.updatedAt) || rule.updatedAt < rule.createdAt) throw new RuleStateError("invalid-rule-state", `${path} timestamps are invalid`);
  if (!Array.isArray(rule.conditions) || rule.conditions.length < 1 || rule.conditions.length > 8) throw new RuleStateError("invalid-rule-state", `${path}.conditions is invalid`);
  rule.conditions.forEach((condition, conditionIndex) => validateCondition(condition, `${path}.conditions[${conditionIndex}]`));
}

export function createEmptyRuleState() {
  return {
    schemaVersion: RULE_STATE_SCHEMA_VERSION,
    revision: 0,
    enabled: false,
    rules: []
  };
}

export function validateRuleState(value) {
  if (!isObject(value)) throw new RuleStateError("invalid-rule-state", "rule state must be an object");
  if (value.schemaVersion !== RULE_STATE_SCHEMA_VERSION) throw new RuleStateError("unsupported-rule-state-schema");
  if (!Number.isInteger(value.revision) || value.revision < 0) throw new RuleStateError("invalid-rule-state", "revision is invalid");
  if (typeof value.enabled !== "boolean" || !Array.isArray(value.rules)) throw new RuleStateError("invalid-rule-state", "rule collections are invalid");

  const ids = new Set();
  value.rules.forEach((rule, index) => {
    validateRule(rule, index);
    if (ids.has(rule.id)) throw new RuleStateError("invalid-rule-state", "duplicate rule ID");
    ids.add(rule.id);
  });
  return clone(value);
}

export async function readRuleStateRecord(storage) {
  const result = await storage.get(RULE_STATE_KEY);
  const exists = Object.prototype.hasOwnProperty.call(result, RULE_STATE_KEY);
  if (!exists || result[RULE_STATE_KEY] === undefined) {
    return { exists: false, state: createEmptyRuleState() };
  }
  return { exists: true, state: validateRuleState(result[RULE_STATE_KEY]) };
}

function statesEqual(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

export async function restoreRuleStateRecord(storage, record) {
  try {
    if (record.exists) await storage.set({ [RULE_STATE_KEY]: record.state });
    else await storage.remove(RULE_STATE_KEY);
    const verified = await readRuleStateRecord(storage);
    return { ok: verified.exists === record.exists && statesEqual(verified.state, record.state) };
  } catch (error) {
    return { ok: false, error };
  }
}

export async function commitRuleStateMutation({ storage, mutate }) {
  const previousRecord = await readRuleStateRecord(storage);
  const draft = clone(previousRecord.state);
  const mutated = await mutate(draft);
  const candidate = mutated === undefined ? draft : mutated;
  candidate.schemaVersion = RULE_STATE_SCHEMA_VERSION;
  candidate.revision = previousRecord.state.revision + 1;
  const nextState = validateRuleState(candidate);

  try {
    await storage.set({ [RULE_STATE_KEY]: nextState });
    const verified = await readRuleStateRecord(storage);
    if (verified.exists && statesEqual(verified.state, nextState)) {
      return { ok: true, state: nextState, previousRecord, rolledBack: false };
    }
    throw new Error("rule state verification failed");
  } catch (error) {
    const rollback = await restoreRuleStateRecord(storage, previousRecord);
    return { ok: false, state: nextState, previousRecord, rolledBack: rollback.ok, error };
  }
}
