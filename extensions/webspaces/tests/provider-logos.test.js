import test from "node:test";
import assert from "node:assert/strict";
import { PROVIDER_LOGOS, providerIdFromName, providerLogoFor } from "../ui/provider-logos.js";

test("all built-in Webspaces have local provider logo assets", () => {
  for (const id of ["standard", "goreecloud", "google", "microsoft", "meta", "proton"]) {
    const logo = providerLogoFor(id);
    assert.ok(logo, `${id} logo must exist`);
    assert.match(logo.src, new RegExp(`/icons/providers/${id}\\.svg$`));
  }
});

test("provider name mapping supports popup identity decoration", () => {
  assert.equal(providerIdFromName("GoreeCloud"), "goreecloud");
  assert.equal(providerIdFromName("Proton"), "proton");
  assert.equal(providerIdFromName("Work"), null);
});

test("custom Webspaces do not inherit provider logos", () => {
  assert.equal(providerLogoFor({ id: "custom-work", name: "Work" }), null);
  assert.equal(Object.keys(PROVIDER_LOGOS).length, 6);
});
