import { buildSnapshot } from "../core/state.js";

const LOGICAL_ID_KEY = "goreecloud.advancedTabManager.logicalId.v1";
const CHANGE_MESSAGE = "atm:state-changed";

async function ensureLogicalId(tabId) {
  let logicalId = await browser.sessions.getTabValue(tabId, LOGICAL_ID_KEY);
  if (typeof logicalId === "string" && logicalId.length > 0) {
    return logicalId;
  }

  logicalId = crypto.randomUUID();
  await browser.sessions.setTabValue(tabId, LOGICAL_ID_KEY, logicalId);
  return logicalId;
}

async function readLiveSnapshot() {
  const windows = await browser.windows.getAll({ populate: true, windowTypes: ["normal"] });
  const groups = await browser.tabGroups.query({});
  const logicalIds = new Map();

  await Promise.all(
    windows.flatMap((window) => (window.tabs || []).map(async (tab) => {
      if (!Number.isInteger(tab.id) || tab.incognito) return;
      try {
        logicalIds.set(tab.id, await ensureLogicalId(tab.id));
      } catch (error) {
        console.warn("Advanced Tab Manager could not assign a logical tab ID", tab.id, error);
      }
    }))
  );

  return buildSnapshot({ windows, groups, logicalIds });
}

function broadcastChange(reason) {
  browser.runtime.sendMessage({ type: CHANGE_MESSAGE, reason, at: Date.now() }).catch(() => {
    // No extension view is currently open. The live browser remains authoritative.
  });
}

function registerEvent(source, reason) {
  source.addListener(() => broadcastChange(reason));
}

registerEvent(browser.tabs.onCreated, "tab-created");
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

browser.runtime.onMessage.addListener(async (message) => {
  switch (message?.type) {
    case "atm:get-snapshot":
      return readLiveSnapshot();
    case "atm:activate-tab": {
      const tab = await browser.tabs.get(message.tabId);
      await browser.windows.update(tab.windowId, { focused: true });
      return browser.tabs.update(message.tabId, { active: true });
    }
    case "atm:close-tab":
      await browser.tabs.remove(message.tabId);
      return { ok: true };
    case "atm:discard-tab":
      await browser.tabs.discard(message.tabId);
      return { ok: true };
    case "atm:set-pinned":
      return browser.tabs.update(message.tabId, { pinned: Boolean(message.pinned) });
    case "atm:set-muted":
      return browser.tabs.update(message.tabId, { muted: Boolean(message.muted) });
    default:
      return undefined;
  }
});
