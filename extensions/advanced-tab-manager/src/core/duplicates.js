import { flattenTabs } from "./state.js";

export const DUPLICATE_POLICY = Object.freeze({
  mode: "exact-url",
  reviewRequired: true,
  blockedReasons: Object.freeze(["active", "pinned", "audible", "hidden", "incognito", "tree-child", "tree-parent", "excluded"])
});

function tabOrder(a, b) {
  return Number(b.windowFocused) - Number(a.windowFocused) || a.windowId - b.windowId || a.index - b.index || a.id - b.id;
}

function blockReasons(tab, treeParentLogicalIds, excludedTabIds) {
  const reasons = [];
  if (tab.active) reasons.push("active");
  if (tab.pinned) reasons.push("pinned");
  if (tab.audible) reasons.push("audible");
  if (tab.hidden) reasons.push("hidden");
  if (tab.incognito) reasons.push("incognito");
  if (tab.treeParentLogicalId) reasons.push("tree-child");
  if (tab.logicalId && treeParentLogicalIds.has(tab.logicalId)) reasons.push("tree-parent");
  if (excludedTabIds.has(tab.id)) reasons.push("excluded");
  return reasons;
}

export function buildExactDuplicateReview(snapshot, { excludedTabIds = [] } = {}) {
  const excluded = new Set(excludedTabIds);
  const treeParentLogicalIds = new Set(
    flattenTabs(snapshot).map((tab) => tab.treeParentLogicalId).filter(Boolean)
  );
  const byUrl = new Map();

  for (const window of snapshot.windows) {
    for (const tab of window.tabs) {
      if (!tab.url) continue;
      if (!byUrl.has(tab.url)) byUrl.set(tab.url, []);
      byUrl.get(tab.url).push({ ...tab, windowFocused: Boolean(window.focused) });
    }
  }

  const sets = [];
  for (const [url, rawTabs] of byUrl) {
    if (rawTabs.length < 2) continue;
    const members = rawTabs.sort(tabOrder).map((tab) => ({
      ...tab,
      blockedReasons: blockReasons(tab, treeParentLogicalIds, excluded)
    }));
    const blocked = members.filter((tab) => tab.blockedReasons.length > 0);
    const defaultKeepTabId = (blocked[0] || members[0]).id;
    sets.push({
      id: `exact:${url}`,
      mode: DUPLICATE_POLICY.mode,
      url,
      members,
      defaultKeepTabId,
      eligibleCloseCount: members.filter((tab) => tab.id !== defaultKeepTabId && tab.blockedReasons.length === 0).length
    });
  }

  sets.sort((a, b) => a.url.localeCompare(b.url));
  return {
    mode: DUPLICATE_POLICY.mode,
    reviewRequired: true,
    duplicateSets: sets.length,
    duplicateTabs: sets.reduce((count, set) => count + set.members.length - 1, 0),
    sets
  };
}

export function planExactDuplicateCleanup(duplicateSet, { keepTabId = duplicateSet?.defaultKeepTabId } = {}) {
  if (!duplicateSet || !Array.isArray(duplicateSet.members) || duplicateSet.members.length < 2) {
    return { ok: false, reason: "duplicate-set-unavailable" };
  }
  const selected = duplicateSet.members.find((tab) => tab.id === keepTabId);
  if (!selected) return { ok: false, reason: "selected-keeper-not-in-current-set" };

  const closeTabIds = duplicateSet.members
    .filter((tab) => tab.id !== selected.id && tab.blockedReasons.length === 0)
    .map((tab) => tab.id);
  const blocked = duplicateSet.members
    .filter((tab) => tab.id !== selected.id && tab.blockedReasons.length > 0)
    .map((tab) => ({ tabId: tab.id, reasons: [...tab.blockedReasons] }));

  return {
    ok: true,
    mode: duplicateSet.mode,
    url: duplicateSet.url,
    keepTabId: selected.id,
    closeTabIds,
    blocked
  };
}
