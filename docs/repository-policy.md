# Firefox Extension Repository Policy

## Purpose

This document defines the source-control and maintenance boundary for Firefox extensions built by GoreeCloud.

## Authoritative repository

`GoreeCloud/goreecloud-firefox-extensions` is the canonical repository for GoreeCloud Firefox extensions.

All new GoreeCloud Firefox-extension development should begin in this repository. Existing standalone Firefox-extension repositories should be migrated into an extension-specific directory under `extensions/` and treated as legacy sources after migration.

## Required extension structure

Each maintained extension should have its own directory under `extensions/` and should contain, as applicable:

- Firefox/WebExtension source code;
- `manifest.json` and related browser metadata;
- extension artwork and icons;
- extension-specific README documentation;
- privacy and security documentation;
- tests and validation scripts;
- package/build instructions;
- Mozilla signing and release instructions where applicable;
- changelog or release-history information;
- license and upstream-attribution information when required.

Shared code and tooling should live under `shared/` only when it is genuinely reusable across two or more extensions.

## Naming

Extension directories use concise lowercase kebab-case names. The directory name describes the extension rather than repeating the `goreecloud-` repository prefix.

Examples:

- `extensions/redirector/`
- `extensions/source-resync/`
- `extensions/bookmarks/`

## Migration rule

For an existing standalone extension repository:

1. Inspect the exact current source and release state.
2. Preserve licensing, attribution, security, privacy, and release documentation.
3. Import the maintained Firefox source into the appropriate directory here.
4. Reconcile CI, packaging, and signing workflows so they operate from this repository.
5. Validate that the imported extension can be built or packaged from this repository at the exact migrated revision.
6. Record the legacy repository and final migrated revision.
7. Stop normal feature development in the legacy repository after the migration is accepted.
8. Keep the legacy repository only when it remains useful for historical provenance, redirects, compatibility, or release continuity.

A migration is not complete merely because a placeholder directory exists.

## Development and release boundary

Changes to one extension should not unnecessarily alter another extension. Each extension should preserve an independently understandable version, changelog, test boundary, and release process even though the source is centralized.

Repository-wide workflows may coordinate linting, validation, packaging, security checks, or release evidence, but extension-specific failures should remain attributable to the affected extension.

## Security and privacy

Firefox extensions should request only permissions required for their documented role. Host permissions, content-script access, storage, network access, and privileged browser APIs should be reviewed as explicit trust boundaries.

Reusable credentials, tokens, cookies, signing secrets, private keys, account data, browsing data, and other sensitive values must not be committed to this repository.

## GoreeCloud platform integration

Where applicable, extensions should follow GoreeCloud application branding, Glaze UI, Wardveil Security, Privacy Shield, code-structure, release-lifecycle, production-readiness, and source-control requirements without adding unnecessary complexity.

## Current migration inventory

- `GoreeCloud/goreecloud-redirector` → `extensions/redirector/`
- `GoreeCloud/goreecloud-source-resync` → `extensions/source-resync/`
- `GoreeCloud/goreecloud-bookmark-browser-extension` → `extensions/bookmarks/`

These legacy repositories remain migration sources until their current maintained source has been fully imported and validated here.
