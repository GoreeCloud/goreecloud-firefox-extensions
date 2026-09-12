import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeAssignmentHostname,
  sanitizeWebspaceName,
  upsertDomainAssignment,
  validateWebspaceInput
} from "../src/management.js";

test("normalizes Webspace names", () => {
  assert.equal(sanitizeWebspaceName("  Work   Accounts  "), "Work Accounts");
  assert.throws(() => sanitizeWebspaceName("   "), /required/);
});

test("validates appearance using supported fallbacks", () => {
  assert.deepEqual(
    validateWebspaceInput({ name: "Research", color: "not-a-color", icon: "not-an-icon" }),
    { name: "Research", color: "blue", icon: "circle" }
  );
});

test("normalizes assignment hostnames", () => {
  assert.equal(normalizeAssignmentHostname("https://Mail.Google.com/inbox"), "mail.google.com");
  assert.equal(normalizeAssignmentHostname("docs.example.com/path"), "docs.example.com");
  assert.throws(() => normalizeAssignmentHostname("ftp://example.com"), /HTTP/);
});

test("upserts a domain assignment instead of creating duplicate conflicting records", () => {
  const initial = [{ id: "existing", kind: "domain", value: "youtube.com", webspaceId: "google", enabled: true }];
  const next = upsertDomainAssignment(initial, "youtube.com", "entertainment", () => "unused");
  assert.equal(next.length, 1);
  assert.equal(next[0].id, "existing");
  assert.equal(next[0].webspaceId, "entertainment");
});
