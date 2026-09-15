import { flattenTabs, TAB_GROUP_ID_NONE } from "../core/state.js";

const search = document.querySelector("#search");
const summary = document.querySelector("#summary");
const content = document.querySelector("#content");
const refresh = document.querySelector("#refresh");
let snapshot = null;

function groupLabel(groupId, groupsById) {
  if (groupId === TAB_GROUP_ID_NONE) return "Ungrouped";
  return groupsById.get(groupId)?.title || `Group ${groupId}`;
}

function badge(text) {
  const node = document.createElement("span");
  node.className = "badge";
  node.textContent = text;
  return node;
}

function actionButton(label, title, action, tabId) {
  const button = document.createElement("button");
  button.className = "row-action";
  button.type = "button";
  button.textContent = label;
  button.title = title;
  button.dataset.action = action;
  button.dataset.tabId = String(tabId);
  return button;
}

function render() {
  content.replaceChildren();
  if (!snapshot) return;

  const needle = search.value.trim().toLocaleLowerCase();
  const allTabs = flattenTabs(snapshot);
  const visibleTabs = needle
    ? allTabs.filter((tab) => `${tab.title} ${tab.url}`.toLocaleLowerCase().includes(needle))
    : allTabs;

  const discarded = allTabs.filter((tab) => tab.discarded).length;
  const pinned = allTabs.filter((tab) => tab.pinned).length;
  summary.textContent = `${allTabs.length} tabs · ${snapshot.windows.length} windows · ${snapshot.groups.length} native groups · ${pinned} pinned · ${discarded} discarded`;

  const visibleIds = new Set(visibleTabs.map((tab) => tab.id));
  const groupsById = new Map(snapshot.groups.map((group) => [group.id, group]));

  for (const window of snapshot.windows) {
    const tabs = window.tabs.filter((tab) => visibleIds.has(tab.id));
    if (!tabs.length) continue;

    const windowSection = document.createElement("section");
    windowSection.className = "window";
    const heading = document.createElement("div");
    heading.className = "window-heading";
    heading.textContent = `${window.focused ? "Focused window" : `Window ${window.id}`} · ${tabs.length} tabs`;
    windowSection.append(heading);

    const grouped = new Map();
    for (const tab of tabs) {
      if (!grouped.has(tab.groupId)) grouped.set(tab.groupId, []);
      grouped.get(tab.groupId).push(tab);
    }

    for (const [groupId, groupTabs] of grouped) {
      const group = document.createElement("section");
      group.className = "group";
      const title = document.createElement("div");
      title.className = "group-title";
      title.textContent = `${groupLabel(groupId, groupsById)} · ${groupTabs.length}`;
      group.append(title);

      for (const tab of groupTabs) {
        const row = document.createElement("div");
        row.className = "tab-row";
        row.tabIndex = 0;
        row.dataset.tabId = String(tab.id);
        row.dataset.active = String(tab.active);

        const main = document.createElement("div");
        main.className = "tab-main";
        const tabTitle = document.createElement("div");
        tabTitle.className = "tab-title";
        tabTitle.textContent = tab.title;
        const url = document.createElement("div");
        url.className = "tab-url";
        url.textContent = tab.url || "Internal Firefox page";
        main.append(tabTitle, url);

        const badges = document.createElement("div");
        badges.className = "badges";
        if (tab.pinned) badges.append(badge("Pinned"));
        if (tab.audible) badges.append(badge("Audio"));
        if (tab.muted) badges.append(badge("Muted"));
        if (tab.discarded) badges.append(badge("Discarded"));
        if (badges.childElementCount) main.append(badges);

        const actions = document.createElement("div");
        actions.className = "actions";
        if (!tab.active && !tab.pinned && !tab.audible) {
          actions.append(actionButton("◌", "Discard tab", "discard", tab.id));
        }
        actions.append(actionButton("×", "Close tab", "close", tab.id));
        row.append(main, actions);
        group.append(row);
      }
      windowSection.append(group);
    }
    content.append(windowSection);
  }

  if (!content.childElementCount) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = needle ? "No open tabs match this search." : "No normal Firefox tabs are available.";
    content.append(empty);
  }
}

async function load() {
  summary.textContent = "Reading live Firefox state…";
  snapshot = await browser.runtime.sendMessage({ type: "atm:get-snapshot" });
  render();
}

async function activate(tabId) {
  await browser.runtime.sendMessage({ type: "atm:activate-tab", tabId });
}

content.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action]");
  if (button) {
    event.stopPropagation();
    const tabId = Number(button.dataset.tabId);
    const type = button.dataset.action === "discard" ? "atm:discard-tab" : "atm:close-tab";
    await browser.runtime.sendMessage({ type, tabId });
    return;
  }
  const row = event.target.closest(".tab-row");
  if (row) await activate(Number(row.dataset.tabId));
});

content.addEventListener("keydown", async (event) => {
  if ((event.key === "Enter" || event.key === " ") && event.target.classList.contains("tab-row")) {
    event.preventDefault();
    await activate(Number(event.target.dataset.tabId));
  }
});

search.addEventListener("input", render);
refresh.addEventListener("click", load);
browser.runtime.onMessage.addListener((message) => {
  if (message?.type === "atm:state-changed") load();
});

load().catch((error) => {
  console.error(error);
  summary.textContent = "Unable to read Firefox tab state.";
});
