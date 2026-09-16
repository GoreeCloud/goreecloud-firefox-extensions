import { TAB_GROUP_ID_NONE } from "../core/state.js";
import { analyzeTree, buildTreeRows } from "../core/tree.js";
import { isRestorableUrl } from "../core/persistent-state.js";
import { actionButton, badge } from "./ui.js";

function groupLabel(groupId, groupsById) {
  if (groupId === TAB_GROUP_ID_NONE) return "Ungrouped";
  return groupsById.get(groupId)?.title || `Group ${groupId}`;
}

function previousBrowserTab(window, tab) {
  const ordered = [...window.tabs].sort((a, b) => a.index - b.index);
  const position = ordered.findIndex((candidate) => candidate.id === tab.id);
  return position > 0 ? ordered[position - 1] : null;
}

function createTabRow(tab, { depth = 0, treeStatus = "root", groupsById, window }) {
  const row = document.createElement("div");
  row.className = "tab-row";
  row.tabIndex = 0;
  row.dataset.tabId = String(tab.id);
  row.dataset.active = String(tab.active);
  row.dataset.treeStatus = treeStatus;
  row.style.setProperty("--tree-depth", String(depth));

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
  if (tab.groupId !== TAB_GROUP_ID_NONE) badges.append(badge(groupLabel(tab.groupId, groupsById)));
  if (tab.pinned) badges.append(badge("Pinned"));
  if (tab.audible) badges.append(badge("Audio"));
  if (tab.muted) badges.append(badge("Muted"));
  if (tab.discarded) badges.append(badge("Discarded"));
  if (treeStatus === "attached") badges.append(badge("Tree child"));
  if (treeStatus === "orphaned") badges.append(badge("Parent unavailable"));
  if (treeStatus === "cycle") badges.append(badge("Tree repaired for view"));
  if (badges.childElementCount) main.append(badges);

  const actions = document.createElement("div");
  actions.className = "actions";
  const previous = previousBrowserTab(window, tab);
  if (previous && previous.id !== tab.id) {
    actions.append(actionButton("↳", "Make child of previous browser tab", "indent", tab.id, { parentTabId: previous.id }));
  }
  if (tab.treeParentLogicalId) actions.append(actionButton("↰", "Remove tree parent", "outdent", tab.id));
  if (isRestorableUrl(tab.url)) {
    actions.append(actionButton("◷", "Snooze tab for 1 hour after its recovery record and alarm are verified", "snooze", tab.id));
    actions.append(actionButton("▣", "Stash tab locally and close it after persistence is verified", "stash", tab.id));
  }
  if (!tab.active && !tab.pinned && !tab.audible) actions.append(actionButton("◌", "Discard tab", "discard", tab.id));
  actions.append(actionButton("×", "Close tab", "close", tab.id));

  row.append(main, actions);
  return row;
}

function renderGroupView(window, visibleIds, groupsById) {
  const fragment = document.createDocumentFragment();
  const grouped = new Map();
  for (const tab of window.tabs.filter((candidate) => visibleIds.has(candidate.id))) {
    if (!grouped.has(tab.groupId)) grouped.set(tab.groupId, []);
    grouped.get(tab.groupId).push(tab);
  }

  const treeAnalysis = analyzeTree(window.tabs);
  for (const [groupId, groupTabs] of grouped) {
    const group = document.createElement("section");
    group.className = "group";
    const title = document.createElement("div");
    title.className = "group-title";
    title.textContent = `${groupLabel(groupId, groupsById)} · ${groupTabs.length}`;
    group.append(title);
    for (const tab of groupTabs) {
      group.append(createTabRow(tab, {
        treeStatus: treeAnalysis.statusByLogicalId.get(tab.logicalId) || "root",
        groupsById,
        window
      }));
    }
    fragment.append(group);
  }
  return fragment;
}

function renderTreeView(window, visibleIds, groupsById) {
  const tree = document.createElement("section");
  tree.className = "tree";
  for (const rowInfo of buildTreeRows(window.tabs)) {
    if (visibleIds.has(rowInfo.tab.id)) tree.append(createTabRow(rowInfo.tab, { ...rowInfo, groupsById, window }));
  }
  return tree.childElementCount ? tree : null;
}

export function renderOpenTabs({ snapshot, needle, viewMode, content }) {
  const allTabs = snapshot.windows.flatMap((window) => window.tabs);
  const visibleTabs = needle
    ? allTabs.filter((tab) => `${tab.title} ${tab.url}`.toLocaleLowerCase().includes(needle))
    : allTabs;
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

    if (viewMode === "groups") {
      windowSection.append(renderGroupView(window, visibleIds, groupsById));
    } else {
      const tree = renderTreeView(window, visibleIds, groupsById);
      if (tree) windowSection.append(tree);
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
