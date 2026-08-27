# Mozilla Signing

GoreeCloud Privacy Shield is signed for Firefox as an **unlisted/self-distributed** extension. This path obtains Mozilla's signature without creating a public AMO listing.

## Credential boundary

Create Mozilla Add-ons API credentials from the AMO Developer Hub and store them only as GitHub repository secrets:

- `AMO_JWT_ISSUER` — AMO JWT issuer/API key.
- `AMO_JWT_SECRET` — AMO JWT secret.

Do not commit either value, put them in workflow files, copy them into changelogs, or include them in build artifacts.

## Canonical release workflow

`.github/workflows/privacy-shield-mozilla-signing.yml` performs the signing gate.

1. Re-runs repository, Privacy Shield, core, logger-privacy, and background-activity validation on the exact revision being signed.
2. Builds the deterministic unsigned Privacy Shield XPI with `shared/scripts/package_extension.py`.
3. Extracts that exact packaged payload to a clean signing directory. Documentation, tests, and other files excluded by the canonical packager therefore cannot silently enter the signed XPI.
4. Verifies the extension ID is `privacy-shield@goreecloud.com` and version is `0.1.0`.
5. Uses pinned `web-ext` 10.5.0 with Node.js 22 and `--channel=unlisted` to submit the staged payload to Mozilla.
6. Requires exactly one returned signed XPI, checks archive integrity and Mozilla signature metadata, and records unsigned/signed SHA-256 digests.
7. Installs the signed XPI non-temporarily into an in-place Firefox profile, runs critical protection checks, quits Firefox, starts a new Firefox process against the same profile without reinstalling the extension, and reruns the critical checks.
8. Retains the signed XPI and digest evidence as a GitHub Actions artifact when all gates pass.

## Release boundary

A successful temporary-extension smoke test is not Mozilla signing. A successful Mozilla signing response is not enough by itself either. Privacy Shield 0.1.0 clears the signed-XPI gate only when the returned Mozilla-signed XPI also passes persistent installation and full Firefox restart acceptance.

Public AMO listing is not part of this release procedure. Moving from unlisted self-distribution to a public listing requires a separate explicit product and publication decision.
