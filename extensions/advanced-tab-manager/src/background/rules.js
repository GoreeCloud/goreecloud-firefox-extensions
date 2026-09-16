import {
  RuleStateError,
  commitRuleStateMutation,
  readRuleStateRecord
} from "../core/rule-state.js";
import { evaluateRules, normalizeRuleInput, planRuleActions } from "../core/rules.js";

function planSignature(plan) {
  return JSON.stringify({
    engineEnabled: plan.engineEnabled,
    actions: plan.actions,
    conflicts: plan.conflicts
  });
}

export function createRuleManager({ browser, readLiveSnapshot, broadcastChange, idFactory, now = () => Date.now() }) {
  let operationTail = Promise.resolve();

  function serialize(operation) {
    const run = operationTail.then(operation, operation);
    operationTail = run.catch(() => {});
    return run;
  }

  function reasonFromError(error) {
    return error instanceof RuleStateError ? error.code : "operation-failed";
  }

  async function readRuleState() {
    return serialize(async () => {
      try {
        const record = await readRuleStateRecord(browser.storage.local);
        return { ok: true, state: record.state };
      } catch (error) {
        return { ok: false, reason: reasonFromError(error), state: null };
      }
    });
  }

  async function setRuleEngineEnabled(enabled) {
    if (typeof enabled !== "boolean") return { ok: false, reason: "invalid-rule-engine-enabled" };
    return serialize(async () => {
      try {
        const committed = await commitRuleStateMutation({
          storage: browser.storage.local,
          mutate(state) {
            state.enabled = enabled;
            return state;
          }
        });
        if (!committed.ok) return { ok: false, reason: "storage-verification-failed", rolledBack: committed.rolledBack };
        broadcastChange("rule-engine-updated");
        return { ok: true, enabled, revision: committed.state.revision };
      } catch (error) {
        return { ok: false, reason: reasonFromError(error) };
      }
    });
  }

  async function upsertRule(input) {
    return serialize(async () => {
      try {
        const record = await readRuleStateRecord(browser.storage.local);
        const existing = typeof input?.id === "string" ? record.state.rules.find((rule) => rule.id === input.id) || null : null;
        if (input?.id && !existing) return { ok: false, reason: "rule-not-found" };
        const prepared = normalizeRuleInput(input, { existing, idFactory, now: now() });
        if (!prepared.ok) return prepared;

        const committed = await commitRuleStateMutation({
          storage: browser.storage.local,
          mutate(state) {
            const index = state.rules.findIndex((rule) => rule.id === prepared.rule.id);
            if (index >= 0) state.rules[index] = prepared.rule;
            else state.rules.push(prepared.rule);
            return state;
          }
        });
        if (!committed.ok) return { ok: false, reason: "storage-verification-failed", rolledBack: committed.rolledBack };
        broadcastChange(existing ? "rule-updated" : "rule-created");
        return { ok: true, rule: prepared.rule, revision: committed.state.revision };
      } catch (error) {
        return { ok: false, reason: reasonFromError(error) };
      }
    });
  }

  async function deleteRule(ruleId) {
    if (typeof ruleId !== "string" || !ruleId) return { ok: false, reason: "invalid-rule-id" };
    return serialize(async () => {
      try {
        const record = await readRuleStateRecord(browser.storage.local);
        if (!record.state.rules.some((rule) => rule.id === ruleId)) return { ok: false, reason: "rule-not-found" };
        const committed = await commitRuleStateMutation({
          storage: browser.storage.local,
          mutate(state) {
            state.rules = state.rules.filter((rule) => rule.id !== ruleId);
            return state;
          }
        });
        if (!committed.ok) return { ok: false, reason: "storage-verification-failed", rolledBack: committed.rolledBack };
        broadcastChange("rule-deleted");
        return { ok: true, revision: committed.state.revision };
      } catch (error) {
        return { ok: false, reason: reasonFromError(error) };
      }
    });
  }

  async function previewRuleEvaluation() {
    return serialize(async () => {
      try {
        const [record, snapshot] = await Promise.all([
          readRuleStateRecord(browser.storage.local),
          readLiveSnapshot()
        ]);
        return {
          ok: true,
          previewOnly: true,
          evaluation: evaluateRules({ ruleState: record.state, snapshot }),
          plan: planRuleActions({ ruleState: record.state, snapshot })
        };
      } catch (error) {
        return { ok: false, reason: reasonFromError(error), previewOnly: true, evaluation: null, plan: null };
      }
    });
  }

  async function applyOneAction(tabId, action, current) {
    switch (action) {
      case "pin":
        if (!current.pinned) {
          await browser.tabs.update(tabId, { pinned: true });
          current.pinned = true;
          return true;
        }
        return false;
      case "unpin":
        if (current.pinned) {
          await browser.tabs.update(tabId, { pinned: false });
          current.pinned = false;
          return true;
        }
        return false;
      case "mute":
        if (!current.mutedInfo?.muted && !current.muted) {
          await browser.tabs.update(tabId, { muted: true });
          current.muted = true;
          current.mutedInfo = { ...(current.mutedInfo || {}), muted: true };
          return true;
        }
        return false;
      case "unmute":
        if (current.mutedInfo?.muted || current.muted) {
          await browser.tabs.update(tabId, { muted: false });
          current.muted = false;
          current.mutedInfo = { ...(current.mutedInfo || {}), muted: false };
          return true;
        }
        return false;
      case "discard":
        if (!current.discarded) {
          await browser.tabs.discard(tabId);
          current.discarded = true;
          return true;
        }
        return false;
      default:
        throw new Error("unsupported rule action");
    }
  }

  async function applyRuleActions() {
    return serialize(async () => {
      try {
        const record = await readRuleStateRecord(browser.storage.local);
        if (!record.state.enabled) return { ok: false, reason: "rule-engine-disabled", applied: [], conflicts: [] };

        const firstSnapshot = await readLiveSnapshot();
        const firstPlan = planRuleActions({ ruleState: record.state, snapshot: firstSnapshot });
        if (firstPlan.conflicts.length) {
          return { ok: false, reason: "rule-action-conflict", applied: [], conflicts: firstPlan.conflicts };
        }

        const confirmationSnapshot = await readLiveSnapshot();
        const confirmedPlan = planRuleActions({ ruleState: record.state, snapshot: confirmationSnapshot });
        if (planSignature(firstPlan) !== planSignature(confirmedPlan)) {
          return { ok: false, reason: "browser-state-changed", applied: [], conflicts: confirmedPlan.conflicts };
        }
        if (confirmedPlan.conflicts.length) {
          return { ok: false, reason: "rule-action-conflict", applied: [], conflicts: confirmedPlan.conflicts };
        }

        const applied = [];
        for (const item of confirmedPlan.actions) {
          let current;
          try {
            current = await browser.tabs.get(item.tabId);
          } catch {
            return { ok: false, reason: "browser-state-changed", applied, conflicts: [], failedTabId: item.tabId };
          }
          if (current.incognito || current.windowId !== item.windowId) {
            return { ok: false, reason: "browser-state-changed", applied, conflicts: [], failedTabId: item.tabId };
          }

          const executedActions = [];
          try {
            for (const action of item.actions) {
              if (await applyOneAction(item.tabId, action, current)) executedActions.push(action);
            }
          } catch {
            return { ok: false, reason: "browser-mutation-failed", applied, conflicts: [], failedTabId: item.tabId };
          }
          applied.push({ ...item, executedActions });
        }

        if (applied.some((item) => item.executedActions.length)) broadcastChange("rule-actions-applied");
        return {
          ok: true,
          applied,
          conflicts: [],
          plannedTabCount: confirmedPlan.actions.length,
          changedTabCount: applied.filter((item) => item.executedActions.length).length
        };
      } catch (error) {
        return { ok: false, reason: reasonFromError(error), applied: [], conflicts: [] };
      }
    });
  }

  return {
    applyRuleActions,
    deleteRule,
    previewRuleEvaluation,
    readRuleState,
    setRuleEngineEnabled,
    upsertRule
  };
}
