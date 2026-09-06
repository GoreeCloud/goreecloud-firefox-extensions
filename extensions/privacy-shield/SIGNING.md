# Mozilla Signing

GoreeCloud Privacy Shield uses Mozilla **unlisted/self-distribution** signing for accepted Firefox releases. This obtains Mozilla's extension signature without creating a public AMO listing.

## Credential boundary

Create Mozilla Add-ons API credentials from the AMO Developer Hub and store them only as encrypted GitHub repository secrets:

- `AMO_JWT_ISSUER` — AMO JWT issuer/API key.
- `AMO_JWT_SECRET` — AMO JWT secret.

Do not commit either value, put either value in workflow files, copy either value into changelogs or documentation, include either value in artifacts, or disclose either value in support/debug output.

## Target-acceptance evidence boundary

For Privacy Shield 0.2.0, manual target-environment acceptance is recorded locally with `scripts/target_acceptance.py`. The completed JSON record is deliberately privacy-minimized, but it can still contain the hostnames selected for representative compatibility review. It does **not** need to be uploaded to GitHub merely to start signing.

Before invoking the manual signing workflow, validate the completed record with `--require-release-ready`, then calculate its SHA-256 locally. The workflow requires three non-secret provenance inputs:

- `target_acceptance_source_revision` — the exact full source revision bound into the completed record;
- `target_acceptance_xpi_sha256` — the exact unsigned XPI digest already bound into the completed record;
- `target_acceptance_record_sha256` — the SHA-256 of the completed local JSON record itself.

The workflow fails closed unless the target-acceptance source revision exactly equals the workflow's checked-out `GITHUB_SHA`, and it fails again unless the deterministic XPI rebuilt for Mozilla signing exactly matches the reviewed XPI SHA-256. Only the evidence digest—not the local review record contents—is retained alongside signed release evidence. This binds target review → exact source → exact unsigned package → Mozilla submission without publishing private browsing evidence.

A record digest is provenance linkage, not proof that the human review was performed correctly. Governed release review still controls whether the target-acceptance record is legitimate and sufficient.

## Canonical release workflow

`.github/workflows/privacy-shield-mozilla-signing.yml` is the canonical signing and signed-artifact acceptance workflow. It is **manual-only** through `workflow_dispatch`; a normal source merge does not submit an add-on to Mozilla.

The workflow is version-dynamic. It resolves the Privacy Shield version from the exact checked-out `extensions/privacy-shield/manifest.json` instead of hard-coding a release number, while continuing to require the fixed Firefox extension ID `privacy-shield@goreecloud.com`.

For the exact revision deliberately selected for signing, the workflow:

1. validates and binds the target-acceptance source revision, reviewed unsigned-XPI digest, and local target-record digest without uploading the record contents;
2. re-runs repository and Privacy Shield source validation, including core behavior, site-profile, support-snapshot privacy, target-acceptance evidence-contract tests, logger-privacy, and unified-background regression tests;
3. syntax-checks the maintained Python acceptance programs used by the signed release path;
4. builds the deterministic unsigned Privacy Shield XPI with `shared/scripts/package_extension.py`;
5. extracts that exact packaged payload to a clean signing directory, so documentation, Python tests, scripts, and other files excluded by the canonical packager cannot silently enter the XPI;
6. verifies the fixed add-on ID and dynamically resolved manifest version, recomputes the candidate XPI SHA-256, and requires it to equal the digest already reviewed on the target environment;
7. requires the AMO credentials only from GitHub encrypted repository secrets and fails closed before Mozilla submission if either secret is unavailable;
8. submits the staged payload through pinned `web-ext` 10.5.0 on Node.js 22 with `--channel=unlisted`;
9. requires exactly one returned signed XPI, verifies archive integrity and Mozilla signature metadata, normalizes its filename, and records its SHA-256;
10. runs the returned **signed XPI** through the full real-Firefox runtime regression suite;
11. runs the returned signed XPI through the 0.2 popup quick-control acceptance path, including Standard/Strict/Compatible behavior, Reset, Refresh, Copy clean URL, and Copy support snapshot when those controls are present in the signed version;
12. runs the returned signed XPI through the controlled representative-archetype compatibility matrix, requiring Strict breakage behavior and recovery through Compatible and Reset while known tracker blocking remains active;
13. runs the returned signed XPI through explicit Manifest V3 event-page termination and wake-recovery acceptance;
14. installs the returned signed XPI persistently into a Firefox profile, executes critical protections, fully closes Firefox, launches a second Firefox process on the same profile without reinstalling the add-on, and repeats the critical checks;
15. retains the signed XPI, unsigned/signed package digests, and the privacy-safe target-acceptance provenance digest tuple as a GitHub Actions artifact only after every signing and signed-runtime gate succeeds.

The signing workflow does not transform a candidate into Stable by itself. Stable promotion remains a separate governed decision requiring all release-specific source, runtime, privacy, compatibility, manual-review, signing, restart, and evidence gates applicable to that version.

## Privacy Shield 0.2.0 candidate signing boundary

Version 0.2.0 remains a candidate until its remaining release gates are complete. The current signing workflow has been strengthened so that, when 0.2.0 is deliberately submitted, Mozilla's returned signed artifact—not merely the unsigned source candidate—is exercised through:

- exact source/XPI linkage to a completed target-acceptance record digest;
- the normal real-Firefox Privacy Shield runtime regression matrix;
- the installed popup quick-control acceptance matrix;
- controlled article, script-dependent application, and third-party-embed Strict → Compatible → Reset recovery archetypes;
- forced non-persistent MV3 event-page wake recovery; and
- persistent same-profile Firefox restart acceptance.

The deterministic compatibility fixtures are regression evidence only and do not replace target-environment representative-site review. The human release path and privacy-safe local evidence workflow are recorded in `RELEASE-ACCEPTANCE-0.2.0.md`.

The 0.2.0 release privacy review is recorded separately in `RELEASE-PRIVACY-REVIEW-0.2.0.md`. That review does not authorize automatic signing or Stable promotion. Manual target-environment interaction review, representative-site compatibility/recovery review, exact copied-support-snapshot inspection, deliberate Mozilla signing, signed-artifact acceptance, and governed release promotion remain independently evidence-bound.

## Accepted Stable 0.1.1 signing evidence

Privacy Shield 0.1.1 is the current Stable Firefox release for Mozilla unlisted/self-distribution within accepted Firefox 155.0.1 evidence.

- Signed packaged-payload source revision: `4468d15c49a7ea19dae6e8dda49e07572134a019`
- Final accepted hotfix PR head: `87a8a8b1105f3d8ad7658abc2937c3b80e91f94c`
- Accepted hotfix merge: `eac06d89bfb4110758ac334b8f6b5f5707188caf`
- Deterministic unsigned candidate SHA-256: `1ab3e70e0ff2398da6c9319437b1162ef92e8b36398d5a304da3052f0f00ff9d`
- Mozilla-signed XPI SHA-256: `f588ea7d638dce8b7b8a6eb341cc3748d6ec1595f069358cb92df72a8cccd848`
- Mozilla signing workflow run: `34036020332`
- Exact-head Firefox Repository validation: `34037548865` — success
- Exact-head Privacy Shield Firefox Runtime: `34037548881` — success on Firefox 155.0.1
- Post-merge Firefox Repository validation: `34037679174` — success
- Persistent signed installation: passed
- Full same-profile Firefox restart without reinstalling the extension: passed
- Pre- and post-restart tracking cleanup, tracker-domain blocking, and built-in cosmetic filtering: passed
- Real Firefox non-persistent event-page termination/wake recovery: passed on the final accepted 0.1.1 source/lifecycle head
- Extension ID: `privacy-shield@goreecloud.com`
- Distribution channel: Mozilla unlisted/self-distribution

The commits after the signed packaged-payload revision through the final hotfix acceptance head changed only CI/test/source-validation material and did not alter packaged extension payload files, preserving the signed-payload identity while strengthening acceptance evidence.

## Historical Stable 0.1.0 signing evidence

Privacy Shield 0.1.0 remains a historical accepted Stable release for Firefox 154.0.1 and is superseded by 0.1.1 as the current Stable release.

- Release-source revision: `5546097d6985935c14ac36518008e54039ef7e94`
- Deterministic unsigned candidate SHA-256: `cf794ca17f8443f1a05162d16305315714fb432a9245c98513bbf131490a4e97`
- Mozilla-signed XPI SHA-256: `da7aa76ed45fededd66735e357ce93fb0e613ca1c4563b5a2cee09ded3b7a037`
- Mozilla signing workflow run: `33077859664`; successful rerun job `98601740648`
- Accepted Firefox version: 154.0.1
- Persistent signed installation: passed
- Critical protections before and after full same-profile restart: passed
- Mozilla signature metadata: present and archive integrity verified

## Publication boundary

Mozilla unlisted signing is not public AMO publication. Moving Privacy Shield to a public AMO listing requires a separate explicit product, privacy, release, and publication decision. No signing credential value belongs in source, documentation, artifacts, changelogs, issue text, pull-request text, or chat.