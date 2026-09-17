import { countExactUrlDuplicates, flattenTabs } from "../core/state.js";

const summary = document.querySelector("#summary");
const saveWindow = document.querySelector("#save-window");
const openSidebar = document.querySelector("#open-sidebar");
const openManager = document.querySelector("#open-manager");
const refreshButton = document.querySelector("#refresh");

async function refresh() {
  const [dashboard, snooze] = await Promise.all([
    browser.runtime.sendMessage({ type: "atm:get-dashboard-state" }),
    browser.runtime.sendMessage({ type: "atm:get-snooze-state" })
  ]);
  if (!dashboard?.ok) throw new Error(dashboard?.reason || "dashboard state unavailable");
  const snapshot = dashboard.snapshot;
  const tabs = flattenTabs(snapshot);
  const duplicates = countExactUrlDuplicates(snapshot);
  const treeChildren = tabs.filter((tab) => tab.treeParentLogicalId).length;
  const tabSets = dashboard.state.tabSets.length;
  const stashed = dashboard.state.stashedItems.length;
  const snoozed = snooze?.ok ? snooze.state.items.length : 0;
  summary.textContent = `${tabs.length} open tabs · ${snapshot.groups.length} native groups · ${treeChildren} tree children · ${tabSets} Tab Sets · ${stashed} stashed · ${snoozed} snoozed · ${duplicates.duplicateTabs} exact duplicate tabs`;
}

saveWindow.addEventListener("click", async () => {
  const result = await browser.runtime.sendMessage({ type: "atm:save-focused-window-tab-set" });
  if (!result?.ok) {
    summary.textContent = `Focused window was not saved (${result?.reason || "unknown error"}).`;
    return;
  }
  summary.textContent = `${result.itemCount} tabs saved as ${result.name}${result.skippedTabCount ? ` · ${result.skippedTabCount} unsupported tabs left out` : ""}.`;
});

openSidebar.addEventListener("click", async () => {
  await browser.sidebarAction.open();
  window.close();
});

openManager.addEventListener("click", async () => {
  await browser.tabs.create({ url: browser.runtime.getURL("src/manager/manager.html") });
  window.close();
});

refreshButton.addEventListener("click", refresh);

refresh().catch((error) => {
  console.error(error);
  summary.textContent = "Unable to read live or saved browser state.";
});
