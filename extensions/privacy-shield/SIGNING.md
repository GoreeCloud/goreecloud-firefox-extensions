# Mozilla Signing

GoreeCloud Privacy Shield is signed for Firefox as an **unlisted/self-distributed** extension. This path obtains Mozilla's signature without creating a public AMO listing.

## Credential boundary

Create Mozilla Add-ons API credentials from the AMO Developer Hub and store them only as GitHub repository secrets:

- `AMO_JWT_ISSUER` — AMO JWT issuer/API key.
- `AMO_JWT_SECRET` — AMO JWT secret.

Do not commit either value, put them in workflow files, copy them into changelogs, or include them in build artifacts.

## Canonical release workflow

`.github/workflows/privacy-shield-mozilla-signing.yml` performs the signing gate and is manual-only after the Stable 0.1.0 release.

1. Re-runs repository, Privacy Shield, core, logger-privacy, and background-activity validation on the exact revision being signed.
2. Builds the deterministic unsigned Privacy Shield XPI with `shared/scripts/package_extension.py`.
3. Extracts that exact packaged payload to a clean signing directory. Documentation, tests, and other files excluded by the canonical packager therefore cannot silently enter the signed XPI.
4. Verifies the extension ID is `privacy-shield@goreecloud.com` and version is `0.1.0`.
5. Uses pinned `web-ext` 10.5.0 with Node.js 22 and `--channel=unlisted` to submit the staged payload to Mozilla.
6. Requires exactly one returned signed XPI, checks archive integrity and Mozilla signature metadata, and records unsigned/signed SHA-256 digests.
7. Installs the signed XPI non-temporarily into an in-place Firefox profile, runs critical protection checks, quits Firefox, starts a new Firefox process against the same profile without reinstalling the extension, and reruns the critical checks.
8. Retains the signed XPI and digest evidence as a GitHub Actions artifact when all gates pass.

## Accepted Stable 0.1.0 signing evidence

Mozilla signing succeeded on workflow run `33077859664`; the successful rerun job was `98601740648`.

- Release-source revision: `5546097d6985935c14ac36518008e54039ef7e94`
- Deterministic unsigned candidate SHA-256: `cf794ca17f8443f1a05162d16305315714fb432a9245c98513bbf131490a4e97`
- Mozilla-signed XPI SHA-256: `da7aa76ed45fededd66735e357ce93fb0e613ca1c4563b5a2cee09ded3b7a037`
- Firefox acceptance version: `154.0.1`
- Persistent signed installation: passed
- Critical checks before restart: passed
- Full Firefox restart using the same profile without reinstalling the extension: passed
- Critical checks after restart: passed
- Mozilla signature metadata: present and archive integrity verified

## Release boundary

Privacy Shield 0.1.0 is Stable for unlisted/self-distribution because the exact accepted candidate was Mozilla-signed and the returned signed XPI passed persistent installation plus full Firefox restart acceptance.

Public AMO listing is not part of this release procedure. Moving from unlisted self-distribution to a public listing requires a separate explicit product and publication decision.
