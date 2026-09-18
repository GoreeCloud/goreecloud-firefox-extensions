# GoreeCloud Advanced Tab Manager — Stable Security Review 0.1.11

## Status

**Release:** Stable 0.1.11  
**Firefox add-on ID:** `advanced-tab-manager@goreecloud.com`  
**Security exceptions:** None  
**Stable promotion:** Accepted after exact signed-runtime gates passed

This review applies the GoreeCloud Stable Release Security Blockers to the exact Advanced Tab Manager release candidate.

## Permission and execution boundary

The candidate must retain exactly:

- `alarms`
- `sessions`
- `storage`
- `tabGroups`
- `tabs`

The candidate must retain:

- no host permissions;
- no content scripts;
- no `unlimitedStorage`;
- private browsing disabled;
- no runtime remote code;
- no dynamic code evaluation;
- no automatic permission request path;
- no credential, cookie, token, password, private-key, or reusable-secret storage.

## Secrets and history

The release qualification workflow checks out full Git history and scans the complete Advanced Tab Manager patch history for recognized private-key/API-token patterns. Current runtime source and the deterministic candidate XPI are scanned separately.

A shallow checkout, unavailable history, detected credential pattern, or unverified package causes the gate to fail closed.

## Package and supply-chain boundary

Advanced Tab Manager has no application runtime package-manager dependency and no remote runtime module/style/script provider.

The exact deterministic XPI is inspected for:

- archive integrity;
- exact version and add-on identity;
- exact permission boundary;
- absence of maintenance-only tests/scripts/workflow/docs;
- absence of runtime remote script/style/import paths;
- absence of `eval`, `new Function`, and automatic permission requests;
- absence of recognized secret material.

Mozilla signature verification remains a separate required gate after signing.

## Stored data and destructive operations

Implemented local state is schema-validated and versioned. Relevant destructive or source-replacing operations retain the existing reviewed boundaries:

- stash and snooze persist/verify recovery before source-tab closure;
- import validates identity/integrity/schema, previews, confirms, rejects stale revisions, verifies readback, and attempts rollback;
- session snapshot restore is additive and attempts rollback of newly created windows on failure;
- snapshot deletion and retention reduction require explicit Manager confirmation;
- duplicate cleanup is reviewed and fresh-state checked;
- rule automation defaults disabled and explicit rule actions are bounded.

## Accepted signed security boundary

Governed signing/restart run `35350654198` re-ran this Stable Security Blocker qualification on authoritative source revision `34c27805c3b56f3ba858794c785f6b68d1f7b8f3`, verified Mozilla-signed payload parity/integrity, and completed persistent signed-install/full-Firefox-restart acceptance. No security exception is recorded for Stable 0.1.11.
