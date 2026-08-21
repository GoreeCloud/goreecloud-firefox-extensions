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

A repository merge may establish accepted canonical source without creating a Stable release. The extension inventory intentionally distinguishes source state from signed-release acceptance.

GoreeCloud Redirector already has historical Mozilla-signed acceptance for version 0.2.0 in its project records; a later canonical source version still requires its own signing and runtime acceptance before that later version can be called Stable.

GoreeCloud Bookmarks version 0.1.0 is currently a source baseline and requires its server contract, Firefox runtime acceptance, signing, persistent installation, restart, and post-restart validation before Stable promotion.

## Packaging helper

Run:

```bash
python shared/scripts/package_extension.py <extension-slug>
```

Examples:

```bash
python shared/scripts/package_extension.py bookmarks
python shared/scripts/package_extension.py redirector
python shared/scripts/package_extension.py source-resync
```

Generated packages are written beneath `dist/` by default. `dist/` is build output and must not be treated as authoritative source.
