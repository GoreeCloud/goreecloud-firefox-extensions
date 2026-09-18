# GoreeCloud Advanced Tab Manager — Release Acceptance 0.1.10

## Status

**Version:** 0.1.10  
**Lifecycle:** Source candidate / In Development  
**Accepted Stable version:** None  
**Packaged runtime delta in this release-acceptance work:** None

This record tracks release qualification for the exact GoreeCloud Advanced Tab Manager 0.1.10 runtime payload. It must distinguish automated unsigned runtime evidence, current-Stable Glaze UI consumer acceptance, security/privacy qualification, Mozilla signing, persistent signed installation, full Firefox restart acceptance, and final Stable promotion.

## Accepted source foundation

Authoritative 0.1.10 source was promoted to `GoreeCloud/goreecloud-firefox-extensions` `main` by PR #92 as merge commit `e32a6c510a8ff4f6db6d81fc782794c6f527c3e9`.

The accepted source-candidate foundation includes:

- exact Firefox identity `advanced-tab-manager@goreecloud.com`;
- Firefox 139+ baseline;
- permissions limited to `alarms`, `sessions`, `storage`, `tabGroups`, and `tabs`;
- no host permissions;
- no content scripts;
- private browsing disabled;
- deterministic packaging;
- source-preserving trees, Tab Sets, stash, snooze, rules, manager, portability, and retained local session snapshots;
- deterministic 100/500/1,000-tab core-scale qualification.

Source and CI acceptance do not establish a Stable release.

## Real-Firefox unsigned runtime gate

The permanent workflow `.github/workflows/advanced-tab-manager-firefox-runtime.yml` packages the exact candidate and exercises the installed extension in a clean headless Firefox profile against controlled localhost fixtures.

The gate must verify, through the installed extension and real Firefox APIs:

- Manager rendering and exact source identity;
- permission-posture diagnostics;
- live-state reconstruction;
- durable tree relationship mutation/reconstruction;
- Tab Set capture;
- stash persist-then-close and restore;
- snooze persist/schedule/close and restore;
- reviewed exact-URL duplicate cleanup;
- fail-closed disabled-by-default rule engine state;
- local session snapshot capture and additive restore;
- privacy-minimized snapshot Manager projection;
- local backup export and integrity-verified import preview.

The retained runtime evidence is intentionally privacy-minimized. It records bounded environment/version/check results and does not record browsing URLs, titles, rule contents, profile paths, cookies, credentials, page content, or request history.

This workflow uses a **temporary unsigned installation**. Mozilla-signed persistent-install and full-process restart acceptance remain separate release gates.

## Current-Stable Glaze UI consumer gate

The current shared Stable authority is GLAZE UI V1.5 / machine version 1.5.1. Advanced Tab Manager must establish repository-local exact-revision consumer acceptance for its Firefox sidebar, popup, command palette, rules surfaces, and Manager before Stable promotion.

Source-level Reduced Transparency and Forced Colors fallbacks do not by themselves establish product-level Glaze acceptance.

## Security and privacy gate

Stable promotion remains blocked until the exact release candidate satisfies the applicable GoreeCloud Stable Release Security Blockers and application-specific security/privacy review, including dependency/supply-chain, secrets, permissions, storage/import, destructive action, local data, runtime failure, and signed-artifact integrity boundaries.

## Mozilla signing and signed-runtime gate

Before Stable promotion, the exact accepted deterministic unsigned 0.1.10 XPI must be bound to a SHA-256 digest and submitted through the governed Mozilla unlisted-signing path.

The returned signed XPI must then prove:

- expected add-on ID and version;
- archive integrity and Mozilla signature metadata;
- governed payload parity against the accepted unsigned candidate;
- persistent signed installation;
- full Firefox process restart on the same profile without reinstalling;
- extension remains installed and enabled after restart;
- release-critical runtime acceptance remains valid after restart;
- retained source revision, unsigned digest, signed digest, workflow identity, and evidence artifact.

## Stable promotion boundary

Stable promotion must occur only after all applicable gates pass for the exact release candidate. The promotion should be a separate lifecycle/documentation change with no packaged runtime delta.

Only then may the canonical extension inventory set:

- `source_state: stable`
- `accepted_stable_version: 0.1.10`

Until then, 0.1.10 remains a source candidate and no Stable claim is permitted.
