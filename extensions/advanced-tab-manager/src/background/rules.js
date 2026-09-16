import {
  RuleStateError,
  commitRuleStateMutation,
  readRuleStateRecord
} from "../core/rule-state.js";
import { evaluateRules, normalizeRuleInput } from "../core/rules.js";

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
        return { ok: true, previewOnly: true, evaluation: evaluateRules({ ruleState: record.state, snapshot }) };
      } catch (error) {
        return { ok: false, reason: reasonFromError(error), previewOnly: true, evaluation: null };
      }
    });
  }

  return { deleteRule, previewRuleEvaluation, readRuleState, setRuleEngineEnabled, upsertRule };
}
