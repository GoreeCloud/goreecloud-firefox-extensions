export const TAB_GROUP_ID_NONE = -1;

export function normalizeTab(tab, logicalId = null) {
  return {
    id: tab.id,
    logicalId,
    windowId: tab.windowId,
    index: tab.index,
    groupId: Number.isInteger(tab.groupId) ? tab.groupId : TAB_GROUP_ID_NONE,
    active: Boolean(tab.active),
    highlighted: Boolean(tab.highlighted),
    pinned: Boolean(tab.pinned),
    audible: Boolean(tab.audible),
    muted: Boolean(tab.mutedInfo?.muted),
    discarded: Boolean(tab.discarded),
    hidden: Boolean(tab.hidden),
    incognito: Boolean(tab.incognito),
    title: tab.title || "Untitled tab",
    url: tab.url || "",
    favIconUrl: tab.favIconUrl || ""
  };
}

export function normalizeGroup(group) {
  return {
    id: group.id,
    windowId: group.windowId,
    title: group.title || "Unnamed group",
    color: group.color || "grey",
    collapsed: Boolean(group.collapsed)
  };
}

export function buildSnapshot({ windows, groups, logicalIds = new Map(), capturedAt = Date.now() }) {
  const normalizedWindows = windows
    .filter((window) => window.type === undefined || window.type === "normal")
    .map((window) => ({
      id: window.id,
      focused: Boolean(window.focused),
      incognito: Boolean(window.incognito),
      tabs: (window.tabs || [])
        .map((tab) => normalizeTab(tab, logicalIds.get(tab.id) || null))
        .sort((a, b) => a.index - b.index)
    }))
    .sort((a, b) => Number(b.focused) - Number(a.focused) || a.id - b.id);

  const normalizedGroups = groups
    .map(normalizeGroup)
    .sort((a, b) => a.windowId - b.windowId || a.id - b.id);

  return {
    schemaVersion: 1,
    capturedAt,
    windows: normalizedWindows,
    groups: normalizedGroups
  };
}

export function flattenTabs(snapshot) {
  return snapshot.windows.flatMap((window) => window.tabs);
}

export function countExactUrlDuplicates(snapshot) {
  const counts = new Map();
  for (const tab of flattenTabs(snapshot)) {
    if (!tab.url) continue;
    counts.set(tab.url, (counts.get(tab.url) || 0) + 1);
  }

  let duplicateTabs = 0;
  let duplicateSets = 0;
  for (const count of counts.values()) {
    if (count > 1) {
      duplicateSets += 1;
      duplicateTabs += count - 1;
    }
  }
  return { duplicateSets, duplicateTabs };
}
