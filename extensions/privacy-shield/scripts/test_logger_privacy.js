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

const strictGoogle = L.privacyViewUrl(google.url);
assert.match(strictGoogle.url, /auth=\[redacted\]/);
assert.match(strictGoogle.url, /opi=\[private\]/);
assert.equal(strictGoogle.privateMasked, true);

const strictIdentifiers = L.privacyViewUrl("https://www.google.com/gen_204?ei=opaque-event&zx=opaque-cache&keep=useful");
assert.match(strictIdentifiers.url, /ei=\[private\]/);
assert.match(strictIdentifiers.url, /zx=\[private\]/);
assert.match(strictIdentifiers.url, /keep=useful/);
assert.equal(strictIdentifiers.privateMasked, true);

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
assert.equal(entry.count, 1);
assert.equal(entry.source, "network");

const pageEntry = L.publicEntry({
  id: "page-1",
  time: 456,
  tabId: 8,
  type: "page",
  verdict: "hidden",
  reason: "cosmetic-content",
  url: "https://www.reddit.com/?request_id=opaque-value&keep=1",
  count: 3,
  source: "page"
});
assert.equal(pageEntry.hostname, "www.reddit.com");
assert.equal(pageEntry.verdict, "hidden");
assert.equal(pageEntry.count, 3);
assert.equal(pageEntry.source, "page");
assert.match(L.privacyViewUrl(pageEntry.url).url, /request_id=\[private\]/);

console.log("Privacy Shield logger privacy tests passed.");
