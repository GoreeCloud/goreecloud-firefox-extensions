"use strict";

const assert = require("node:assert/strict");
require("../src/logger-privacy.js");

const L = globalThis.PrivacyShieldLoggerPrivacy;

const google = L.sanitizeUrl("https://play.google.com/log?auth=SAPISIDHASH%201234567890abcdef&format=json&opi=89978449");
assert.equal(google.hostname, "play.google.com");
assert.match(google.url, /auth=\[redacted\]/);
assert.match(google.url, /format=json/);
assert.match(google.url, /opi=89978449/);
assert.equal(google.redacted, true);
assert.equal(google.url.includes("SAPISIDHASH"), false);

const apiKey = L.sanitizeUrl("https://example.com/v1?api-key=supersecretvalue&keep=1");
assert.match(apiKey.url, /api-key=\[redacted\]/);
assert.match(apiKey.url, /keep=1/);

const jwt = L.sanitizeUrl("https://example.com/callback?state=eyJhbGciOiJIUzI1NiJ9.abcdefghijklmno.pqrstuvwxyz123456&keep=yes");
assert.match(jwt.url, /state=\[redacted\]/);
assert.match(jwt.url, /keep=yes/);

const longIdentifier = L.sanitizeUrl("https://example.com/telemetry?event=abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMN&short=ok");
assert.match(longIdentifier.url, /event=\[redacted\]/);
assert.match(longIdentifier.url, /short=ok/);

const credentials = L.sanitizeUrl("https://user:password@example.com/private?keep=1#secret-fragment");
assert.equal(credentials.url, "https://example.com/private?keep=1");
assert.equal(credentials.redacted, true);
assert.equal(credentials.url.includes("user"), false);
assert.equal(credentials.url.includes("password"), false);
assert.equal(credentials.url.includes("secret-fragment"), false);

const entry = L.publicEntry({
  id: "1",
  time: 123,
  tabId: 4,
  type: "beacon",
  method: "POST",
  verdict: "blocked",
  reason: "telemetry-beacon",
  url: "https://example.com/log?token=abc123&keep=1",
  finalUrl: null
});
assert.equal(entry.hostname, "example.com");
assert.equal(entry.url, "https://example.com/log?token=[redacted]&keep=1");
assert.equal(entry.redacted, true);

console.log("Privacy Shield logger privacy tests passed.");
