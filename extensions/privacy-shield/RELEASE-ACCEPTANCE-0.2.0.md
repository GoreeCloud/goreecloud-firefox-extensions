# Privacy Shield 0.2.0 Release Acceptance

## Status

**Release state:** Stable after governed promotion merge  
**Supersedes:** 0.1.1  
**Human target-environment acceptance:** Accepted  
**Mozilla signing:** Accepted  
**Signed-artifact acceptance:** Accepted  
**Distribution scope:** Mozilla unlisted/self-distribution

This document records the completed release-gate outcome for GoreeCloud Privacy Shield 0.2.0. Detailed human target evidence is summarized in `RELEASE-TARGET-ACCEPTANCE-0.2.0.md`; final Stable promotion provenance is in `RELEASE-PROMOTION-0.2.0.md`.

## Exact release provenance

- Exact reviewed/signed source revision: `eb5e2ff4c439d290ac3f61dc73e9e90b49f3181b`
- Frozen review ref: `release/privacy-shield-0.2.0-target-review-eb5e2ff4`
- Reviewed unsigned XPI SHA-256: `23287a50aa7615f422ac1cab8ed3d124f89df1c39fb0173db889c9d7fd2f46e7`
- Accepted target-acceptance record SHA-256: `ece8f510df497dee9fdcc08775d115dbea57f43506527c4805125da7915631ea`
- Mozilla-signed XPI SHA-256: `c4d01e131fe4a18fdd7f0c13c22fd849f2e99d271fef43ca6cbb390430819b62`
- Mozilla signing workflow run: `34070682147`
- Signing job: `101587331594`
- Signed evidence artifact ID: `10000415077`
- Signed evidence artifact archive SHA-256: `7471447807ec3469401652d9a3b28083c3cf461ab01bc03cc0a5c3d95cb910df`
- Firefox add-on ID: `privacy-shield@goreecloud.com`

## Completed source and package gates

- [x] Repository and extension source validation passed.
- [x] Site-profile, support-snapshot, core, logger-privacy, and unified-background regression tests passed.
- [x] Maintained JavaScript and Python release-test syntax checks passed.
- [x] Deterministic unsigned packaging passed.
- [x] Exact candidate manifest version and Firefox add-on ID were verified.
- [x] Exact reviewed unsigned XPI digest was bound to the signing workflow.
- [x] Source-level release privacy review remained valid for the exact packaged payload.

## Completed human target-environment gates

The accepted human review used Firefox 155.0.1 on a Zorin OS laptop and confirmed:

- [x] Popup opens reliably and reports the expected hostname.
- [x] Site On/Off state is understandable and host-scoped.
- [x] Standard, Strict, and Compatible profile labels/help are understandable.
- [x] Apply reloads the intended site and Reset returns it to Standard/global behavior.
- [x] This-tab Blocked, Cleaned, Hidden, and Local counters are readable.
- [x] Protection details remains privacy-safe and uses friendly aggregate reasons.
- [x] Refresh updates details without reloading the protected page.
- [x] Copy clean URL sanitizes recognized tracking parameters while preserving unrelated parameters.
- [x] Copy support snapshot succeeds and remains within the bounded diagnostic allowlist.
- [x] Keyboard navigation reaches all quick controls and visible focus is present.
- [x] Controls remain usable at the target scaling/zoom settings.
- [x] Article/news compatibility was reviewed.
- [x] Script-application/dashboard and third-party-embed archetypes were reviewed with the controlled `app.test` fixture.
- [x] A real Strict compatibility impact was observed.
- [x] Compatible restored ordinary script/frame functionality without globally disabling Privacy Shield.
- [x] Core telemetry protection remained active after Compatible recovery.
- [x] Reset returned the host to Standard behavior.
- [x] Protection Off on the controlled host did not disable another ordinary site's protection.
- [x] Copied support-snapshot inspection confirmed raw path/query/request URLs, page content, selectors, credentials, cookies, and logger identifiers were absent.

The full privacy-minimized machine-readable target record remains local; only its SHA-256 provenance is committed.

## Completed Mozilla signing and signed-artifact gates

`Privacy Shield Mozilla Signing` run `34070682147` completed successfully on the exact reviewed source revision. Every release-critical step completed with `success`:

- [x] Target-acceptance source/XPI/record provenance binding.
- [x] Exact source candidate validation.
- [x] Deterministic unsigned candidate build.
- [x] Reviewed unsigned XPI digest match.
- [x] Mozilla unlisted signing submission.
- [x] Mozilla-returned signed XPI archive/signature inspection.
- [x] Signed XPI full real-Firefox runtime regression.
- [x] Signed XPI popup quick-control acceptance.
- [x] Signed XPI Strict/Compatible/Reset compatibility-recovery acceptance.
- [x] Signed XPI forced Manifest V3 event-page wake recovery.
- [x] Persistent signed-XPI installation.
- [x] Full same-profile Firefox restart without reinstalling the extension.
- [x] Critical protection checks after restart.
- [x] Signed release evidence retained as an Actions artifact.

The GitHub Actions Node.js deprecation annotation was non-blocking tooling/platform guidance; it did not fail, skip, or weaken any Privacy Shield release gate.

## Stable promotion boundary

The Firefox-adapter release gates are complete. Stable state becomes canonical when the separate governed promotion change containing `RELEASE-PROMOTION-0.2.0.md`, repository lifecycle metadata reconciliation, and this acceptance record is validated and merged.

This Stable decision does not authorize a public AMO listing, platform-wide Privacy Shield production acceptance, GoreeCloud Browser compiled-runtime acceptance, DNS/Network/application acceptance, or unrelated infrastructure production state.
