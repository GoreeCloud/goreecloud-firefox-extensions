import { flattenTabs, TAB_GROUP_ID_NONE } from "../core/state.js";
import { analyzeTree, buildTreeRows } from "../core/tree.js";

const search = document.querySelector("#search");
const summary = document.querySelector("#summary");
const content = document.querySelector("#content");
const refresh = document.querySelector("#refresh");
const viewMode = document.querySelector("#view-mode");
let snapshot = null;

function groupLabel(groupId, groupsById) {
  if (groupId === TAB_GROUP_ID_NONE) return "Ungrouped";
  return groupsById.get(groupId)?.title || `Group ${groupId}`;
}
function badge(text) { const node = document.createElement("span"); node.className = "badge"; node.textContent = text; return node; }
function actionButton(label, title, action, tabId, extra = {}) {
  const button = document.createElement("button");
  button.className = "row-action"; button.type = "button"; button.textContent = label; button.title = title; button.setAttribute("aria-label", title);
  button.dataset.action = action; button.dataset.tabId = String(tabId);
  for (const [key, value] of Object.entries(extra)) button.dataset[key] = String(value);
  return button;
}
function previousBrowserTab(window, tab) {
  const ordered = [...window.tabs].sort((a, b) => a.index - b.index);
  const position = ordered.findIndex((candidate) => candidate.id === tab.id);
  return position > 0 ? ordered[position - 1] : null;
}
function createTabRow(tab, { depth = 0, treeStatus = "root", groupsById, window }) {
  const row = document.createElement("div");
  row.className = "tab-row"; row.tabIndex = 0; row.dataset.tabId = String(tab.id); row.dataset.active = String(tab.active); row.dataset.treeStatus = treeStatus; row.style.setProperty("--tree-depth", String(depth));
  const main = document.createElement("div"); main.className = "tab-main";
  const tabTitle = document.createElement("div"); tabTitle.className = "tab-title"; tabTitle.textContent = tab.title;
  const url = document.createElement("div"); url.className = "tab-url"; url.textContent = tab.url || "Internal Firefox page"; main.append(tabTitle, url);
  const badges = document.createElement("div"); badges.className = "badges";
  if (tab.groupId !== TAB_GROUP_ID_NONE) badges.append(badge(groupLabel(tab.groupId, groupsById)));
  if (tab.pinned) badges.append(badge("Pinned")); if (tab.audible) badges.append(badge("Audio")); if (tab.muted) badges.append(badge("Muted")); if (tab.discarded) badges.append(badge("Discarded"));
  if (treeStatus === "attached") badges.append(badge("Tree child"));
  if (treeStatus === "orphaned") badges.append(badge("Parent unavailable"));
  if (treeStatus === "cycle") badges.append(badge("Tree repaired for view"));
  if (badges.childElementCount) main.append(badges);
  const actions = document.createElement("div"); actions.className = "actions";
  const previous = previousBrowserTab(window, tab);
  if (previous && previous.id !== tab.id) actions.append(actionButton("↳", "Make child of previous browser tab", "indent", tab.id, { parentTabId: previous.id }));
  if (tab.treeParentLogicalId) actions.append(actionButton("↰", "Remove tree parent", "outdent", tab.id));
  if (!tab.active && !tab.pinned && !tab.audible) actions.append(actionButton("◌", "Discard tab", "discard", tab.id));
  actions.append(actionButton("×", "Close tab", "close", tab.id)); row.append(main, actions); return row;
}
function renderGroupView(window, visibleIds, groupsById) {
  const fragment = document.createDocumentFragment(); const grouped = new Map();
  for (const tab of window.tabs.filter((tab) => visibleIds.has(tab.id))) { if (!grouped.has(tab.groupId)) grouped.set(tab.groupId, []); grouped.get(tab.groupId).push(tab); }
  const treeAnalysis = analyzeTree(window.tabs);
  for (const [groupId, groupTabs] of grouped) {
    const group = document.createElement("section"); group.className = "group";
    const title = document.createElement("div"); title.className = "group-title"; title.textContent = `${groupLabel(groupId, groupsById)} · ${groupTabs.length}`; group.append(title);
    for (const tab of groupTabs) group.append(createTabRow(tab, { treeStatus: treeAnalysis.statusByLogicalId.get(tab.logicalId) || "root", groupsById, window }));
    fragment.append(group);
  }
  return fragment;
}
function renderTreeView(window, visibleIds, groupsById) {
  const tree = document.createElement("section"); tree.className = "tree";
  for (const rowInfo of buildTreeRows(window.tabs)) { if (visibleIds.has(rowInfo.tab.id)) tree.append(createTabRow(rowInfo.tab, { ...rowInfo, groupsById, window })); }
  return tree.childElementCount ? tree : null;
}
function render() {
  content.replaceChildren(); if (!snapshot) return;
  const needle = search.value.trim().toLocaleLowerCase(); const allTabs = flattenTabs(snapshot);
  const visibleTabs = needle ? allTabs.filter((tab) => `${tab.title} ${tab.url}`.toLocaleLowerCase().includes(needle)) : allTabs;
  const discarded = allTabs.filter((tab) => tab.discarded).length; const pinned = allTabs.filter((tab) => tab.pinned).length;
  const attached = snapshot.windows.reduce((count, window) => count + [...analyzeTree(window.tabs).statusByLogicalId.values()].filter((status) => status === "attached").length, 0);
  summary.textContent = `${allTabs.length} tabs · ${snapshot.windows.length} windows · ${snapshot.groups.length} native groups · ${attached} tree children · ${pinned} pinned · ${discarded} discarded`;
  const visibleIds = new Set(visibleTabs.map((tab) => tab.id)); const groupsById = new Map(snapshot.groups.map((group) => [group.id, group]));
  for (const window of snapshot.windows) {
    const tabs = window.tabs.filter((tab) => visibleIds.has(tab.id)); if (!tabs.length) continue;
    const windowSection = document.createElement("section"); windowSection.className = "window";
    const heading = document.createElement("div"); heading.className = "window-heading"; heading.textContent = `${window.focused ? "Focused window" : `Window ${window.id}`} · ${tabs.length} tabs`; windowSection.append(heading);
    if (viewMode.value === "groups") windowSection.append(renderGroupView(window, visibleIds, groupsById));
    else { const tree = renderTreeView(window, visibleIds, groupsById); if (tree) windowSection.append(tree); }
    content.append(windowSection);
  }
  if (!content.childElementCount) { const empty = document.createElement("div"); empty.className = "empty"; empty.textContent = needle ? "No open tabs match this search." : "No normal Firefox tabs are available."; content.append(empty); }
}
async function load() { summary.textContent = "Reading live Firefox state…"; snapshot = await browser.runtime.sendMessage({ type: "atm:get-snapshot" }); render(); }
async function activate(tabId) { await browser.runtime.sendMessage({ type: "atm:activate-tab", tabId }); }
async function handleTreeAction(button) {
  const tabId = Number(button.dataset.tabId); const parentTabId = button.dataset.action === "indent" ? Number(button.dataset.parentTabId) : null;
  const result = await browser.runtime.sendMessage({ type: "atm:set-tree-parent", tabId, parentTabId });
  if (!result?.ok) { summary.textContent = `Tree relationship was not changed (${result?.reason || "unknown error"}).`; return; }
  await load();
}
content.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action]");
  if (button) { event.stopPropagation(); const tabId = Number(button.dataset.tabId); if (button.dataset.action === "indent" || button.dataset.action === "outdent") { await handleTreeAction(button); return; } const type = button.dataset.action === "discard" ? "atm:discard-tab" : "atm:close-tab"; await browser.runtime.sendMessage({ type, tabId }); return; }
  const row = event.target.closest(".tab-row"); if (row) await activate(Number(row.dataset.tabId));
});
content.addEventListener("keydown", async (event) => { if ((event.key === "Enter" || event.key === " ") && event.target.classList.contains("tab-row")) { event.preventDefault(); await activate(Number(event.target.dataset.tabId)); } });
search.addEventListener("input", render); viewMode.addEventListener("change", render); refresh.addEventListener("click", load);
browser.runtime.onMessage.addListener((message) => { if (message?.type === "atm:state-changed") load(); });
load().catch((error) => { console.error(error); summary.textContent = "Unable to read Firefox tab state."; });
