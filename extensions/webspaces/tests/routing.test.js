import test from "node:test";
import assert from "node:assert/strict";
import { domainMatches, evaluateRouting, hostnameFromUrl } from "../src/routing.js";

const baseConfig = {
  routingEnabled: true,
  defaultBehavior: "webspace",
  defaultWebspaceId: "standard",
  webspaces: { standard: { id: "standard", name: "Standard", builtIn: true } },
  userRules: [],
  exceptions: []
};

test("extracts only HTTP(S) hostnames", () => {
  assert.equal(hostnameFromUrl("https://Mail.Google.com/inbox"), "mail.google.com");
  assert.equal(hostnameFromUrl("about:config"), null);
  assert.equal(hostnameFromUrl("not a url"), null);
});

test("domain match includes root and subdomains but not lookalikes", () => {
  assert.equal(domainMatches("drive.goreecloud.com", "goreecloud.com"), true);
  assert.equal(domainMatches("goreecloud.com", "goreecloud.com"), true);
  assert.equal(domainMatches("fakegoreecloud.com", "goreecloud.com"), false);
});

test("routes GoreeCloud root and subdomains", () => {
  for (const url of ["https://goreecloud.com", "https://drive.goreecloud.com/files"]) {
    const result = evaluateRouting(url, baseConfig);
    assert.equal(result.webspaceId, "goreecloud");
    assert.equal(result.reason, "goreecloud-built-in-rule");
  }
});

test("routes major provider domains", () => {
  assert.equal(evaluateRouting("https://mail.google.com", baseConfig).webspaceId, "google");
  assert.equal(evaluateRouting("https://youtube.com/watch?v=x", baseConfig).webspaceId, "google");
  assert.equal(evaluateRouting("https://outlook.com/mail", baseConfig).webspaceId, "microsoft");
  assert.equal(evaluateRouting("https://instagram.com", baseConfig).webspaceId, "meta");
});

test("explicit user assignment overrides provider routing", () => {
  const config = {
    ...baseConfig,
    userRules: [{ id: "entertainment-youtube", kind: "domain", value: "youtube.com", webspaceId: "entertainment", enabled: true }]
  };
  const result = evaluateRouting("https://youtube.com", config);
  assert.equal(result.webspaceId, "entertainment");
  assert.equal(result.reason, "user-site-assignment");
});

test("user exception can deliberately escape automatic Webspace routing", () => {
  const config = {
    ...baseConfig,
    userRules: [{ id: "work-docs", kind: "exact", value: "docs.google.com", webspaceId: "work", enabled: true }],
    exceptions: [{ id: "normal-docs", kind: "exact", value: "docs.google.com", webspaceId: null, enabled: true }]
  };
  const result = evaluateRouting("https://docs.google.com/document/d/x", config);
  assert.equal(result.action, "normal");
  assert.equal(result.reason, "user-exception");
});

test("routing pause stops automatic routing including Standard fallback", () => {
  const result = evaluateRouting("https://example.org", { ...baseConfig, routingEnabled: false });
  assert.equal(result.action, "normal");
  assert.equal(result.reason, "routing-paused");
});

test("unassigned websites route to the Standard Webspace", () => {
  const result = evaluateRouting("https://example.org", baseConfig);
  assert.equal(result.action, "webspace");
  assert.equal(result.webspaceId, "standard");
  assert.equal(result.reason, "standard-fallback");
});

test("localhost and loopback remain explicit-only instead of using Standard fallback", () => {
  for (const url of ["http://localhost:3000", "http://127.0.0.1:8080", "http://[::1]:5173"]) {
    const result = evaluateRouting(url, baseConfig);
    assert.equal(result.action, "normal");
    assert.equal(result.reason, "local-development-explicit-only");
  }
});
