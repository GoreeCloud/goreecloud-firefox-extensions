import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const background = fs.readFileSync(path.resolve(here, "../src/background.js"), "utf8");

test("quick assignment cannot retarget a rule owned by a locked Webspace", () => {
  assert.match(
    background,
    /if \(existing && existing\.webspaceId !== input\.webspaceId\) \{\s*assertRuleUnlocked\(current, existing\);\s*\}/
  );
});

test("popup and context-menu assignment paths share the guarded addOrAssign flow", () => {
  assert.match(
    background,
    /case "webspaces:assign-site":[\s\S]*?await addOrAssign\(\{[\s\S]*?value: message\.hostname,[\s\S]*?webspaceId: message\.webspaceId/
  );
  assert.match(
    background,
    /parsed\.action === "assign-site"[\s\S]*?await addOrAssign\(\{[\s\S]*?value: hostname,[\s\S]*?webspaceId: target\.id/
  );
});
