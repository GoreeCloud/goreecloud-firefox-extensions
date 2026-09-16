import { flattenTabs } from "../core/state.js";
import { analyzeTree } from "../core/tree.js";
import { renderDuplicateView } from "./duplicates-view.js";
import { renderOpenTabs } from "./open-tabs-view.js";
import { renderRulesView } from "./rules-view.js";
import { renderSavedView } from "./saved-view.js";
import { renderSnoozedView } from "./snoozed-view.js";

const search = document.querySelector("#search");
const summary = document.querySelector("#summary");
const content = document.querySelector("#content");
const refresh = document.querySelector("#refresh");
const saveWindow = document.querySelector("#save-window");
const viewMode = document.querySelector("#view-mode");

let snapshot = null;
let organizationalState = null;
let snoozeState = null;
let ruleState = null;
let rulePreview = null;

function render() {
  content.replaceChildren();
  if (!snapshot) return;

  const needle = search.value.trim().toLocaleLowerCase();
  const allTabs = flattenTabs(snapshot);
  const discarded = allTabs.filter((tab) => tab.discarded).length;
  const pinned = allTabs.filter((tab) => tab.pinned).length;
  const attached = snapshot.windows.reduce(
    (count, window) => count + [...analyzeTree(window.tabs).statusByLogicalId.values()].filter((status) => status === "attached").length,
    0
  );
  const savedSetCount = organizationalState?.tabSets.length ?? 0;
  const stashCount = organizationalState?.stashedItems.length ?? 0;
  const snoozedCount = snoozeState?.items.length ?? 0;
  const ruleCount = ruleState?.rules.length ?? 0;
  summary.textContent = `${allTabs.length} tabs · ${snapshot.windows.length} windows · ${snapshot.groups.length} native groups · ${attached} tree children · ${savedSetCount} Tab Sets · ${stashCount} stashed · ${snoozedCount} snoozed · ${ruleCount} rules · ${pinned} pinned · ${discarded} discarded`;

  if (viewMode.value === "saved") {
    content.append(renderSavedView({ organizationalState, needle }));
    return;
  }
  if (viewMode.value === "snoozed") {
    content.append(renderSnoozedView({ snoozeState, needle }));
    return;
  }
  if (viewMode.value === "duplicates") {
    content.append(renderDuplicateView({ snapshot, needle }));
    return;
  }
  if (viewMode.value === "rules") {
    content.append(renderRulesView({ ruleState, rulePreview, needle }));
    return;
  }

  renderOpenTabs({ snapshot, needle, viewMode: viewMode.value, content });
}

async function load() {
  summary.textContent = "Reading live Firefox and saved state…";
  const [dashboard, snooze, rules] = await Promise.all([
    browser.runtime.sendMessage({ type: "atm:get-dashboard-state" }),
    browser.runtime.sendMessage({ type: "atm:get-snooze-state" }),
    browser.runtime.sendMessage({ type: "atm:get-rule-state" })
  ]);
  if (!dashboard?.ok) {
    snapshot = dashboard?.snapshot;
    organizationalState = null;
    snoozeState = snooze?.ok ? snooze.state : null;
    ruleState = rules?.ok ? rules.state : null;
    summary.textContent = `Saved state is unavailable (${dashboard?.reason || "unknown error"}).`;
    if (snapshot) render();
    return;
  }
  snapshot = dashboard.snapshot;
  organizationalState = dashboard.state;
  snoozeState = snooze?.ok ? snooze.state : null;
  ruleState = rules?.ok ? rules.state : null;
  render();
}

async function activate(tabId) {
  await browser.runtime.sendMessage({ type: "atm:activate-tab", tabId });
}

async function handleTreeAction(button) {
  const tabId = Number(button.dataset.tabId);
  const parentTabId = button.dataset.action === "indent" ? Number(button.dataset.parentTabId) : null;
  const result = await browser.runtime.sendMessage({ type: "atm:set-tree-parent", tabId, parentTabId });
  if (!result?.ok) {
    summary.textContent = `Tree relationship was not changed (${result?.reason || "unknown error"}).`;
    return;
  }
  await load();
}

async function handleSavedAction(button) {
  const id = button.dataset.savedId;
  const messages = {
    "restore-tab-set": { type: "atm:restore-tab-set", tabSetId: id },
    "delete-tab-set": { type: "atm:delete-tab-set", tabSetId: id },
    "restore-stashed-item": { type: "atm:restore-stashed-item", stashedItemId: id },
    "delete-stashed-item": { type: "atm:delete-stashed-item", stashedItemId: id },
    "clear-saved-items": { type: "atm:clear-saved-items" }
  };
  if (button.dataset.action === "clear-saved-items" && !window.confirm("Delete all saved Tab Sets and stashed items? Open Firefox tabs will not be closed.")) return;
  const result = await browser.runtime.sendMessage(messages[button.dataset.action]);
  if (!result?.ok) summary.textContent = `Saved-item operation failed (${result?.reason || "unknown error"}).`;
  await load();
}

async function handleSnoozedAction(button) {
  const snoozedItemId = button.dataset.snoozeId;
  const message = button.dataset.action === "reschedule-snoozed-item"
    ? { type: "atm:reschedule-snoozed-item", snoozedItemId, wakeAt: Date.now() + 60 * 60 * 1000 }
    : { type: "atm:restore-snoozed-item", snoozedItemId };
  const result = await browser.runtime.sendMessage(message);
  if (!result?.ok) {
    summary.textContent = button.dataset.action === "reschedule-snoozed-item"
      ? `Snoozed tab could not be rescheduled (${result?.reason || "unknown error"}).`
      : `Snoozed tab could not be opened (${result?.reason || "unknown error"}).`;
  }
  await load();
}

async function handleDuplicateCleanup(button) {
  const card = button.closest(".duplicate-card");
  const selected = card?.querySelector('input[type="radio"]:checked');
  const keepTabId = Number(selected?.value);
  if (!Number.isInteger(keepTabId)) {
    summary.textContent = "Choose one reviewed tab to keep before duplicate cleanup.";
    return;
  }
  if (!window.confirm("Close only the currently eligible exact-URL duplicates in this reviewed set? Guarded tabs will remain open.")) return;

  const result = await browser.runtime.sendMessage({
    type: "atm:cleanup-exact-duplicates",
    url: button.dataset.duplicateUrl,
    keepTabId
  });
  if (!result?.ok) {
    summary.textContent = `Duplicate cleanup did not run (${result?.reason || "unknown error"}). Refresh and review the set again.`;
    await load();
    return;
  }
  summary.textContent = `${result.closed} eligible duplicate tab${result.closed === 1 ? "" : "s"} closed. Guarded tabs were preserved.`;
  await load();
}

async function handleRuleAction(button) {
  if (button.dataset.action === "toggle-rule-engine") {
    const result = await browser.runtime.sendMessage({
      type: "atm:set-rule-engine-enabled",
      enabled: !Boolean(ruleState?.enabled)
    });
    if (!result?.ok) summary.textContent = `Rule engine state was not changed (${result?.reason || "unknown error"}).`;
    rulePreview = null;
    await load();
    return;
  }

  if (button.dataset.action === "preview-rule-actions") {
    rulePreview = await browser.runtime.sendMessage({ type: "atm:preview-rule-evaluation" });
    if (!rulePreview?.ok) summary.textContent = `Rule preview failed (${rulePreview?.reason || "unknown error"}).`;
    render();
    return;
  }

  if (button.dataset.action === "apply-rule-actions") {
    if (!window.confirm("Apply the current conflict-free rule plan to live non-private tabs? No tabs will be closed or navigated.")) return;
    const result = await browser.runtime.sendMessage({ type: "atm:apply-rule-actions" });
    if (!result?.ok) {
      summary.textContent = `Rule actions were not fully applied (${result?.reason || "unknown error"}). Refresh and preview again.`;
    } else {
      summary.textContent = `${result.changedTabCount} tab${result.changedTabCount === 1 ? "" : "s"} changed from ${result.plannedTabCount} planned rule target${result.plannedTabCount === 1 ? "" : "s"}.`;
    }
    rulePreview = null;
    await load();
    return;
  }

  const rule = ruleState?.rules.find((candidate) => candidate.id === button.dataset.ruleId);
  if (!rule) {
    summary.textContent = "That rule is no longer available. Refresh and try again.";
    return;
  }

  if (button.dataset.action === "toggle-rule") {
    const result = await browser.runtime.sendMessage({
      type: "atm:upsert-rule",
      rule: { ...rule, enabled: !rule.enabled }
    });
    if (!result?.ok) summary.textContent = `Rule was not updated (${result?.reason || "unknown error"}).`;
    rulePreview = null;
    await load();
    return;
  }

  if (button.dataset.action === "delete-rule") {
    if (!window.confirm(`Delete rule "${rule.name}"?`)) return;
    const result = await browser.runtime.sendMessage({ type: "atm:delete-rule", ruleId: rule.id });
    if (!result?.ok) summary.textContent = `Rule was not deleted (${result?.reason || "unknown error"}).`;
    rulePreview = null;
    await load();
  }
}

content.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action]");
  if (button) {
    event.stopPropagation();

    if (button.dataset.action === "toggle-rule-engine"
      || button.dataset.action === "preview-rule-actions"
      || button.dataset.action === "apply-rule-actions"
      || button.dataset.action === "toggle-rule"
      || button.dataset.action === "delete-rule") {
      await handleRuleAction(button);
      return;
    }
    if (button.dataset.action === "cleanup-duplicates") {
      await handleDuplicateCleanup(button);
      return;
    }
    if (button.dataset.snoozeId) {
      await handleSnoozedAction(button);
      return;
    }
    if (button.dataset.savedId) {
      await handleSavedAction(button);
      return;
    }

    const tabId = Number(button.dataset.tabId);
    if (button.dataset.action === "indent" || button.dataset.action === "outdent") {
      await handleTreeAction(button);
      return;
    }
    if (button.dataset.action === "snooze") {
      const wakeAt = Date.now() + 60 * 60 * 1000;
      const result = await browser.runtime.sendMessage({ type: "atm:snooze-tab", tabId, wakeAt });
      if (!result?.ok) summary.textContent = `Tab was not snoozed (${result?.reason || "unknown error"}).`;
      else {
        viewMode.value = "snoozed";
        summary.textContent = `${result.title} snoozed until ${new Date(result.wakeAt).toLocaleString()}.`;
      }
      await load();
      return;
    }
    if (button.dataset.action === "stash") {
      const result = await browser.runtime.sendMessage({ type: "atm:stash-tab", tabId });
      if (!result?.ok) summary.textContent = `Tab was not stashed (${result?.reason || "unknown error"}).`;
      await load();
      return;
    }

    const type = button.dataset.action === "discard" ? "atm:discard-tab" : "atm:close-tab";
    await browser.runtime.sendMessage({ type, tabId });
    return;
  }

  const row = event.target.closest(".tab-row");
  if (row) await activate(Number(row.dataset.tabId));
});

content.addEventListener("submit", async (event) => {
  if (event.target.id !== "rule-create-form") return;
  event.preventDefault();
  const data = new FormData(event.target);
  const name = String(data.get("name") || "").trim();
  const hostname = String(data.get("hostname") || "").trim();
  const action = String(data.get("action") || "");
  const priority = Number(data.get("priority"));
  const result = await browser.runtime.sendMessage({
    type: "atm:upsert-rule",
    rule: {
      name,
      priority,
      conditions: [{ field: "hostname", operator: "contains", value: hostname }],
      actions: [action]
    }
  });
  if (!result?.ok) {
    summary.textContent = `Rule was not created (${result?.reason || "unknown error"}).`;
    return;
  }
  event.target.reset();
  rulePreview = null;
  await load();
});

content.addEventListener("keydown", async (event) => {
  if ((event.key === "Enter" || event.key === " ") && event.target.classList.contains("tab-row")) {
    event.preventDefault();
    await activate(Number(event.target.dataset.tabId));
  }
});

saveWindow.addEventListener("click", async () => {
  const result = await browser.runtime.sendMessage({ type: "atm:save-focused-window-tab-set" });
  if (!result?.ok) {
    summary.textContent = `Focused window was not saved (${result?.reason || "unknown error"}).`;
    return;
  }
  viewMode.value = "saved";
  await load();
});

search.addEventListener("input", render);
viewMode.addEventListener("change", render);
refresh.addEventListener("click", load);
browser.runtime.onMessage.addListener((message) => {
  if (message?.type === "atm:state-changed") load();
});

load().catch((error) => {
  console.error(error);
  summary.textContent = "Unable to read Firefox or saved tab state.";
});
