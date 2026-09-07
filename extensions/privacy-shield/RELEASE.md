# Release Gate

## Stable 0.2.0 — popup quick controls, support diagnostics, and recovery controls

Version 0.2.0 is the current accepted **Stable** GoreeCloud Privacy Shield Firefox release for Mozilla unlisted/self-distribution, effective with the governed Stable-promotion merge that records this state.

Stable 0.2.0 supersedes Stable 0.1.1. Public AMO listing and non-Firefox platform acceptance remain separate governed decisions.

### User-facing additions

Stable 0.2.0 adds:

1. popup **Copy clean URL** using the canonical local URL sanitizer;
2. per-site **Standard**, **Strict**, and **Compatible** protection modes;
3. **Reset site** for removing the complete host-specific override;
4. **Protection details** with current-tab friendly aggregate reasons only;
5. **Refresh** without page reload or a new history store;
6. local On/Off plus active-site-mode status;
7. **Copy support snapshot** with a positive allowlist of bounded diagnostic fields;
8. dedicated site-profile, support-snapshot, target-acceptance, popup, compatibility/recovery, MV3 wake-recovery, and signed-restart regression coverage.

No new extension permission, GoreeCloud telemetry backend, persistent browsing-history store, or remote support-upload path is introduced by these features.

### Exact Stable 0.2.0 provenance

- Frozen reviewed source ref: `release/privacy-shield-0.2.0-target-review-eb5e2ff4`
- Exact reviewed and signed source revision: `eb5e2ff4c439d290ac3f61dc73e9e90b49f3181b`
- Reviewed deterministic unsigned XPI SHA-256: `23287a50aa7615f422ac1cab8ed3d124f89df1c39fb0173db889c9d7fd2f46e7`
- Accepted local target-acceptance record SHA-256: `ece8f510df497dee9fdcc08775d115dbea57f43506527c4805125da7915631ea`
- Mozilla-signed XPI SHA-256: `c4d01e131fe4a18fdd7f0c13c22fd849f2e99d271fef43ca6cbb390430819b62`
- Mozilla signing workflow: `Privacy Shield Mozilla Signing` run `34070682147`
- Signing job: `sign-and-restart` job `101587331594`
- Retained signed evidence artifact ID: `10000415077`
- Artifact archive SHA-256: `7471447807ec3469401652d9a3b28083c3cf461ab01bc03cc0a5c3d95cb910df`
- Extension ID: `privacy-shield@goreecloud.com`
- Distribution channel: Mozilla unlisted/self-distribution

### Accepted 0.2.0 release gates

The release completed all required source, human, signing, signed-artifact, persistence, and restart gates:

- repository and extension source validation;
- deterministic packaging and exact unsigned digest verification;
- source-level privacy review;
- automated Firefox runtime and popup acceptance;
- forced Manifest V3 event-page termination/wake recovery;
- controlled Standard → Strict → Compatible → Reset compatibility/recovery testing;
- human target-environment popup and keyboard review;
- human site-scoped enable/disable isolation review;
- human Copy clean URL and copied support-snapshot privacy inspection;
- human article/news compatibility review;
- human controlled Strict compatibility impact and Compatible recovery while core protection remained active;
- Mozilla unlisted signing of the exact reviewed payload;
- Mozilla signature/archive inspection of the returned XPI;
- full real-Firefox runtime regression on the signed XPI;
- signed-XPI popup quick-control acceptance;
- signed-XPI Strict/Compatible/Reset recovery acceptance;
- signed-XPI forced MV3 wake recovery;
- persistent signed-XPI installation;
- full same-profile Firefox restart without reinstalling the extension;
- critical protection checks after restart.

The complete promotion evidence is recorded in `RELEASE-PROMOTION-0.2.0.md`. Human target-environment evidence is summarized in `RELEASE-TARGET-ACCEPTANCE-0.2.0.md`. The local machine-readable human acceptance JSON remains outside the repository; only its SHA-256 provenance is retained.

### Privacy and authority boundary

Stable 0.2.0 remains local-first. Site modes persist only deliberate local settings. Protection details use already-redacted in-memory logger metadata. Support snapshots are created only after explicit user action, copied locally, and contain only extension/browser version, hostname, enabled state, site mode, current-tab counters, and friendly aggregate reason counts. Raw request/final URLs, page paths, query strings, page content, selectors, credentials, cookies, and logger identifiers do not belong in the support snapshot.

The Activity Logger remains bounded memory-only state. Current-tab counters use Firefox `browser.storage.session` so they can survive non-persistent Manifest V3 event-page recreation while remaining browser-session scoped.

Stable Firefox acceptance does not authorize a public AMO listing, platform-wide Privacy Shield production acceptance, GoreeCloud Browser compiled-runtime acceptance, DNS/Network acceptance, or unrelated application/runtime production state.

## Stable 0.1.1 — Firefox 155 compatibility hotfix

Version 0.1.1 remains a historically accepted Stable release and is superseded by 0.2.0.

The release corrected a Manifest V3 event-page lifecycle defect that could reset current-tab counters after background recreation and could allow an early request to be evaluated before asynchronously loaded settings/rules were ready.

### Stable 0.1.1 evidence

- Signed packaged-payload source revision: `4468d15c49a7ea19dae6e8dda49e07572134a019`
- Accepted exact PR head for final source/lifecycle validation: `87a8a8b1105f3d8ad7658abc2937c3b80e91f94c`
- Accepted hotfix merge on canonical main: `eac06d89bfb4110758ac334b8f6b5f5707188caf`
- Deterministic unsigned candidate SHA-256: `1ab3e70e0ff2398da6c9319437b1162ef92e8b36398d5a304da3052f0f00ff9d`
- Mozilla-signed XPI SHA-256: `f588ea7d638dce8b7b8a6eb341cc3748d6ec1595f069358cb92df72a8cccd848`
- Mozilla signing workflow run: `34036020332`
- Exact-head Firefox Repository validation: `34037548865`
- Exact-head Privacy Shield Firefox Runtime: `34037548881`
- Post-merge Firefox Repository validation: `34037679174`
- Persistent signed installation and full same-profile Firefox 155.0.1 restart: passed
- Real Firefox non-persistent event-page termination/wake recovery: passed
- Distribution channel: Mozilla unlisted/self-distribution

## Stable 0.1.0 — initial accepted Firefox release

Version 0.1.0 remains historically accepted and was superseded by 0.1.1 and then 0.2.0.

### Stable 0.1.0 evidence

- Release-source revision: `5546097d6985935c14ac36518008e54039ef7e94`
- Deterministic unsigned candidate SHA-256: `cf794ca17f8443f1a05162d16305315714fb432a9245c98513bbf131490a4e97`
- Mozilla-signed XPI SHA-256: `da7aa76ed45fededd66735e357ce93fb0e613ca1c4563b5a2cee09ded3b7a037`
- Mozilla signing workflow: `Privacy Shield Mozilla Signing` run `33077859664`, successful rerun job `98601740648`
- Accepted Firefox version: `154.0.1`
- Extension ID: `privacy-shield@goreecloud.com`
- Distribution channel: Mozilla unlisted/self-distribution

Public AMO listing remains a separate explicit publication decision for all of these unlisted releases.
