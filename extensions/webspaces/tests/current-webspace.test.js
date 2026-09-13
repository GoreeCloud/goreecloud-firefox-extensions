import test from "node:test";
import assert from "node:assert/strict";

import { resolveCurrentWebspace } from "../src/current-webspace.js";

const webspaces = {
  standard: { id: "standard", cookieStoreId: "firefox-container-1" },
  proton: { id: "proton", cookieStoreId: "firefox-container-2" }
};

test("uses the tab cookieStoreId when Firefox reports it directly", () => {
  const current = resolveCurrentWebspace(webspaces, {
    id: 10,
    cookieStoreId: "firefox-container-2"
  });
  assert.equal(current?.id, "proton");
});

test("falls back to Firefox cookie-store tab membership when the tab store is missing or default", () => {
  const current = resolveCurrentWebspace(
    webspaces,
    { id: 42, cookieStoreId: "firefox-default" },
    [
      { id: "firefox-default", tabIds: [] },
      { id: "firefox-container-1", tabIds: [42] }
    ]
  );
  assert.equal(current?.id, "standard");
});

test("returns null when Firefox exposes no managed contextual identity for the tab", () => {
  const current = resolveCurrentWebspace(
    webspaces,
    { id: 99, cookieStoreId: "firefox-default" },
    [{ id: "firefox-default", tabIds: [99] }]
  );
  assert.equal(current, null);
});

test("direct managed cookieStoreId takes precedence over fallback membership", () => {
  const current = resolveCurrentWebspace(
    webspaces,
    { id: 7, cookieStoreId: "firefox-container-2" },
    [{ id: "firefox-container-1", tabIds: [7] }]
  );
  assert.equal(current?.id, "proton");
});
