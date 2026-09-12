import test from "node:test";
import assert from "node:assert/strict";
import { buildIsolationHealth } from "../src/isolation-health.js";

function config(webspaces) {
  return { webspaces };
}

test("reports healthy when every Webspace has a distinct existing Firefox cookie store", () => {
  const health = buildIsolationHealth(config({
    standard: { id: "standard", name: "Standard", cookieStoreId: "firefox-container-1" },
    google: { id: "google", name: "Google", cookieStoreId: "firefox-container-2" }
  }), [
    { cookieStoreId: "firefox-container-1" },
    { cookieStoreId: "firefox-container-2" }
  ]);

  assert.equal(health.healthy, true);
  assert.equal(health.managedWebspaces, 2);
  assert.equal(health.uniqueCookieStores, 2);
  assert.equal(health.firefoxIdentitiesPresent, 2);
  assert.equal(health.issueCount, 0);
  assert.ok(health.records.every((record) => record.healthy));
});

test("detects two Webspaces sharing one Firefox cookie store", () => {
  const health = buildIsolationHealth(config({
    google: { id: "google", name: "Google", cookieStoreId: "firefox-container-7" },
    work: { id: "work", name: "Work", cookieStoreId: "firefox-container-7" }
  }), [{ cookieStoreId: "firefox-container-7" }]);

  assert.equal(health.healthy, false);
  assert.equal(health.uniqueCookieStores, 1);
  assert.equal(health.issueCount, 2);
  assert.deepEqual(health.records[0].issues, ["shared-cookie-store"]);
  assert.deepEqual(health.records[1].issues, ["shared-cookie-store"]);
});

test("detects missing cookie-store mappings and removed Firefox identities", () => {
  const health = buildIsolationHealth(config({
    meta: { id: "meta", name: "Meta", cookieStoreId: "firefox-container-missing" },
    custom: { id: "custom", name: "Custom" }
  }), []);

  const meta = health.records.find((record) => record.webspaceId === "meta");
  const custom = health.records.find((record) => record.webspaceId === "custom");

  assert.equal(health.healthy, false);
  assert.deepEqual(meta.issues, ["missing-firefox-identity"]);
  assert.deepEqual(custom.issues, ["missing-cookie-store"]);
});
