# Mozilla Signing and Firefox Release Boundary

## Purpose

This document defines the shared release boundary for GoreeCloud Firefox extensions maintained in this repository.

Source validation and packaging are not equivalent to a Mozilla-signed release. Each extension retains its own version, add-on ID, release record, acceptance evidence, and Stable promotion decision.

## Shared release sequence

1. Validate the exact candidate commit with repository-wide and extension-specific checks.
2. Package the extension from its canonical directory using `shared/scripts/package_extension.py` or an extension-specific equivalent when required.
3. Inspect the resulting archive and confirm that `manifest.json` is at the archive root and that maintenance-only files are not included unintentionally.
4. Record the exact source commit and candidate artifact digest.
5. Submit the candidate through the approved Mozilla Add-ons signing path for that extension.
6. Never commit Mozilla API credentials, signing secrets, private keys, cookies, session values, or reusable authentication material.
7. Download and preserve the Mozilla-signed XPI through the approved release-record process.
8. Verify the signed package identity, version, add-on ID, permissions, and expected runtime files.
9. Install the signed XPI through normal Firefox extension installation.
10. Fully restart Firefox and confirm that the extension remains installed and enabled.
11. Repeat the extension's release-critical runtime acceptance after restart.
12. Only then record Stable promotion for that specific extension version.

## Credentials

Signing credentials must be supplied at execution time through an approved secret-management path. They must not appear in repository files, pull-request text, CI logs, generated archives, documentation examples, or committed environment files.

## Independent release status

A repository merge may establish accepted canonical source without creating a Stable release. `docs/extension-inventory.json` schema v2 therefore records the checked-in `source_version` and `source_state` independently from `accepted_stable_version`.

The manifest version must match `source_version` exactly. `accepted_stable_version` is evidence-backed release metadata and may be null, equal to the source version only when the source itself is Stable, or identify an older independently accepted Stable release while a newer source candidate continues development. A candidate source must never inherit Stable status merely because an older version was accepted.

Current examples:

- GoreeCloud Download Manager Extension checks in source version 0.2.11 as **Stable**, with accepted Stable version 0.2.11. Governed signing/restart run `34174320808` established exact signed-payload parity, matching native-helper compatibility, persistent installation, full Firefox process restart survival without reinstalling, automatic same-job preserved-range recovery, exact final integrity, staging cleanup, and helper reconnection.
- GoreeCloud Privacy Shield checks in source version 0.2.0 as **Stable**, with accepted Stable version 0.2.0 after Mozilla unlisted signing and its governed signed-runtime/persistent-restart acceptance.
- GoreeCloud Redirector checks in source version 0.2.1 while historical Mozilla-signed Stable acceptance remains version 0.2.0. The later source version requires its own signing and runtime acceptance before it can be called Stable.
- GoreeCloud Bookmarks checks in source version 0.1.1 as a source candidate with no accepted Stable version yet. Its server contract, Firefox runtime acceptance, signing, persistent installation, restart, and post-restart validation remain required before Stable promotion.
- GoreeCloud Source Resync checks in source version 1.1.2 as canonical source with no accepted Stable version currently recorded in the shared inventory.

Stable status is version-specific. A later source change does not inherit the Stable status of Download Manager 0.2.11, Privacy Shield 0.2.0, Redirector 0.2.0, or any other accepted version without its own required release evidence and explicit lifecycle record.

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
