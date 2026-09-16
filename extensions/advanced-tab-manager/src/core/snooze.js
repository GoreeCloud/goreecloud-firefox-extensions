import { isSnoozeRestorableUrl } from "./snooze-store.js";

export const SNOOZE_ALARM_PREFIX = "goreecloud-advanced-tab-manager-snooze:";
export const SNOOZE_RETRY_DELAY_MS = 60_000;
export const SNOOZE_STARTUP_GRACE_MS = 1_000;

export function alarmNameForSnooze(id) {
  return `${SNOOZE_ALARM_PREFIX}${id}`;
}

export function snoozeIdFromAlarmName(name) {
  if (typeof name !== "string" || !name.startsWith(SNOOZE_ALARM_PREFIX)) return null;
  const id = name.slice(SNOOZE_ALARM_PREFIX.length);
  return id || null;
}

export function nextSnoozeAlarmTime(wakeAt, now = Date.now()) {
  return Math.max(wakeAt, now + SNOOZE_STARTUP_GRACE_MS);
}

export function prepareSnoozedItem({ tab, groups = [], wakeAt, idFactory, now = Date.now() }) {
  if (!tab || typeof idFactory !== "function") throw new Error("invalid snooze input");
  if (tab.incognito) return { ok: false, reason: "private-window" };
  if (!isSnoozeRestorableUrl(tab.url)) return { ok: false, reason: "unsupported-url" };
  if (!Number.isInteger(wakeAt) || wakeAt <= now) return { ok: false, reason: "deadline-not-in-future" };

  const group = !tab.pinned
    ? groups.find((candidate) => candidate.id === tab.groupId && candidate.windowId === tab.windowId)
    : null;

  return {
    ok: true,
    item: {
      id: idFactory(),
      url: tab.url,
      title: tab.title || "Untitled tab",
      pinned: Boolean(tab.pinned),
      createdAt: now,
      wakeAt,
      treeParentLogicalId: typeof tab.treeParentLogicalId === "string" && tab.treeParentLogicalId ? tab.treeParentLogicalId : null,
      nativeGroup: group ? {
        title: group.title || "Unnamed group",
        color: group.color || "grey",
        collapsed: Boolean(group.collapsed)
      } : null
    }
  };
}
