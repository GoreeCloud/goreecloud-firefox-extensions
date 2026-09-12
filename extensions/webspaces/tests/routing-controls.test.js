import test from "node:test";
import assert from "node:assert/strict";
import {
  applyRoutingPause,
  clearRestartPause,
  createRoutingPause,
  getRoutingPause,
  pauseAppliesToHostname,
  resumeRouting,
  setDefaultBehavior
} from "../src/routing-controls.js";
import { analyzeRouting, evaluateRouting } from "../src/routing.js";
import { normalizeAssignmentHostname } from "../src/management.js";
import { applyBulkAssignments, parseBulkHostnames } from "../src/bulk-rules.js";

const base = {
  schemaVersion: 1,
  routingEnabled: true,
  defaultBehavior: "normal",
  webspaces: {
    work: { id: "work", name: "Work", temporary: false, locked: false },
    temp: { id: "temp", name: "Temp", temporary: true, locked: false }
  },
  userRules: [],
  exceptions: []
};

test("creates timed routing pauses and expires them deterministically", () => {
  const now = Date.parse("2026-09-12T08:00:00Z");
  const config = applyRoutingPause(base, "five-minutes", { now });
  const active = getRoutingPause(config, now + 60_000);
  assert.equal(active.mode, "timed");
  assert.equal(active.durationMinutes, 5);
  assert.equal(pauseAppliesToHostname(active, "example.com"), true);
  assert.equal(getRoutingPause(config, now + 5 * 60_000), null);
});

test("site-only pause applies only to the exact hostname", () => {
  const now = Date.parse("2026-09-12T08:00:00Z");
  const pause = createRoutingPause("site", { hostname: "docs.example.com", now });
  const config = { ...base, routingPause: pause };
  assert.equal(evaluateRouting("https://docs.example.com/page", config, now + 1).reason, "routing-paused-site");
  assert.notEqual(evaluateRouting("https://other.example.com", config, now + 1).reason, "routing-paused-site");
});

test("restart pause clears without disabling routing", () => {
  const paused = applyRoutingPause(base, "restart", { now: Date.now() });
  assert.equal(getRoutingPause(paused).mode, "restart");
  const cleared = clearRestartPause(paused);
  assert.equal(getRoutingPause(cleared), null);
  assert.equal(cleared.routingEnabled, true);
});

test("indefinite pause uses the existing routingEnabled authority", () => {
  const paused = applyRoutingPause(base, "indefinite");
  assert.equal(paused.routingEnabled, false);
  assert.equal(getRoutingPause(paused).mode, "indefinite");
  assert.equal(resumeRouting(paused).routingEnabled, true);
});

test("selected default Webspace routes otherwise-unassigned sites", () => {
  const config = setDefaultBehavior(base, "webspace", "work");
  const result = analyzeRouting("https://example.org", config);
  assert.equal(result.decision.webspaceId, "work");
  assert.equal(result.decision.reason, "default-webspace");
});

test("temporary Webspaces cannot become the default", () => {
  assert.throws(() => setDefaultBehavior(base, "webspace", "temp"), /Temporary/);
});

test("normal default clears a prior selected Webspace", () => {
  const selected = setDefaultBehavior(base, "webspace", "work");
  const normal = setDefaultBehavior(selected, "normal");
  assert.equal(normal.defaultBehavior, "normal");
  assert.equal("defaultWebspaceId" in normal, false);
});

test("explicit local-development hostnames normalize without automatic assignment", () => {
  assert.equal(normalizeAssignmentHostname("http://localhost:3000/app"), "localhost");
  assert.equal(normalizeAssignmentHostname("http://127.0.0.1:8080"), "127.0.0.1");
  assert.equal(normalizeAssignmentHostname("http://[::1]:5173"), "[::1]");
  assert.equal(evaluateRouting("http://localhost:3000", base).action, "normal");
});

test("bulk parser deduplicates hostnames and accepts URLs", () => {
  assert.deepEqual(
    parseBulkHostnames("docs.example.com\nhttps://docs.example.com/path; localhost:3000"),
    ["docs.example.com", "localhost"]
  );
});

test("bulk assignment adds new rules and skips conflicting unlocked ownership", () => {
  const input = {
    ...base,
    webspaces: { ...base.webspaces, personal: { id: "personal", name: "Personal", locked: false } },
    userRules: [{ id: "existing", kind: "domain", value: "owned.example.com", webspaceId: "personal", enabled: true }]
  };
  let n = 0;
  const result = applyBulkAssignments(input, {
    text: "new.example.com\nowned.example.com",
    kind: "domain",
    webspaceId: "work"
  }, () => String(++n));
  assert.deepEqual(result.summary, { added: 1, unchanged: 0, skipped: 1, total: 2 });
  assert.equal(result.config.userRules.some((rule) => rule.value === "new.example.com" && rule.webspaceId === "work"), true);
  assert.equal(result.config.userRules.find((rule) => rule.value === "owned.example.com").webspaceId, "personal");
});

test("bulk assignment refuses to retarget a rule owned by a locked Webspace", () => {
  const input = {
    ...base,
    webspaces: { ...base.webspaces, secure: { id: "secure", name: "Secure", locked: true } },
    userRules: [{ id: "locked", kind: "domain", value: "secure.example.com", webspaceId: "secure", enabled: true }]
  };
  assert.throws(() => applyBulkAssignments(input, {
    text: "secure.example.com",
    kind: "domain",
    webspaceId: "work"
  }), /locked Webspace Secure/);
});
