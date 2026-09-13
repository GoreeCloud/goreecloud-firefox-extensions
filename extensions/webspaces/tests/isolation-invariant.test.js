import test from "node:test";
import assert from "node:assert/strict";
import { assertDistinctCookieStores } from "../src/containers.js";

test("managed Webspaces require distinct Firefox cookie stores", () => {
  const config = {
    webspaces: {
      standard: { id: "standard", cookieStoreId: "firefox-container-1" },
      google: { id: "google", cookieStoreId: "firefox-container-2" },
      work: { id: "work", cookieStoreId: "firefox-container-3" }
    }
  };

  assert.equal(assertDistinctCookieStores(config), true);
});

test("shared cookieStoreId fails closed instead of sharing browser state", () => {
  const config = {
    webspaces: {
      standard: { id: "standard", cookieStoreId: "firefox-container-1" },
      google: { id: "google", cookieStoreId: "firefox-container-1" }
    }
  };

  assert.throws(
    () => assertDistinctCookieStores(config),
    /share Firefox cookie store firefox-container-1/
  );
});

test("managed Webspaces without a cookie store fail the isolation invariant", () => {
  const config = {
    webspaces: {
      standard: { id: "standard", cookieStoreId: "firefox-container-1" },
      work: { id: "work" }
    }
  };

  assert.throws(
    () => assertDistinctCookieStores(config),
    /work has no Firefox cookie store/
  );
});
