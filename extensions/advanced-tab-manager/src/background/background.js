import { buildSnapshot, flattenTabs } from "../core/state.js";
import { wouldCreateCycle } from "../core/tree.js";
import { persistVerifiedTabString } from "../core/tree-session.js";

const LOGICAL_ID_KEY = "goreecloud.advancedTabManager.logicalId.v1";
const TREE_PARENT_LOGICAL_ID_KEY = "goreecloud.advancedTabManager.treeParentLogicalId.v1";
const CHANGE_MESSAGE = "atm:state-changed";

function presentString(value) { return typeof value === "string" && value.length > 0 ? value : null; }

async function ensureLogicalId(tabId) {
  let logicalId = await browser.sessions.getTabValue(tabId, LOGICAL_ID_KEY);
  if (presentString(logicalId)) return logicalId;
  logicalId = crypto.randomUUID();
  await browser.sessions.setTabValue(tabId, LOGICAL_ID_KEY, logicalId);
  const verified = await browser.sessions.getTabValue(tabId, LOGICAL_ID_KEY);
  if (verified !== logicalId) throw new Error("logical tab ID verification failed");
  return logicalId;
}

async function readTreeParentLogicalId(tabId) {
  return presentString(await browser.sessions.getTabValue(tabId, TREE_PARENT_LOGICAL_ID_KEY));
}

async function readLiveSnapshot() {
  const windows = await browser.windows.getAll({ populate: true, windowTypes: ["normal"] });
  const groups = await browser.tabGroups.query({});
  const logicalIds = new Map();
  const treeParents = new Map();
  await Promise.all(windows.flatMap((window) => (window.tabs || []).map(async (tab) => {
    if (!Number.isInteger(tab.id) || tab.incognito) return;
    try {
      const [logicalId, treeParentLogicalId] = await Promise.all([ensureLogicalId(tab.id), readTreeParentLogicalId(tab.id)]);
      logicalIds.set(tab.id, logicalId);
      if (treeParentLogicalId) treeParents.set(tab.id, treeParentLogicalId);
    } catch (error) {
      console.warn("Advanced Tab Manager could not read durable tab metadata", tab.id, error);
    }
  })));
  return buildSnapshot({ windows, groups, logicalIds, treeParents });
}

function broadcastChange(reason) {
  browser.runtime.sendMessage({ type: CHANGE_MESSAGE, reason, at: Date.now() }).catch(() => {});
}
function registerEvent(source, reason) { source.addListener(() => broadcastChange(reason)); }

async function adoptOpenerRelationship(tab) {
  if (!Number.isInteger(tab.id) || !Number.isInteger(tab.openerTabId) || tab.incognito) return;
  const existing = await readTreeParentLogicalId(tab.id);
  if (existing) return;
  let opener;
  try { opener = await browser.tabs.get(tab.openerTabId); } catch { return; }
  if (opener.incognito || opener.windowId !== tab.windowId) return;
  const parentLogicalId = await ensureLogicalId(opener.id);
  await ensureLogicalId(tab.id);
  const persisted = await persistVerifiedTabString({ sessions: browser.sessions, tabId: tab.id, key: TREE_PARENT_LOGICAL_ID_KEY, value: parentLogicalId });
  if (!persisted.ok) throw new Error("tree parent verification failed");
}

async function setTreeParent(tabId, parentTabId) {
  const child = await browser.tabs.get(tabId);
  if (child.incognito) return { ok: false, reason: "private-window" };
  if (parentTabId === null || parentTabId === undefined) {
    const persisted = await persistVerifiedTabString({ sessions: browser.sessions, tabId, key: TREE_PARENT_LOGICAL_ID_KEY, value: null });
    if (!persisted.ok) return { ok: false, reason: "detach-verification-failed", rolledBack: persisted.rolledBack };
    broadcastChange("tree-parent-removed");
    return { ok: true, parentLogicalId: null };
  }
  const parent = await browser.tabs.get(parentTabId);
  if (parent.incognito) return { ok: false, reason: "private-window" };
  if (parent.id === child.id) return { ok: false, reason: "self-parent" };
  if (parent.windowId !== child.windowId) return { ok: false, reason: "cross-window" };
  const snapshot = await readLiveSnapshot();
  const tabs = flattenTabs(snapshot);
  const childState = tabs.find((tab) => tab.id === child.id);
  const parentState = tabs.find((tab) => tab.id === parent.id);
  if (!childState?.logicalId || !parentState?.logicalId) return { ok: false, reason: "metadata-unavailable" };
  if (wouldCreateCycle(tabs, childState.logicalId, parentState.logicalId)) return { ok: false, reason: "cycle" };
  const [currentChild, currentParent] = await Promise.all([browser.tabs.get(tabId), browser.tabs.get(parentTabId)]);
  if (currentChild.windowId !== currentParent.windowId) return { ok: false, reason: "cross-window" };
  if (currentChild.incognito || currentParent.incognito) return { ok: false, reason: "private-window" };
  const persisted = await persistVerifiedTabString({ sessions: browser.sessions, tabId, key: TREE_PARENT_LOGICAL_ID_KEY, value: parentState.logicalId });
  if (!persisted.ok) return { ok: false, reason: "attach-verification-failed", rolledBack: persisted.rolledBack };
  broadcastChange("tree-parent-set");
  return { ok: true, parentLogicalId: parentState.logicalId };
}

browser.tabs.onCreated.addListener((tab) => {
  adoptOpenerRelationship(tab).catch((error) => console.warn("Advanced Tab Manager could not adopt opener tree relationship", error)).finally(() => broadcastChange("tab-created"));
});
registerEvent(browser.tabs.onUpdated, "tab-updated");
registerEvent(browser.tabs.onRemoved, "tab-removed");
registerEvent(browser.tabs.onMoved, "tab-moved");
registerEvent(browser.tabs.onAttached, "tab-attached");
registerEvent(browser.tabs.onDetached, "tab-detached");
registerEvent(browser.tabs.onActivated, "tab-activated");
registerEvent(browser.tabs.onHighlighted, "tab-highlighted");
registerEvent(browser.tabs.onReplaced, "tab-replaced");
registerEvent(browser.windows.onCreated, "window-created");
registerEvent(browser.windows.onRemoved, "window-removed");
registerEvent(browser.windows.onFocusChanged, "window-focus-changed");
registerEvent(browser.tabGroups.onCreated, "group-created");
registerEvent(browser.tabGroups.onUpdated, "group-updated");
registerEvent(browser.tabGroups.onRemoved, "group-removed");
registerEvent(browser.tabGroups.onMoved, "group-moved");
registerEvent(browser.sessions.onChanged, "session-changed");

browser.runtime.onMessage.addListener(async (message) => {
  switch (message?.type) {
    case "atm:get-snapshot": return readLiveSnapshot();
    case "atm:activate-tab": {
      const tab = await browser.tabs.get(message.tabId);
      await browser.windows.update(tab.windowId, { focused: true });
      return browser.tabs.update(message.tabId, { active: true });
    }
    case "atm:close-tab": await browser.tabs.remove(message.tabId); return { ok: true };
    case "atm:discard-tab": await browser.tabs.discard(message.tabId); return { ok: true };
    case "atm:set-pinned": return browser.tabs.update(message.tabId, { pinned: Boolean(message.pinned) });
    case "atm:set-muted": return browser.tabs.update(message.tabId, { muted: Boolean(message.muted) });
    case "atm:set-tree-parent": return setTreeParent(message.tabId, message.parentTabId ?? null);
    default: return undefined;
  }
});
