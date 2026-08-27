# Firefox Extension Repository Policy

## Purpose

This document defines the source-control and maintenance boundary for Firefox extensions built by GoreeCloud.

## Authoritative repository

`GoreeCloud/goreecloud-firefox-extensions` is the canonical repository for GoreeCloud Firefox extensions.

All new GoreeCloud Firefox-extension development should begin in this repository. Standalone repositories that predate centralization are legacy or transitional sources after their canonical Firefox maintenance boundary is accepted here.

## Required extension structure

Each maintained extension has its own directory under `extensions/` and contains, as applicable:

- Firefox/WebExtension source code;
- `manifest.json` and browser metadata;
- extension artwork and icons;
- extension-specific README documentation;
- privacy and security documentation;
- tests and validation scripts;
- package/build instructions;
- Mozilla signing and release instructions where applicable;
- changelog or release-history information;
- license and upstream-attribution information when required.

Shared code and tooling belongs under `shared/` only when it is genuinely reusable across two or more extensions.

## Naming

Extension directories use concise lowercase kebab-case names. The directory name describes the extension rather than repeating the `goreecloud-` repository prefix.

Current directories are `extensions/bookmarks/`, `extensions/privacy-shield/`, `extensions/redirector/`, and `extensions/source-resync/`.

## Migration rule

For an existing standalone extension repository:

1. Inspect the exact current source and release state.
2. Preserve licensing, attribution, security, privacy, and release documentation.
3. Import or rebuild the maintained Firefox source in the appropriate canonical directory.
4. Reconcile CI, packaging, and signing workflows so they operate from this repository.
5. Validate that the extension can be packaged from the exact canonical revision.
6. Record the legacy repository and migrated or replacement baseline.
7. Stop normal Firefox-specific feature development in the legacy repository after migration acceptance.
8. Keep the legacy repository only when it remains useful for historical provenance, redirects, compatibility, cross-browser work, or release continuity.

A migration is not complete merely because a placeholder directory exists. A first-party replacement does not require copying obsolete or platform-specific code merely to reproduce the legacy tree.

## Development and release boundary

Changes to one extension should not unnecessarily alter another extension. Each extension preserves an independently understandable version, Firefox add-on ID, changelog, test boundary, and release process even though source is centralized.

Repository-wide workflows may coordinate validation, packaging, security checks, or release evidence, but extension-specific failures remain attributable to the affected extension.

A successful source merge, validation run, or unsigned XPI build is not equivalent to Mozilla signing or Stable release acceptance.

## Shared validation and packaging

`docs/extension-inventory.json` is the machine-readable inventory for canonical Firefox extensions.

`shared/scripts/validate_repository.py` validates repository-wide identity and manifest invariants, including unique Firefox add-on IDs and broad required-host permission checks. An extension that genuinely requires broad host access must declare a `broad_host_permission_review` path in the inventory, and that review must exist and document the functional requirement and privacy constraints.

`shared/scripts/package_extension.py` creates deterministic unsigned XPI candidates from canonical extension directories while excluding maintenance-only documentation and tooling. Generated packages belong under `dist/` and are not authoritative source.

Shared Mozilla signing guidance is maintained in `docs/MOZILLA_SIGNING.md`.

## Security and privacy

Firefox extensions request only permissions required for their documented role. Host permissions, content-script access, storage, network access, and privileged browser APIs are explicit trust boundaries.

Reusable credentials, tokens, cookies, signing secrets, private keys, account data, browsing data, and other sensitive values must not be committed to this repository.

Broad required host access such as `<all_urls>` is prohibited unless an extension has a documented and reviewed requirement. Optional host permissions may be broader when Firefox grants them only after an explicit user action and the extension documents the purpose.

A privacy or security extension whose primary role is browser-wide request inspection may qualify for broad host access, but only when the requirement is explicit, validated in the inventory, bounded by privacy documentation, and independently reviewed during release acceptance.

## GoreeCloud platform integration

Where applicable, extensions follow GoreeCloud application branding, Glaze UI, Wardveil Security, Privacy Shield, code-structure, release-lifecycle, production-readiness, and source-control requirements without adding unnecessary complexity.

Privacy Shield adapters must not treat branding as evidence of implementation. Browser-specific Privacy Shield claims remain limited to implemented, testable Firefox behavior and do not confer platform authority outside the adapter's accepted scope.

## Current migration state

- `GoreeCloud/goreecloud-source-resync` → `extensions/source-resync/`: canonical Firefox source migration accepted.
- `GoreeCloud/goreecloud-redirector` → `extensions/redirector/`: canonical Firefox source migration accepted; later canonical source versions retain independent signing gates from the historically accepted signed v0.2.0 release.
- `GoreeCloud/goreecloud-bookmark-browser-extension` → `extensions/bookmarks/`: legacy cross-browser Linkwarden-derived repository inspected; canonical Firefox-specific first-party replacement foundation accepted. Bookmarks remains a source baseline rather than a Stable release.
- `extensions/privacy-shield/`: first-party Firefox Privacy Shield adapter introduced directly in the canonical repository; no legacy standalone Firefox extension repository exists.

Legacy repositories remain useful only to the extent required for provenance, cross-browser boundaries, redirects, compatibility, or historical release continuity.
