import test from "node:test";
import assert from "node:assert/strict";
import { persistScheduleThenClose } from "../src/core/snooze-transaction.js";

function successPersist() { return { ok: true, previousRecord: { exists: false, state: { schemaVersion: 1, revision: 0, items: [] } } }; }

test("snooze transaction closes only after persistence and alarm verification", async () => {
  const order = [];
  const result = await persistScheduleThenClose({
    persist: async () => { order.push("persist"); return successPersist(); },
    schedule: async () => { order.push("schedule"); },
    verifySchedule: async () => { order.push("verify"); return true; },
    closeSource: async () => { order.push("close"); },
    rollbackPersist: async () => ({ ok: true }),
    clearSchedule: async () => true
  });
  assert.equal(result.ok, true);
  assert.deepEqual(order, ["persist", "schedule", "verify", "close"]);
});

test("alarm verification failure restores persisted state and does not close source", async () => {
  let closed = false;
  let rolledBack = false;
  const result = await persistScheduleThenClose({
    persist: async () => successPersist(),
    schedule: async () => {},
    verifySchedule: async () => false,
    closeSource: async () => { closed = true; },
    rollbackPersist: async () => { rolledBack = true; return { ok: true }; },
    clearSchedule: async () => true
  });
  assert.equal(result.phase, "schedule");
  assert.equal(result.rolledBack, true);
  assert.equal(rolledBack, true);
  assert.equal(closed, false);
});

test("source close failure clears alarm and restores previous snooze record", async () => {
  let cleared = false;
  const result = await persistScheduleThenClose({
    persist: async () => successPersist(),
    schedule: async () => {},
    verifySchedule: async () => true,
    closeSource: async () => { throw new Error("close failed"); },
    rollbackPersist: async () => ({ ok: true }),
    clearSchedule: async () => { cleared = true; return true; }
  });
  assert.equal(result.phase, "close");
  assert.equal(result.rolledBack, true);
  assert.equal(cleared, true);
});
