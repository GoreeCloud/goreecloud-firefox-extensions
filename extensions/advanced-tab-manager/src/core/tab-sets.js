import { isRestorableUrl } from "./persistent-state.js";

function cleanName(value, now) {
  const trimmed = typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
  if (trimmed) return trimmed.slice(0, 120);
  return `Saved window — ${new Date(now).toISOString().replace("T", " ").slice(0, 16)} UTC`;
}

function sourceGroupById(groups, windowId) {
  return new Map(groups.filter((group) => group.windowId === windowId).map((group) => [group.id, group]));
}

export function captureWindowAsTabSet({ window, groups = [], name = "", idFactory, now = Date.now() }) {
  if (!window || !Array.isArray(window.tabs) || typeof idFactory !== "function") throw new Error("invalid Tab Set capture input");
  if (window.incognito) return { ok: false, reason: "private-window" };

  const ordered = [...window.tabs].sort((a, b) => a.index - b.index);
  const capturedTabs = ordered.filter((tab) => !tab.incognito && isRestorableUrl(tab.url));
  if (!capturedTabs.length) return { ok: false, reason: "no-restorable-tabs", skippedTabCount: ordered.length };

  const tabSetId = idFactory();
  const itemIdByRuntimeId = new Map();
  const itemIdByLogicalId = new Map();
  for (const tab of capturedTabs) {
    const itemId = idFactory();
    itemIdByRuntimeId.set(tab.id, itemId);
    if (typeof tab.logicalId === "string" && tab.logicalId) itemIdByLogicalId.set(tab.logicalId, itemId);
  }

  const groupsByRuntimeId = sourceGroupById(groups, window.id);
  const referencedGroupIds = new Set(capturedTabs.filter((tab) => Number.isInteger(tab.groupId) && tab.groupId !== -1 && !tab.pinned).map((tab) => tab.groupId));
  const localGroupIdByRuntimeId = new Map();
  const savedGroups = [];
  for (const runtimeGroupId of referencedGroupIds) {
    const source = groupsByRuntimeId.get(runtimeGroupId);
    if (!source) continue;
    const localId = idFactory();
    localGroupIdByRuntimeId.set(runtimeGroupId, localId);
    savedGroups.push({
      id: localId,
      title: source.title || "Unnamed group",
      color: source.color || "grey",
      collapsed: Boolean(source.collapsed)
    });
  }

  const items = capturedTabs.map((tab) => ({
    id: itemIdByRuntimeId.get(tab.id),
    url: tab.url,
    title: tab.title || "Untitled tab",
    pinned: Boolean(tab.pinned),
    sourceIndex: tab.index,
    groupId: localGroupIdByRuntimeId.get(tab.groupId) || null,
    parentItemId: itemIdByLogicalId.get(tab.treeParentLogicalId) || null
  }));

  const active = capturedTabs.find((tab) => tab.active);
  return {
    ok: true,
    skippedTabCount: ordered.length - capturedTabs.length,
    tabSet: {
      id: tabSetId,
      name: cleanName(name, now),
      createdAt: now,
      updatedAt: now,
      activeItemId: active ? itemIdByRuntimeId.get(active.id) : null,
      groups: savedGroups,
      items
    }
  };
}

export function prepareStashedItem({ tab, groups = [], idFactory, now = Date.now() }) {
  if (!tab || typeof idFactory !== "function") throw new Error("invalid stash input");
  if (tab.incognito) return { ok: false, reason: "private-window" };
  if (!isRestorableUrl(tab.url)) return { ok: false, reason: "unsupported-url" };
  const group = groups.find((candidate) => candidate.id === tab.groupId && candidate.windowId === tab.windowId);
  return {
    ok: true,
    item: {
      id: idFactory(),
      url: tab.url,
      title: tab.title || "Untitled tab",
      pinned: Boolean(tab.pinned),
      createdAt: now,
      treeParentLogicalId: typeof tab.treeParentLogicalId === "string" && tab.treeParentLogicalId ? tab.treeParentLogicalId : null,
      nativeGroup: group ? {
        title: group.title || "Unnamed group",
        color: group.color || "grey",
        collapsed: Boolean(group.collapsed)
      } : null
    }
  };
}
