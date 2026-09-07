# Privacy Shield 0.2.0 Stable Promotion Record

## Decision

**Promotion decision:** Accepted, effective when this governed promotion change is validated and merged to canonical `main`.  
**Promoted Firefox release:** 0.2.0  
**Superseded current Stable release:** 0.1.1  
**Distribution scope:** Mozilla unlisted/self-distribution  
**Public AMO listing:** Not authorized by this promotion

This record closes the Firefox-adapter Stable release gates for GoreeCloud Privacy Shield 0.2.0. It does not claim production acceptance for GoreeCloud Browser, DNS, Network, platform-wide Privacy Shield, public AMO distribution, or any unrelated runtime.

## Exact reviewed and signed provenance

- Frozen reviewed source ref: `release/privacy-shield-0.2.0-target-review-eb5e2ff4`
- Exact reviewed/signed source revision: `eb5e2ff4c439d290ac3f61dc73e9e90b49f3181b`
- Accepted human target-acceptance record SHA-256: `ece8f510df497dee9fdcc08775d115dbea57f43506527c4805125da7915631ea`
- Reviewed deterministic unsigned XPI SHA-256: `23287a50aa7615f422ac1cab8ed3d124f89df1c39fb0173db889c9d7fd2f46e7`
- Mozilla-signed XPI SHA-256: `c4d01e131fe4a18fdd7f0c13c22fd849f2e99d271fef43ca6cbb390430819b62`
- Mozilla signing workflow: `Privacy Shield Mozilla Signing` run `34070682147`
- Signing job: `sign-and-restart` job `101587331594`
- Retained signed evidence artifact: `goreecloud-privacy-shield-0.2.0-mozilla-signed`, artifact ID `10000415077`
- Artifact archive SHA-256: `7471447807ec3469401652d9a3b28083c3cf461ab01bc03cc0a5c3d95cb910df`
- Firefox target environment for human review: Firefox 155.0.1 on Zorin OS laptop
- Extension ID: `privacy-shield@goreecloud.com`

The retained artifact independently confirms the reviewed unsigned digest, target-acceptance provenance inputs, and signed XPI digest. The signed XPI contains Mozilla signature metadata under `META-INF/`, manifest version `0.2.0`, and the expected Firefox add-on ID.

## Human target-environment acceptance

Human target acceptance completed before signing and was recorded in `RELEASE-TARGET-ACCEPTANCE-0.2.0.md`. The accepted review covered the complete popup quick-control surface, keyboard reachability and visible focus, site-scoped enable/disable behavior, Refresh without page reload, Copy clean URL, Copy support snapshot privacy inspection, article/news compatibility, and controlled Strict → Compatible → Reset recovery for script-dependent and third-party-embed archetypes while core protection remained active.

The local privacy-minimized acceptance JSON is intentionally not committed. Only its SHA-256 provenance is retained here.

## Mozilla signing and signed-artifact acceptance

Workflow run `34070682147` completed successfully on the exact reviewed source revision. Its release-critical steps all completed with `success`, including:

1. exact target-acceptance provenance binding to the workflow source;
2. source validation and deterministic unsigned package reconstruction;
3. exact unsigned XPI digest comparison to the human-reviewed candidate;
4. Mozilla unlisted signing submission;
5. signed XPI archive/signature inspection;
6. full real-Firefox runtime regression on the Mozilla-returned signed XPI;
7. popup quick-control acceptance on the signed XPI;
8. Strict/Compatible/Reset compatibility-recovery acceptance on the signed XPI;
9. forced Manifest V3 event-page termination/wake recovery on the signed XPI;
10. persistent signed-XPI installation;
11. full same-profile Firefox restart without reinstalling the extension;
12. critical protection checks after restart;
13. retention of the signed release evidence artifact.

The GitHub Actions Node.js deprecation annotation is a platform/tooling warning and did not fail or bypass any Privacy Shield release gate.

## Stable release boundary

Upon merge of this promotion change, repository lifecycle metadata identifies Privacy Shield 0.2.0 as the accepted Stable Firefox release. Stable acceptance is limited to the Firefox adapter and the evidence above.

This promotion does not authorize:

- a public AMO listing;
- platform-wide Privacy Shield production acceptance;
- GoreeCloud Browser compiled-runtime acceptance;
- GoreeCloud DNS/Network application acceptance;
- unrelated operating-system or device acceptance.

Those remain separate governed decisions.
