import { createBrowserState } from "./browser-state.js";
import { createDuplicateCleanup } from "./duplicate-cleanup.js";
import { createManagerState } from "./manager.js";
import { createRuleManager } from "./rules.js";
import { createSavedState } from "./saved-state.js";
import { createSnoozeManager } from "./snooze.js";

const CHANGE_MESSAGE = "atm:state-changed";

function newId() {
  return crypto.randomUUID();
}

function broadcastChange(reason) {
  browser.runtime.sendMessage({ type: CHANGE_MESSAGE, reason, at: Date.now() }).catch(() => {});
}

function registerEvent(source, reason) {
  source.addListener(() => broadcastChange(reason));
}

const browserState = createBrowserState({ browser, broadcastChange, idFactory: newId });
const savedState = createSavedState({
  browser,
  readLiveSnapshot: browserState.readLiveSnapshot,
  setTreeParent: browserState.setTreeParent,
  ensureLogicalId: browserState.ensureLogicalId,
  broadcastChange,
  idFactory: newId
});
const duplicateCleanup = createDuplicateCleanup({
  browser,
  readLiveSnapshot: browserState.readLiveSnapshot,
  broadcastChange
});
const snoozeManager = createSnoozeManager({
  browser,
  readLiveSnapshot: browserState.readLiveSnapshot,
  setTreeParent: browserState.setTreeParent,
  ensureLogicalId: browserState.ensureLogicalId,
  broadcastChange,
  idFactory: newId
});
const ruleManager = createRuleManager({
  browser,
  readLiveSnapshot: browserState.readLiveSnapshot,
  broadcastChange,
  idFactory: newId
});
const managerState = createManagerState({
  getManifest: () => browser.runtime.getManifest(),
  readDashboardState: savedState.readDashboardState,
  readSnoozeState: snoozeManager.readSnoozeState,
  readRuleState: ruleManager.readRuleState
});

browser.tabs.onCreated.addListener((tab) => {
  browserState.adoptOpenerRelationship(tab)
    .catch((error) => console.warn("Advanced Tab Manager could not adopt opener tree relationship", error))
    .finally(() => broadcastChange("tab-created"));
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

if (browser.alarms?.onAlarm) {
  browser.alarms.onAlarm.addListener((alarm) => {
    snoozeManager.handleAlarm(alarm).catch((error) => {
      console.error("Advanced Tab Manager could not process a snooze alarm", error);
    });
  });

  void snoozeManager.reconcileSnoozeAlarms().then((result) => {
    if (!result?.ok) console.warn("Advanced Tab Manager could not fully reconstruct snooze alarms", result?.reason || result);
  }).catch((error) => {
    console.error("Advanced Tab Manager snooze alarm reconstruction failed", error);
  });
}

browser.runtime.onMessage.addListener(async (message) => {
  switch (message?.type) {
    case "atm:get-snapshot":
      return browserState.readLiveSnapshot();
    case "atm:get-organizational-state":
      return savedState.readOrganizationalState();
    case "atm:get-dashboard-state":
      return savedState.readDashboardState();
    case "atm:get-manager-state":
      return managerState.readManagerState();
    case "atm:get-snooze-state":
      return snoozeManager.readSnoozeState();
    case "atm:get-rule-state":
      return ruleManager.readRuleState();
    case "atm:set-rule-engine-enabled":
      return ruleManager.setRuleEngineEnabled(message.enabled);
    case "atm:upsert-rule":
      return ruleManager.upsertRule(message.rule);
    case "atm:delete-rule":
      return ruleManager.deleteRule(message.ruleId);
    case "atm:preview-rule-evaluation":
      return ruleManager.previewRuleEvaluation();
    case "atm:apply-rule-actions":
      return ruleManager.applyRuleActions();
    case "atm:save-focused-window-tab-set":
      return savedState.saveFocusedWindowAsTabSet(message.name || "");
    case "atm:restore-tab-set":
      return savedState.restoreTabSet(message.tabSetId);
    case "atm:delete-tab-set":
      return savedState.deleteTabSet(message.tabSetId);
    case "atm:stash-tab":
      return savedState.stashTab(message.tabId);
    case "atm:restore-stashed-item":
      return savedState.restoreStashedItem(message.stashedItemId);
    case "atm:delete-stashed-item":
      return savedState.deleteStashedItem(message.stashedItemId);
    case "atm:clear-saved-items":
      return savedState.clearSavedItems();
    case "atm:snooze-tab":
      return snoozeManager.snoozeTab(message.tabId, message.wakeAt);
    case "atm:restore-snoozed-item":
      return snoozeManager.restoreSnoozedItem(message.snoozedItemId);
    case "atm:reschedule-snoozed-item":
      return snoozeManager.rescheduleSnoozedItem(message.snoozedItemId, message.wakeAt);
    case "atm:cleanup-exact-duplicates":
      return duplicateCleanup.cleanupExactDuplicates({ url: message.url, keepTabId: message.keepTabId });
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
    case "atm:set-tree-parent":
      return browserState.setTreeParent(message.tabId, message.parentTabId ?? null);
    default:
      return undefined;
  }
});
