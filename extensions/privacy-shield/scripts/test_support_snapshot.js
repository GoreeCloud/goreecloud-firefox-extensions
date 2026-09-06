"use strict";

const assert = require("node:assert/strict");

require("../src/support-snapshot.js");
const S = globalThis.PrivacyShieldSupportSnapshot;

assert.equal(S.cleanHostname("WWW.Example.COM\nsecret"), "www.example.comsecret");
assert.equal(S.nonNegativeInteger(-10), 0);
assert.equal(S.nonNegativeInteger(4.9), 4);
assert.equal(S.profileLabel("strict"), "Strict");
assert.equal(S.profileLabel("unexpected"), "Custom");

const rows = S.normalizedReasonRows([
  { label: "Tracker requests", count: 2 },
  { label: "Tracking-parameter cleanup", count: 1 },
  { label: "", count: 5 },
  { label: "Ignored zero", count: 0 }
]);
assert.deepEqual(rows, [
  { label: "Tracker requests", count: 2 },
  { label: "Tracking-parameter cleanup", count: 1 },
  { label: "Other protection", count: 5 }
]);

const snapshot = S.buildSnapshot({
  version: "0.2.0",
  browserName: "Firefox",
  browserVersion: "155.0.1",
  hostname: "www.theverge.com",
  enabled: true,
  profile: "standard",
  stats: { blocked: 2, cleaned: 1, hidden: 0, local: 0 },
  reasonRows: [
    { label: "Tracker requests", count: 2 },
    { label: "Tracking-parameter cleanup", count: 1 }
  ],
  // Unknown input fields are deliberately ignored so callers cannot accidentally
  // leak raw activity data into the copied support snapshot.
  url: "https://www.theverge.com/story?token=raw-secret&utm_source=private",
  finalUrl: "https://example.com/?session=secret",
  loggerId: "private-event-id",
  dom: "<input value='secret'>"
});

assert.match(snapshot, /GoreeCloud Privacy Shield support snapshot/);
assert.match(snapshot, /Extension: 0\.2\.0/);
assert.match(snapshot, /Browser: Firefox 155\.0\.1/);
assert.match(snapshot, /Site: www\.theverge\.com/);
assert.match(snapshot, /Protection: On/);
assert.match(snapshot, /Site mode: Standard/);
assert.match(snapshot, /2 blocked, 1 cleaned, 0 hidden, 0 local/);
assert.match(snapshot, /Tracker requests: 2/);
assert.match(snapshot, /Tracking-parameter cleanup: 1/);
assert.match(snapshot, /no raw request URLs/i);

for (const forbidden of [
  "raw-secret",
  "utm_source",
  "session=secret",
  "private-event-id",
  "<input",
  "https://"
]) {
  assert.equal(snapshot.includes(forbidden), false, `snapshot leaked forbidden value: ${forbidden}`);
}

const empty = S.buildSnapshot({
  version: "0.2.0",
  hostname: "",
  enabled: false,
  profile: "custom",
  stats: {}
});
assert.match(empty, /Site: not available/);
assert.match(empty, /Protection: Off/);
assert.match(empty, /Site mode: Custom/);
assert.match(empty, /Protection details: none recorded/);

console.log("Privacy Shield support snapshot tests passed.");
