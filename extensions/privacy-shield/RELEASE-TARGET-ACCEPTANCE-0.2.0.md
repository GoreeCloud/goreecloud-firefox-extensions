# Privacy Shield 0.2.0 Human Target Acceptance

## Status

**Release state:** Candidate  
**Current Stable Firefox release:** 0.1.1  
**Human target-environment acceptance:** Accepted  
**Next release gate:** Deliberate Mozilla unlisted signing of the exact reviewed payload

This record documents completion of the governed human target-environment review for GoreeCloud Privacy Shield 0.2.0. It does not by itself promote 0.2.0 to Stable, replace signed-artifact acceptance, or authorize a public AMO listing.

## Exact reviewed provenance

- Frozen review source ref: `release/privacy-shield-0.2.0-target-review-eb5e2ff4`
- Exact reviewed source revision: `eb5e2ff4c439d290ac3f61dc73e9e90b49f3181b`
- Reviewed unsigned XPI SHA-256: `23287a50aa7615f422ac1cab8ed3d124f89df1c39fb0173db889c9d7fd2f46e7`
- Accepted local target-acceptance record SHA-256: `ece8f510df497dee9fdcc08775d115dbea57f43506527c4805125da7915631ea`
- Firefox target environment: Firefox 155.0.1 on Zorin OS laptop
- Installation mode reviewed: temporary unsigned candidate

The complete machine-readable target-acceptance JSON remains local. The release path retains only the provenance digest required by the signing workflow; raw browsing evidence, copied support-snapshot text, URLs, paths, queries, page content, credentials, cookies, identifiers, and free-form browsing notes are not committed here.

## Accepted human checks

The target review confirmed all governed popup and support-diagnostic checks required by `RELEASE-ACCEPTANCE-0.2.0.md` and `scripts/target_acceptance.py`:

- popup opens reliably and reports the expected hostname;
- per-site On/Off state is understandable and site-scoped;
- Standard, Strict, and Compatible modes and their help text are understandable;
- Apply reloads the protected site and changes only the intended host mode;
- Reset site returns the host to Standard/global behavior;
- Blocked, Cleaned, Hidden, and Local counters are readable and explicitly scoped to This tab;
- Protection details displays only friendly aggregate reasons without raw request URLs or page content;
- Refresh updates current-session protection details without reloading the protected page;
- Copy clean URL removes Privacy Shield-recognized tracking parameters while preserving unrelated query parameters;
- Copy support snapshot succeeds and contains only the bounded diagnostic surface;
- keyboard navigation reaches the quick controls and visible focus is present;
- controls remain usable at the target system/browser scaling;
- site-scoped protection Off on `app.test` does not disable protection on another ordinary site.

## Representative compatibility and recovery evidence

Public-site review included article/news behavior and live per-tab protection activity. A controlled loopback acceptance fixture using `app.test`, `static.test`, and `frame.test` demonstrated deterministic compatibility impact and recovery in the target Firefox environment:

- Standard allowed the ordinary third-party application bundle and embedded frame while core telemetry protection remained active;
- Strict blocked the third-party script-dependent application behavior and embedded frame while Privacy Shield remained On;
- Compatible restored the ordinary application bundle and embedded frame while core telemetry protection remained active;
- Reset removed the host-specific profile and returned the site to Standard behavior.

The accepted record therefore contains the required article/news, script-application/dashboard, and third-party-embed archetype coverage, an observed Strict compatibility impact, successful Compatible recovery, and continued core protection after recovery.

## Support-snapshot privacy inspection

The copied support snapshot was directly inspected in the target environment. It contained only the expected bounded fields: extension/browser version, hostname, protection state, site mode, current-tab counters, and friendly aggregate reason labels/counts. It contained no raw request/final URLs, page paths, query strings, fragments, page content, DOM selectors, credentials, cookies, or logger identifiers.

## Signing provenance inputs

The manual-only `Privacy Shield Mozilla Signing` workflow must be run from the frozen review source ref and supplied exactly these values:

- `target_acceptance_source_revision`: `eb5e2ff4c439d290ac3f61dc73e9e90b49f3181b`
- `target_acceptance_xpi_sha256`: `23287a50aa7615f422ac1cab8ed3d124f89df1c39fb0173db889c9d7fd2f46e7`
- `target_acceptance_record_sha256`: `ece8f510df497dee9fdcc08775d115dbea57f43506527c4805125da7915631ea`

The signing workflow must fail closed if the workflow source revision does not equal the reviewed source or if its deterministic rebuilt unsigned XPI does not equal the reviewed XPI digest.

## Remaining release gates

Human target-environment acceptance is complete. The remaining 0.2.0 gates are:

1. deliberate Mozilla unlisted/self-distribution signing of the exact reviewed payload;
2. Mozilla-returned signed-XPI signature/archive verification;
3. full real-Firefox runtime regression on the signed artifact;
4. signed-artifact popup quick-control acceptance;
5. signed-artifact Strict/Compatible/Reset compatibility-recovery acceptance;
6. forced Manifest V3 event-page wake recovery on the signed artifact;
7. persistent signed installation and full same-profile Firefox restart without reinstalling the extension;
8. governed Stable-promotion release record and repository metadata reconciliation.

Until every remaining gate passes and the Stable-promotion change is reviewed, validated, and merged, **Privacy Shield 0.1.1 remains Stable and 0.2.0 remains Candidate**.

Public AMO listing, global platform Privacy Shield production acceptance, GoreeCloud Browser compiled-runtime acceptance, DNS/Network/application acceptance, and unrelated infrastructure production state remain separate decisions.