"use strict";

const assert = require("node:assert/strict");

require("../src/core.js");
require("../src/site-profiles.js");

const P = globalThis.PrivacyShieldSiteProfiles;

const base = {
  enabled: true,
  blockTrackers: true,
  siteOverrides: {
    "example.com": { enabled: false, blockMedia: true },
    "keep.example": { blockMedia: true }
  }
};

const strict = P.applyProfile(base, "www.example.com", "strict");
assert.notEqual(strict, base, "profile application must return a new settings object");
assert.equal(base.siteOverrides["example.com"].blockMedia, true, "source settings must not be mutated");
assert.equal(strict.siteOverrides["example.com"].enabled, false, "explicit site enabled state must survive profile changes");
assert.equal(strict.siteOverrides["example.com"].blockThirdPartyScripts, true);
assert.equal(strict.siteOverrides["example.com"].blockThirdPartyFrames, true);
assert.equal(strict.siteOverrides["example.com"].cosmeticFiltering, true);
assert.equal(P.profileFor(strict, "example.com"), "strict");

const compatible = P.applyProfile(strict, "example.com", "compatible");
assert.equal(compatible.siteOverrides["example.com"].enabled, false);
assert.equal(compatible.siteOverrides["example.com"].blockTrackers, true);
assert.equal(compatible.siteOverrides["example.com"].stripTrackingParams, true);
assert.equal(compatible.siteOverrides["example.com"].cosmeticFiltering, false);
assert.equal(compatible.siteOverrides["example.com"].localResources, false);
assert.equal(P.profileFor(compatible, "example.com"), "compatible");

const standard = P.applyProfile(compatible, "example.com", "standard");
assert.deepEqual(standard.siteOverrides["example.com"], { enabled: false }, "standard should remove profile-managed overrides but preserve explicit site enable state");
assert.equal(P.profileFor(standard, "example.com"), "standard");
assert.deepEqual(standard.siteOverrides["keep.example"], { blockMedia: true }, "other site overrides must remain untouched");

const custom = {
  ...base,
  siteOverrides: {
    ...base.siteOverrides,
    "custom.example": { blockMedia: true }
  }
};
assert.equal(P.profileFor(custom, "custom.example"), "custom");

const reset = P.resetSite(standard, "example.com");
assert.equal(reset.siteOverrides["example.com"], undefined, "reset must remove the complete current-site override");
assert.deepEqual(reset.siteOverrides["keep.example"], { blockMedia: true });

assert.equal(P.applyProfile(base, "", "strict"), base, "invalid host should not manufacture a site override");
assert.equal(P.applyProfile(base, "example.com", "unknown"), base, "unknown profile should fail closed without mutation");

console.log("Privacy Shield site profile tests passed.");
