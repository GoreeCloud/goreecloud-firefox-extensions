import { actionButton } from "./ui.js";

function describeCondition(condition) {
  const value = typeof condition.value === "boolean" ? String(condition.value) : `"${condition.value}"`;
  return `${condition.field} ${condition.operator} ${value}`;
}

function describeActions(actions = []) {
  return actions.length ? actions.join(" · ") : "preview only";
}

function textIncludesRule(rule, needle) {
  if (!needle) return true;
  return [
    rule.name,
    String(rule.priority),
    ...rule.conditions.flatMap((condition) => [condition.field, condition.operator, String(condition.value)]),
    ...(rule.actions ?? [])
  ].some((value) => String(value).toLocaleLowerCase().includes(needle));
}

export function renderRulesView({ ruleState, rulePreview, needle }) {
  const section = document.createElement("section");
  section.className = "rule-view";

  const intro = document.createElement("div");
  intro.className = "rule-tools";
  const stateText = document.createElement("p");
  stateText.className = "duplicate-policy";
  stateText.textContent = ruleState?.enabled
    ? "Rule engine enabled. Actions run only when you explicitly choose Apply now."
    : "Rule engine disabled. Rules can be edited and previewed without changing tabs.";
  intro.append(
    stateText,
    actionButton(ruleState?.enabled ? "Disable engine" : "Enable engine", ruleState?.enabled ? "Disable rule engine" : "Enable rule engine", "toggle-rule-engine"),
    actionButton("Preview", "Preview rule evaluation without changing tabs", "preview-rule-actions"),
    actionButton("Apply now", "Apply the current conflict-free rule action plan", "apply-rule-actions")
  );
  section.append(intro);

  const form = document.createElement("form");
  form.id = "rule-create-form";
  form.className = "rule-form";
  form.innerHTML = `
    <h2 class="saved-heading">Create hostname rule</h2>
    <label>Name<input name="name" required maxlength="120" placeholder="Documentation tabs"></label>
    <label>Hostname contains<input name="hostname" required placeholder="example.com"></label>
    <label>Action<select name="action" required>
      <option value="pin">Pin</option>
      <option value="unpin">Unpin</option>
      <option value="mute">Mute</option>
      <option value="unmute">Unmute</option>
      <option value="discard">Discard</option>
    </select></label>
    <label>Priority<input name="priority" type="number" min="-1000" max="1000" step="1" value="0"></label>
    <button class="row-action rule-submit" type="submit">Add rule</button>
  `;
  section.append(form);

  if (rulePreview?.ok && rulePreview.plan) {
    const preview = document.createElement("div");
    preview.className = "rule-preview";
    const actionCount = rulePreview.plan.actions.length;
    const conflictCount = rulePreview.plan.conflicts.length;
    preview.textContent = `${actionCount} actionable tab${actionCount === 1 ? "" : "s"} · ${conflictCount} conflict${conflictCount === 1 ? "" : "s"} · ${rulePreview.evaluation.matches.length} total match${rulePreview.evaluation.matches.length === 1 ? "" : "es"}`;
    section.append(preview);
  }

  const rules = (ruleState?.rules ?? []).filter((rule) => textIncludesRule(rule, needle));
  if (!rules.length) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = ruleState?.rules?.length ? "No rules match this search." : "No rules yet.";
    section.append(empty);
    return section;
  }

  const list = document.createElement("div");
  list.className = "rule-list";
  for (const rule of rules.sort((left, right) => right.priority - left.priority || left.id.localeCompare(right.id))) {
    const card = document.createElement("article");
    card.className = "saved-card rule-card";

    const main = document.createElement("div");
    main.className = "saved-main";
    const title = document.createElement("div");
    title.className = "saved-title";
    title.textContent = `${rule.name}${rule.enabled ? "" : " · disabled"}`;
    const meta = document.createElement("div");
    meta.className = "saved-meta";
    meta.textContent = `Priority ${rule.priority} · ${rule.conditions.map(describeCondition).join(" AND ")} · ${describeActions(rule.actions)}`;
    main.append(title, meta);

    const actions = document.createElement("div");
    actions.className = "actions";
    const toggle = actionButton(rule.enabled ? "Disable" : "Enable", rule.enabled ? "Disable this rule" : "Enable this rule", "toggle-rule");
    toggle.dataset.ruleId = rule.id;
    const remove = actionButton("Delete", "Delete this rule", "delete-rule");
    remove.dataset.ruleId = rule.id;
    actions.append(toggle, remove);

    card.append(main, actions);
    list.append(card);
  }
  section.append(list);
  return section;
}
