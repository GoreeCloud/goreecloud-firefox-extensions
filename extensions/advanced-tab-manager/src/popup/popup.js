import { countExactUrlDuplicates, flattenTabs } from "../core/state.js";

const summary = document.querySelector("#summary");
const saveWindow = document.querySelector("#save-window");
const openSidebar = document.querySelector("#open-sidebar");
const openManager = document.querySelector("#open-manager");
const refreshButton = document.querySelector("#refresh");

function setMetric(id, value) {
  const element = document.querySelector(`#${id}`);
  if (element) element.textContent = String(value);
}

async function refresh() {
  summary.textContent = "Refreshing this Firefox profile…";
  const [dashboard, snooze] = await Promise.all([
    browser.runtime.sendMessage({ type: "atm:get-dashboard-state" }),
    browser.runtime.sendMessage({ type: "atm:get-snooze-state" })
  ]);
  if (!dashboard?.ok) throw new Error(dashboard?.reason || "dashboard state unavailable");

  const snapshot = dashboard.snapshot;
  const tabs = flattenTabs(snapshot);
  const duplicates = countExactUrlDuplicates(snapshot);
  const tabSets = dashboard.state.tabSets.length;
  const snoozed = snooze?.ok ? snooze.state.items.length : 0;

  setMetric("metric-tabs", tabs.length);
  setMetric("metric-tab-sets", tabSets);
  setMetric("metric-snoozed", snoozed);
  setMetric("metric-duplicates", duplicates.duplicateTabs);

  const windowLabel = snapshot.windows.length === 1 ? "window" : "windows";
  const groupLabel = snapshot.groups.length === 1 ? "native group" : "native groups";
  summary.textContent = `Ready · ${snapshot.windows.length} ${windowLabel} · ${snapshot.groups.length} ${groupLabel}`;
}

saveWindow.addEventListener("click", async () => {
  const result = await browser.runtime.sendMessage({ type: "atm:save-focused-window-tab-set" });
  if (!result?.ok) {
    summary.textContent = `Focused window was not saved (${result?.reason || "unknown error"}).`;
    return;
  }
  await refresh();
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

refreshButton.addEventListener("click", () => {
  refresh().catch((error) => {
    console.error(error);
    summary.textContent = "Unable to read live or saved browser state.";
  });
});

refresh().catch((error) => {
  console.error(error);
  summary.textContent = "Unable to read live or saved browser state.";
});
