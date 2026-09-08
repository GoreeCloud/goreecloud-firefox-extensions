# Mozilla Signing and Firefox Release Boundary

## Purpose

This document defines the shared release boundary for GoreeCloud Firefox extensions maintained in this repository.

Source validation and packaging are not equivalent to a Mozilla-signed release. Each extension retains its own version, add-on ID, release record, acceptance evidence, and Stable promotion decision.

## Shared release sequence

1. Validate the exact candidate commit with repository-wide and extension-specific checks.
2. Package the extension from its canonical directory using `shared/scripts/package_extension.py` or an extension-specific equivalent when required.
3. Inspect the resulting archive and confirm that `manifest.json` is at the archive root and that maintenance-only files are excluded unintentionally.
4. Record the exact source commit and candidate artifact digest.
5. Submit the candidate through the approved Mozilla Add-ons signing path for that extension.
6. Never commit Mozilla API credentials, signing secrets, private keys, cookies, session values, or reusable authentication material.
7. Download and preserve the Mozilla-signed XPI through the approved release-record process.
8. Verify signed package identity, version, add-on ID, permissions, payload inventory, and expected runtime files.
9. Install the signed XPI through normal Firefox extension installation.
10. Fully restart Firefox and confirm that the extension remains installed and enabled.
11. Repeat the extension's release-critical runtime acceptance after restart.
12. Record Stable promotion only for the exact accepted extension version.
13. Where lifecycle evidence is machine-generated, repeat the governed evidence path after promotion so final provenance reflects the canonical Stable state without changing signed runtime bytes.

## Credentials

Signing credentials must be supplied at execution time through an approved secret-management path. They must not appear in repository files, pull-request text, CI logs, generated archives, documentation examples, or committed environment files.

## Independent release status

A repository merge may establish accepted canonical source without creating a Stable release. `docs/extension-inventory.json` schema v2 therefore records checked-in `source_version` and `source_state` independently from `accepted_stable_version`.

The manifest version must match `source_version` exactly. `accepted_stable_version` is evidence-backed release metadata and may be null, equal to source version only when that source itself is Stable, or identify an older independently accepted Stable release while newer source continues development. Candidate source never inherits Stable status merely because an older version was accepted.

## Current examples

- **GoreeCloud Download Manager Extension 0.2.12** is Stable for Mozilla unlisted/self-distribution. Governed run `34176105690` accepted source revision `2cc6d3bbe6ec2c63d49bec338bd68f154747be70`, candidate SHA-256 `779425b150921c1969462066a3e79cb345d976d11369a6891b5611c63a3d5537`, signed XPI SHA-256 `4c02a152a258c4f8e76581ece2cb2a41f088463a4464354da0c374dfb2957f25`, compatible native helper 0.2.11/protocol 2, persistent installation, full Firefox process restart without reinstalling, automatic same-job preserved-range recovery, exact final integrity, staging cleanup, and post-restart helper reconnect with zero manual Resume actions. The final lifecycle evidence rerun must derive `stablePromoted: true` from the canonical Stable inventory.
- **GoreeCloud Privacy Shield 0.2.0** is Stable for Mozilla unlisted/self-distribution after its governed signing and signed-runtime/persistent-restart acceptance.
- **GoreeCloud Redirector** checks in source version 0.2.1 while historical Stable acceptance remains 0.2.0. The newer source version requires its own signing and runtime acceptance before it can replace that Stable release.
- **GoreeCloud Bookmarks** checks in source version 0.1.1 as a source candidate with no accepted Stable version recorded. Its required runtime, signing, restart, and post-restart gates remain outstanding.
- **GoreeCloud Source Resync** checks in source version 1.1.2 as canonical source with no accepted Stable version currently recorded in the shared inventory.

Stable status is version-specific. Any later source change must independently satisfy the applicable release gates before it can inherit or replace an accepted Stable version.

## Packaging helper

Run:

```bash
python shared/scripts/package_extension.py <extension-slug>
```

Examples:

```bash
python shared/scripts/package_extension.py bookmarks
python shared/scripts/package_extension.py download-manager
python shared/scripts/package_extension.py redirector
python shared/scripts/package_extension.py source-resync
python shared/scripts/package_extension.py privacy-shield
```

Generated packages are written beneath `dist/` by default. `dist/` is build output and must not be treated as authoritative source.
