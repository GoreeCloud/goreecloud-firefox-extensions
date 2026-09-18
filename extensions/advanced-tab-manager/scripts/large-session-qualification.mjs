import { mkdirSync, writeFileSync } from "node:fs";
import { performance } from "node:perf_hooks";
import { buildManagerModel } from "../src/core/manager-model.js";
import { captureSessionSnapshot, snapshotTabCount } from "../src/core/session-snapshots.js";

const SIZES = [100, 500, 1000];
const MAX_CORE_MILLISECONDS = 2000;

function makeInput(tabCount) {
  const tabs = Array.from({ length: tabCount }, (_, index) => ({
    id: index + 1,
    windowId: 1,
    index,
    active: index === 0,
    highlighted: index === 0,
    pinned: index < 5,
    audible: false,
    discarded: index % 11 === 0,
    hidden: false,
    incognito: false,
    groupId: index % 10 < 5 ? 7 : -1,
    title: `Tab ${index}`,
    url: `https://example.test/item/${index}`,
    logicalId: `logical-${index}`,
    treeParentLogicalId: index > 0 && index % 7 === 0 ? `logical-${index - 1}` : null
  }));
  return {
    windows: [{ id: 1, focused: true, incognito: false, tabs }],
    groups: [{ id: 7, windowId: 1, title: "Scale", color: "blue", collapsed: false }]
  };
}

let idCounter = 0;
const idFactory = () => `benchmark-${++idCounter}`;
const manifest = {
  version: "0.1.11",
  permissions: ["alarms", "sessions", "storage", "tabGroups", "tabs"],
  incognito: "not_allowed",
  browser_specific_settings: { gecko: { strict_min_version: "139.0" } }
};

const results = [];
for (const tabCount of SIZES) {
  const snapshot = makeInput(tabCount);
  const captureStart = performance.now();
  const captured = captureSessionSnapshot({ snapshot, idFactory, now: 1700000000000 });
  const captureMs = performance.now() - captureStart;
  if (!captured.ok || snapshotTabCount(captured.sessionSnapshot) !== tabCount) {
    throw new Error(`session snapshot qualification failed for ${tabCount} tabs`);
  }

  const managerStart = performance.now();
  const model = buildManagerModel({
    generatedAt: 1700000000000,
    manifest,
    dashboard: {
      ok: true,
      snapshot,
      state: {
        schemaVersion: 1,
        revision: 1,
        tabSets: [],
        stashedItems: [],
        sessionSnapshots: [captured.sessionSnapshot],
        snapshotRetention: 10
      }
    },
    snooze: { ok: true, state: { schemaVersion: 1, revision: 1, items: [] } },
    rules: { ok: true, state: { schemaVersion: 1, revision: 1, enabled: false, rules: [] } }
  });
  const managerMs = performance.now() - managerStart;
  if (model.counts.tabs !== tabCount || model.counts.sessionSnapshots !== 1) {
    throw new Error(`manager qualification failed for ${tabCount} tabs`);
  }
  if (captureMs > MAX_CORE_MILLISECONDS || managerMs > MAX_CORE_MILLISECONDS) {
    throw new Error(`core scale budget exceeded for ${tabCount} tabs`);
  }

  results.push({
    tabCount,
    sessionSnapshotCaptureMs: Number(captureMs.toFixed(3)),
    managerAggregationMs: Number(managerMs.toFixed(3)),
    maximumAllowedMsPerOperation: MAX_CORE_MILLISECONDS
  });
}

const report = {
  product: "GoreeCloud Advanced Tab Manager",
  sourceVersion: "0.1.11",
  qualification: "deterministic core-scale only; representative Firefox rendered/runtime performance remains separate",
  sizes: results
};

mkdirSync("dist", { recursive: true });
writeFileSync("dist/advanced-tab-manager-large-session-qualification.json", `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report));
