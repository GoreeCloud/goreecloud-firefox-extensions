# Privacy Shield 0.2.0 Human Target Acceptance

## Status

**Release state:** Stable after governed promotion merge  
**Human target-environment acceptance:** Accepted  
**Mozilla signing:** Completed successfully  
**Signed-artifact acceptance:** Completed successfully  
**Stable promotion record:** `RELEASE-PROMOTION-0.2.0.md`

This record documents completion of the governed human target-environment review for GoreeCloud Privacy Shield 0.2.0 and the later signing/signed-artifact gates that consumed its exact provenance. Public AMO listing and non-Firefox production decisions remain separate.

## Exact reviewed provenance

- Frozen review source ref: `release/privacy-shield-0.2.0-target-review-eb5e2ff4`
- Exact reviewed source revision: `eb5e2ff4c439d290ac3f61dc73e9e90b49f3181b`
- Reviewed unsigned XPI SHA-256: `23287a50aa7615f422ac1cab8ed3d124f89df1c39fb0173db889c9d7fd2f46e7`
- Accepted local target-acceptance record SHA-256: `ece8f510df497dee9fdcc08775d115dbea57f43506527c4805125da7915631ea`
- Firefox target environment: Firefox 155.0.1 on Zorin OS laptop
- Installation mode reviewed: temporary unsigned candidate

The complete machine-readable target-acceptance JSON remains local. Only its provenance digest is retained in release records; raw browsing evidence, copied support-snapshot text, URLs, paths, queries, page content, credentials, cookies, identifiers, and free-form browsing notes are not committed.

## Accepted human checks

The target review confirmed all governed popup and support-diagnostic checks required by the 0.2.0 acceptance contract:

- popup opens reliably and reports the expected hostname;
- per-site On/Off state is understandable and site-scoped;
- Standard, Strict, and Compatible modes and their help text are understandable;
- Apply reloads the protected site and changes only the intended host mode;
- Reset site returns the host to Standard/global behavior;
- Blocked, Cleaned, Hidden, and Local counters are readable and scoped to This tab;
- Protection details displays friendly aggregate reasons without raw request URLs or page content;
- Refresh updates current-session details without reloading the protected page;
- Copy clean URL removes Privacy Shield-recognized tracking parameters while preserving unrelated parameters;
- Copy support snapshot succeeds and contains only the bounded diagnostic surface;
- keyboard navigation reaches every quick control and visible focus is present;
- controls remain usable at the target system/browser scaling;
- disabling protection on `app.test` does not disable protection on another ordinary site.

## Representative compatibility and recovery evidence

Public-site review covered article/news behavior and live per-tab protection activity. A controlled loopback acceptance fixture using `app.test`, `static.test`, and `frame.test` demonstrated deterministic compatibility impact and recovery in the target Firefox environment:

- Standard allowed the ordinary third-party application bundle and embedded frame while core telemetry protection remained active;
- Strict blocked the third-party script-dependent application behavior and embedded frame while Privacy Shield remained On;
- Compatible restored the ordinary application bundle and embedded frame while core telemetry protection remained active;
- Reset removed the host-specific profile and returned the site to Standard behavior.

The accepted record therefore contains the required article/news, script-application/dashboard, and third-party-embed archetype coverage, an observed Strict compatibility impact, successful Compatible recovery, and continued core protection after recovery.

## Support-snapshot privacy inspection

The copied support snapshot was directly inspected in the target environment. It contained only the expected bounded fields: extension/browser version, hostname, protection state, site mode, current-tab counters, and friendly aggregate reason labels/counts. It contained no raw request/final URLs, page paths, query strings, fragments, page content, DOM selectors, credentials, cookies, or logger identifiers.

## Signing provenance and completion

The manual `Privacy Shield Mozilla Signing` workflow consumed exactly:

- `target_acceptance_source_revision`: `eb5e2ff4c439d290ac3f61dc73e9e90b49f3181b`
- `target_acceptance_xpi_sha256`: `23287a50aa7615f422ac1cab8ed3d124f89df1c39fb0173db889c9d7fd2f46e7`
- `target_acceptance_record_sha256`: `ece8f510df497dee9fdcc08775d115dbea57f43506527c4805125da7915631ea`

Workflow run `34070682147` on the frozen reviewed source completed successfully. The returned Mozilla-signed XPI SHA-256 is `c4d01e131fe4a18fdd7f0c13c22fd849f2e99d271fef43ca6cbb390430819b62`.

The signed artifact independently passed signature/archive inspection, full real-Firefox runtime regression, popup quick-control acceptance, Strict/Compatible/Reset compatibility-recovery acceptance, forced Manifest V3 event-page wake recovery, persistent signed installation, full same-profile Firefox restart without reinstalling the extension, and critical post-restart protection checks.

## Release boundary

All Firefox-adapter 0.2.0 human, signing, signed-artifact, persistence, and restart gates are complete. The separate governed Stable promotion record is `RELEASE-PROMOTION-0.2.0.md`.

Public AMO listing, global platform Privacy Shield production acceptance, GoreeCloud Browser compiled-runtime acceptance, DNS/Network/application acceptance, and unrelated infrastructure production state remain separate decisions.
