"use strict";

const assert = require("node:assert/strict");
require("../src/core.js");

const C = globalThis.PrivacyShieldCore;

assert.equal(
  C.cleanUrl("https://example.com/path?utm_source=test&ok=1&fbclid=abc", { bypassRedirects: true }),
  "https://example.com/path?ok=1"
);

assert.equal(
  C.cleanUrl("https://example.com/path?%75tm_source=encoded&fbclid=a&fbclid=b&keep=1", { bypassRedirects: true }),
  "https://example.com/path?keep=1"
);

assert.equal(
  C.cleanUrl("https://www.google.com/url?q=https%3A%2F%2Fexample.com%2Fp%3Fgclid%3Dx%26keep%3D1", { bypassRedirects: true }),
  "https://example.com/p?keep=1"
);

assert.equal(
  C.cleanUrl("https://l.facebook.com/l.php?u=https%3A%2F%2Fexample.com%2Farticle%3Futm_medium%3Dsocial%26id%3D7", { bypassRedirects: true }),
  "https://example.com/article?id=7"
);

assert.equal(C.hostnameMatches("sub.tracker.example", "tracker.example"), true);
assert.equal(C.hostnameMatches("nottracker.example", "tracker.example"), false);
assert.equal(C.sameSite("www.example.com", "cdn.example.com"), true);

const parsed = C.parseFilterText([
  "||tracker.example^",
  "@@||safe.example^",
  "example.com##.sponsored",
  "example.com#@#.allowed-ad",
  "/evil\\.js/"
].join("\n"));

assert.deepEqual(parsed.blockDomains, ["tracker.example"]);
assert.deepEqual(parsed.allowDomains, ["safe.example"]);
assert.equal(parsed.cosmetic[0].selector, ".sponsored");
assert.equal(parsed.cosmeticExceptions[0].selector, ".allowed-ad");
assert.equal(C.patternMatches("https://cdn.example/evil.js", parsed.urlPatterns[0]), true);

assert.equal(
  C.LOCAL_RESOURCE_CATALOG["https://cdn.jsdelivr.net/npm/normalize.css@8.0.1/normalize.css"],
  "vendor/normalize-8.0.1.css"
);
assert.equal(C.LOCAL_RESOURCE_CATALOG["https://cdn.jsdelivr.net/npm/normalize.css@8.0.1/normalize.min.css"], undefined);

console.log("Privacy Shield core behavior tests passed.");
