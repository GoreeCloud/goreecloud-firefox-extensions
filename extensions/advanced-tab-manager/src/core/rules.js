import { RULE_ACTION_TYPES } from "./rule-state.js";

const STRING_FIELDS = new Set(["hostname", "title", "url", "nativeGroupTitle"]);
const BOOLEAN_FIELDS = new Set(["pinned", "audible", "muted", "discarded", "treeChild"]);
const STRING_OPERATORS = new Set(["equals", "contains", "starts-with", "ends-with"]);
const ACTION_ORDER = ["pin", "unpin", "mute", "unmute", "discard"];

function normalizeText(value) {
  return String(value ?? "").toLowerCase();
}

function hostnameFromUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return "";
    return url.hostname.toLowerCase();
  } catch {
    return "";
  }
}

function nativeGroupTitle(tab, snapshot) {
  if (!Number.isInteger(tab.groupId) || tab.groupId < 0) return "";
  const group = snapshot.groups.find((candidate) => candidate.id === tab.groupId && candidate.windowId === tab.windowId);
  return group?.title || "";
}

function observedValue(condition, tab, snapshot) {
  switch (condition.field) {
    case "hostname": return hostnameFromUrl(tab.url);
    case "title": return tab.title || "";
    case "url": return tab.url || "";
    case "nativeGroupTitle": return nativeGroupTitle(tab, snapshot);
    case "pinned": return Boolean(tab.pinned);
    case "audible": return Boolean(tab.audible);
    case "muted": return Boolean(tab.muted);
    case "discarded": return Boolean(tab.discarded);
    case "treeChild": return Boolean(tab.treeParentLogicalId);
    default: return undefined;
  }
}

function compareString(actual, operator, expected) {
  const left = normalizeText(actual);
  const right = normalizeText(expected);
  switch (operator) {
    case "equals": return left === right;
    case "contains": return left.includes(right);
    case "starts-with": return left.startsWith(right);
    case "ends-with": return left.endsWith(right);
    default: return false;
  }
}

function normalizeActions(actions) {
  if (!Array.isArray(actions) || actions.length > 3) return { ok: false, reason: "invalid-rule-actions" };
  const unique = new Set();
  for (const action of actions) {
    if (!RULE_ACTION_TYPES.has(action) || unique.has(action)) return { ok: false, reason: "invalid-rule-actions" };
    unique.add(action);
  }
  if ((unique.has("pin") && unique.has("unpin")) || (unique.has("mute") && unique.has("unmute"))) {
    return { ok: false, reason: "conflicting-rule-actions" };
  }
  return { ok: true, actions: ACTION_ORDER.filter((action) => unique.has(action)) };
}

export function normalizeRuleInput(input, { existing = null, idFactory, now = Date.now() } = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return { ok: false, reason: "invalid-rule" };
  const name = typeof input.name === "string" ? input.name.trim() : "";
  if (!name || name.length > 120) return { ok: false, reason: "invalid-rule-name" };

  const priority = input.priority === undefined ? (existing?.priority ?? 0) : input.priority;
  if (!Number.isInteger(priority) || priority < -1000 || priority > 1000) return { ok: false, reason: "invalid-rule-priority" };

  const enabled = input.enabled === undefined ? (existing?.enabled ?? true) : input.enabled;
  if (typeof enabled !== "boolean") return { ok: false, reason: "invalid-rule-enabled" };
  if (!Array.isArray(input.conditions) || input.conditions.length < 1 || input.conditions.length > 8) return { ok: false, reason: "invalid-rule-conditions" };

  const conditions = [];
  for (const source of input.conditions) {
    if (!source || typeof source !== "object" || Array.isArray(source)) return { ok: false, reason: "invalid-rule-condition" };
    const field = source.field;
    const operator = source.operator;
    if (STRING_FIELDS.has(field)) {
      if (!STRING_OPERATORS.has(operator) || typeof source.value !== "string" || !source.value.trim()) return { ok: false, reason: "invalid-rule-condition" };
      conditions.push({ field, operator, value: source.value.trim() });
    } else if (BOOLEAN_FIELDS.has(field)) {
      if (operator !== "is" || typeof source.value !== "boolean") return { ok: false, reason: "invalid-rule-condition" };
      conditions.push({ field, operator, value: source.value });
    } else {
      return { ok: false, reason: "unsupported-rule-field" };
    }
  }

  const preparedActions = normalizeActions(input.actions === undefined ? (existing?.actions ?? []) : input.actions);
  if (!preparedActions.ok) return preparedActions;

  const createdAt = existing?.createdAt ?? now;
  return {
    ok: true,
    rule: {
      id: existing?.id || idFactory(),
      name,
      enabled,
      priority,
      createdAt,
      updatedAt: now,
      conditions,
      actions: preparedActions.actions
    }
  };
}

export function evaluateCondition(condition, tab, snapshot) {
  const actual = observedValue(condition, tab, snapshot);
  const matched = STRING_FIELDS.has(condition.field)
    ? compareString(actual, condition.operator, condition.value)
    : condition.operator === "is" && actual === condition.value;
  return {
    field: condition.field,
    operator: condition.operator,
    expected: condition.value,
    actual,
    matched
  };
}

export function evaluateRules({ ruleState, snapshot }) {
  if (!ruleState.enabled) {
    return { engineEnabled: false, evaluatedRuleCount: 0, matches: [] };
  }

  const rules = ruleState.rules
    .filter((rule) => rule.enabled)
    .sort((left, right) => right.priority - left.priority || left.id.localeCompare(right.id));
  const tabs = snapshot.windows
    .flatMap((window) => window.tabs)
    .filter((tab) => !tab.incognito)
    .sort((left, right) => left.windowId - right.windowId || left.index - right.index || left.id - right.id);

  const matches = [];
  for (const rule of rules) {
    for (const tab of tabs) {
      const explanation = rule.conditions.map((condition) => evaluateCondition(condition, tab, snapshot));
      if (!explanation.every((condition) => condition.matched)) continue;
      matches.push({
        ruleId: rule.id,
        ruleName: rule.name,
        priority: rule.priority,
        tabId: tab.id,
        logicalId: tab.logicalId || null,
        windowId: tab.windowId,
        actions: [...(rule.actions ?? [])],
        explanation
      });
    }
  }

  return { engineEnabled: true, evaluatedRuleCount: rules.length, matches };
}

function actionSignature(actions) {
  return JSON.stringify(actions);
}

export function planRuleActions({ ruleState, snapshot }) {
  const evaluation = evaluateRules({ ruleState, snapshot });
  if (!evaluation.engineEnabled) {
    return { engineEnabled: false, evaluatedRuleCount: 0, actions: [], conflicts: [], matches: [] };
  }

  const byTab = new Map();
  for (const match of evaluation.matches) {
    if (!match.actions.length) continue;
    if (!byTab.has(match.tabId)) byTab.set(match.tabId, []);
    byTab.get(match.tabId).push(match);
  }

  const actions = [];
  const conflicts = [];
  for (const [tabId, matches] of byTab.entries()) {
    const highestPriority = Math.max(...matches.map((match) => match.priority));
    const top = matches.filter((match) => match.priority === highestPriority);
    const signatures = new Set(top.map((match) => actionSignature(match.actions)));

    if (signatures.size !== 1) {
      conflicts.push({
        tabId,
        windowId: top[0].windowId,
        priority: highestPriority,
        ruleIds: top.map((match) => match.ruleId).sort(),
        reason: "equal-priority-action-conflict"
      });
      continue;
    }

    actions.push({
      tabId,
      windowId: top[0].windowId,
      logicalId: top[0].logicalId,
      priority: highestPriority,
      ruleIds: top.map((match) => match.ruleId).sort(),
      ruleNames: top.map((match) => match.ruleName).sort(),
      actions: [...top[0].actions]
    });
  }

  actions.sort((left, right) => left.windowId - right.windowId || left.tabId - right.tabId);
  conflicts.sort((left, right) => left.windowId - right.windowId || left.tabId - right.tabId);
  return {
    engineEnabled: true,
    evaluatedRuleCount: evaluation.evaluatedRuleCount,
    actions,
    conflicts,
    matches: evaluation.matches
  };
}
