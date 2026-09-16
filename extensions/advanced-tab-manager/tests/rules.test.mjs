import assert from "node:assert/strict";
import test from "node:test";
import { evaluateRules, normalizeRuleInput, planRuleActions } from "../src/core/rules.js";

const snapshot = {
  groups: [{ id: 7, windowId: 1, title: "Development", color: "blue", collapsed: false }],
  windows: [{ id: 1, focused: true, incognito: false, tabs: [
    { id: 11, logicalId: "tab-a", treeParentLogicalId: null, windowId: 1, index: 0, groupId: 7, incognito: false, title: "GitHub Docs", url: "https://docs.example.com/Guide", pinned: false, audible: false, muted: false, discarded: false },
    { id: 12, logicalId: "tab-b", treeParentLogicalId: "tab-a", windowId: 1, index: 1, groupId: -1, incognito: false, title: "Music", url: "https://music.example.com/", pinned: true, audible: true, muted: false, discarded: false },
    { id: 13, logicalId: "private", treeParentLogicalId: null, windowId: 1, index: 2, groupId: -1, incognito: true, title: "Private", url: "https://private.example.com/", pinned: false, audible: false, muted: false, discarded: false }
  ] }]
};

function state(rules, enabled = true) { return { schemaVersion: 1, revision: 1, enabled, rules }; }
function rule(id, priority, conditions, enabled = true, actions = []) { return { id, name: id, enabled, priority, createdAt: 1, updatedAt: 1, conditions, actions }; }

test("normalizes a bounded rule definition and canonical action order", () => {
  const result = normalizeRuleInput({
    name: " Docs ",
    priority: 3,
    conditions: [{ field: "hostname", operator: "equals", value: " DOCS.EXAMPLE.COM " }],
    actions: ["discard", "pin"]
  }, { idFactory: () => "r1", now: 10 });
  assert.equal(result.ok, true);
  assert.equal(result.rule.name, "Docs");
  assert.equal(result.rule.conditions[0].value, "DOCS.EXAMPLE.COM");
  assert.deepEqual(result.rule.actions, ["pin", "discard"]);
});

test("rejects unsupported fields", () => {
  assert.deepEqual(normalizeRuleInput({ name: "Bad", conditions: [{ field: "pageContent", operator: "contains", value: "x" }] }, { idFactory: () => "r1" }), { ok: false, reason: "unsupported-rule-field" });
});

test("rejects contradictory rule actions", () => {
  assert.deepEqual(normalizeRuleInput({
    name: "Conflict",
    conditions: [{ field: "hostname", operator: "contains", value: "example" }],
    actions: ["pin", "unpin"]
  }, { idFactory: () => "r1" }), { ok: false, reason: "conflicting-rule-actions" });
});

test("matches hostname and native group title case-insensitively with explanations", () => {
  const evaluation = evaluateRules({ ruleState: state([rule("docs", 10, [
    { field: "hostname", operator: "equals", value: "DOCS.EXAMPLE.COM" },
    { field: "nativeGroupTitle", operator: "contains", value: "develop" }
  ])]), snapshot });
  assert.equal(evaluation.matches.length, 1);
  assert.equal(evaluation.matches[0].tabId, 11);
  assert.equal(evaluation.matches[0].explanation.every((item) => item.matched), true);
});

test("matches boolean tree and audio metadata", () => {
  const evaluation = evaluateRules({ ruleState: state([rule("media-child", 2, [
    { field: "treeChild", operator: "is", value: true },
    { field: "audible", operator: "is", value: true }
  ])]), snapshot });
  assert.deepEqual(evaluation.matches.map((match) => match.tabId), [12]);
});

test("globally disabled engine produces no matches", () => {
  const evaluation = evaluateRules({ ruleState: state([rule("docs", 1, [{ field: "hostname", operator: "contains", value: "example" }])], false), snapshot });
  assert.equal(evaluation.engineEnabled, false);
  assert.equal(evaluation.matches.length, 0);
});

test("disabled rules are skipped", () => {
  const evaluation = evaluateRules({ ruleState: state([rule("off", 1, [{ field: "hostname", operator: "contains", value: "example" }], false)]), snapshot });
  assert.equal(evaluation.evaluatedRuleCount, 0);
});

test("higher priority evaluates first with stable rule-id tie break", () => {
  const rules = [
    rule("z-low", 1, [{ field: "hostname", operator: "contains", value: "example" }]),
    rule("b-high", 10, [{ field: "hostname", operator: "contains", value: "example" }]),
    rule("a-high", 10, [{ field: "hostname", operator: "contains", value: "example" }])
  ];
  const ids = evaluateRules({ ruleState: state(rules), snapshot }).matches.map((match) => match.ruleId);
  assert.deepEqual(ids.slice(0, 6), ["a-high", "a-high", "b-high", "b-high", "z-low", "z-low"]);
});

test("incognito tabs are excluded from local rule evaluation", () => {
  const evaluation = evaluateRules({ ruleState: state([rule("all", 1, [{ field: "hostname", operator: "contains", value: "example" }])]), snapshot });
  assert.deepEqual(evaluation.matches.map((match) => match.tabId), [11, 12]);
});

test("plans the highest-priority compatible action for each tab", () => {
  const plan = planRuleActions({
    ruleState: state([
      rule("low", 1, [{ field: "hostname", operator: "contains", value: "docs" }], true, ["mute"]),
      rule("high", 5, [{ field: "hostname", operator: "contains", value: "docs" }], true, ["pin"])
    ]),
    snapshot
  });
  assert.equal(plan.conflicts.length, 0);
  assert.equal(plan.actions.length, 1);
  assert.equal(plan.actions[0].tabId, 11);
  assert.deepEqual(plan.actions[0].actions, ["pin"]);
  assert.deepEqual(plan.actions[0].ruleIds, ["high"]);
});

test("fails closed on equal-priority action disagreement", () => {
  const plan = planRuleActions({
    ruleState: state([
      rule("a", 5, [{ field: "hostname", operator: "contains", value: "docs" }], true, ["pin"]),
      rule("b", 5, [{ field: "hostname", operator: "contains", value: "docs" }], true, ["mute"])
    ]),
    snapshot
  });
  assert.equal(plan.actions.length, 0);
  assert.equal(plan.conflicts.length, 1);
  assert.equal(plan.conflicts[0].reason, "equal-priority-action-conflict");
});
