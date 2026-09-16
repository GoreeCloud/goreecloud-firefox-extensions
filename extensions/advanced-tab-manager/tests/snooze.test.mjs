import test from "node:test";
import assert from "node:assert/strict";
import {
  SNOOZE_ALARM_PREFIX,
  alarmNameForSnooze,
  nextSnoozeAlarmTime,
  prepareSnoozedItem,
  snoozeIdFromAlarmName
} from "../src/core/snooze.js";

test("snooze alarm names round-trip only within the ATM namespace", () => {
  const name = alarmNameForSnooze("abc");
  assert.equal(name, `${SNOOZE_ALARM_PREFIX}abc`);
  assert.equal(snoozeIdFromAlarmName(name), "abc");
  assert.equal(snoozeIdFromAlarmName("other:abc"), null);
});

test("startup reconstruction delays overdue alarms by a small grace period", () => {
  assert.equal(nextSnoozeAlarmTime(500, 1000), 2000);
  assert.equal(nextSnoozeAlarmTime(5000, 1000), 5000);
});

test("preparing a snoozed item preserves minimal organization metadata", () => {
  const result = prepareSnoozedItem({
    tab: { id: 2, windowId: 1, groupId: 7, incognito: false, pinned: false, url: "https://example.com/a", title: "A", treeParentLogicalId: "parent-1" },
    groups: [{ id: 7, windowId: 1, title: "Research", color: "blue", collapsed: true }],
    wakeAt: 5000,
    now: 1000,
    idFactory: () => "s1"
  });
  assert.equal(result.ok, true);
  assert.deepEqual(result.item.nativeGroup, { title: "Research", color: "blue", collapsed: true });
  assert.equal(result.item.treeParentLogicalId, "parent-1");
});

test("preparing a snooze rejects private, unsupported, and expired inputs", () => {
  const base = { id: 2, windowId: 1, groupId: -1, incognito: false, pinned: false, url: "https://example.com", title: "A" };
  assert.equal(prepareSnoozedItem({ tab: { ...base, incognito: true }, wakeAt: 2000, now: 1000, idFactory: () => "x" }).reason, "private-window");
  assert.equal(prepareSnoozedItem({ tab: { ...base, url: "about:config" }, wakeAt: 2000, now: 1000, idFactory: () => "x" }).reason, "unsupported-url");
  assert.equal(prepareSnoozedItem({ tab: base, wakeAt: 1000, now: 1000, idFactory: () => "x" }).reason, "deadline-not-in-future");
});
