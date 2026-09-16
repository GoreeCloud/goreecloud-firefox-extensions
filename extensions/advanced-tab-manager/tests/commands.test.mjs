import assert from "node:assert/strict";
import test from "node:test";

import { COMMANDS, commandById, searchCommands } from "../src/core/commands.js";

test("catalog has stable unique command ids", () => {
  assert.equal(COMMANDS.length, 9);
  assert.equal(new Set(COMMANDS.map((command) => command.id)).size, COMMANDS.length);
});

test("empty query preserves authored deterministic order", () => {
  assert.deepEqual(searchCommands("").map((command) => command.id), COMMANDS.map((command) => command.id));
});

test("title prefix outranks keyword-only matches", () => {
  const results = searchCommands("open rules");
  assert.equal(results[0]?.id, "view-rules");
});

test("multi-token matching requires every token", () => {
  assert.deepEqual(searchCommands("save window").map((command) => command.id), ["save-window"]);
  assert.deepEqual(searchCommands("save duplicate"), []);
});

test("keyword search finds duplicate review without adding destructive command semantics", () => {
  const results = searchCommands("cleanup");
  assert.deepEqual(results.map((command) => command.id), ["view-duplicates"]);
  assert.equal(results[0].action.type, "view");
});

test("catalog exposes only bounded non-destructive palette action types", () => {
  const allowed = new Set(["view", "focus-search", "refresh", "save-window"]);
  for (const command of COMMANDS) assert.ok(allowed.has(command.action.type), command.id);
});

test("command lookup is exact and fail-closed", () => {
  assert.equal(commandById("refresh-state")?.action.type, "refresh");
  assert.equal(commandById("missing"), null);
});
