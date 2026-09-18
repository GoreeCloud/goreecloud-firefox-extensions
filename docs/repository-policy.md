# Firefox Extension Repository Policy

## Purpose

This document defines the source-control and maintenance boundary for Firefox extensions built by GoreeCloud.

## Authoritative repository

`GoreeCloud/goreecloud-firefox-extensions` is the canonical repository for **standalone** GoreeCloud Firefox extensions and shared Firefox/WebExtension tooling.

Firefox support that is a client, adapter, or platform variant of a broader GoreeCloud application belongs in the owning application repository rather than in a separate isolated repository. For a multi-platform application, Firefox should be maintained alongside the application's Android, iOS, web, Linux, desktop, or other governed variants. GoreeCloud Memos is the model: a Firefox variant belongs with GoreeCloud Memos rather than in an isolated Firefox-only repository.

A standalone Firefox product with no broader owning application belongs here. A Firefox extension must not receive its own isolated repository merely because it has an independent add-on ID, release cadence, or Mozilla signing workflow.

## Ownership model

Use the following source-control boundary:

1. **Standalone Firefox product** — source belongs under `extensions/` in this repository.
2. **Application-owned Firefox client or variant** — source belongs in the owning application repository under that repository's governed client/platform structure.
3. **Platform adapter** — classify against the owning platform boundary explicitly; do not assume either this repository or a separate repository without review.
4. **No isolated extension repository** — neither a standalone Firefox product nor an application-owned Firefox client should retain a permanent dedicated repository after its migration is accepted.
5. **Temporary migration copies** — duplicate source may exist only during a controlled migration/rollback window and must identify which location is authoritative.

The extension add-on ID, product branding, package identity, and release lifecycle remain independent from repository placement.

## Required extension structure

Each standalone extension maintained here has its own directory under `extensions/` and contains, as applicable:

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

Current canonical standalone/platform-adapter directories include `extensions/privacy-shield/`, `extensions/redirector/`, and `extensions/source-resync/`; additional standalone extension directories are listed in the repository inventory.

## Migration rule

### Standalone Firefox products

For an existing standalone extension repository:

1. Inspect the exact current source and release state.
2. Preserve licensing, attribution, security, privacy, signing, and release documentation.
3. Import or rebuild the maintained Firefox source in the appropriate canonical directory here.
4. Reconcile CI, packaging, and signing workflows so they operate from this repository.
5. Validate that the extension can be packaged from the exact canonical revision.
6. Record the legacy repository and migrated or replacement baseline.
7. Stop normal feature development in the isolated legacy repository after migration acceptance.
8. Preserve rollback/provenance evidence in canonical records or an approved archive.
9. Retire the isolated legacy repository after the governed migration and rollback window closes.

### Application-owned Firefox clients

For an extension that belongs to a broader application:

1. Identify the owning application repository.
2. Preserve the extension's add-on ID, compatibility, signing, security, privacy, and release history.
3. Move the maintained Firefox source into the owning application repository alongside the application's other platform variants.
4. Reconcile application-level CI, shared libraries, packaging, and release automation.
5. Mark any copy in this shared Firefox repository as transitional while migration is in progress.
6. Remove the transitional copy from source-control authority after the owning application repository is accepted.
7. Do not create or retain a separate extension-only repository for that application client.

A migration is not complete merely because a placeholder directory exists. A first-party replacement does not require copying obsolete or platform-specific code merely to reproduce a legacy tree.

## Development and release boundary

Changes to one extension should not unnecessarily alter another extension. Each extension preserves an independently understandable version, Firefox add-on ID, changelog, test boundary, and release process even though source is centralized.

Repository-wide workflows may coordinate validation, packaging, security checks, or release evidence, but extension-specific failures remain attributable to the affected extension.

A successful source merge, validation run, or unsigned XPI build is not equivalent to Mozilla signing or Stable release acceptance.

## Shared validation and packaging

`docs/extension-inventory.json` is the machine-readable inventory for canonical Firefox extensions. Inventory schema v2 separates checked-in source state from independently accepted Stable release state. Every entry records:

- `source_version`, which must exactly match the extension's current `manifest.json` version;
- `source_state`, describing the lifecycle of the checked-in source;
- `accepted_stable_version`, which is null until a version has passed that extension's required signing, runtime, restart, and governed Stable acceptance gates, and which may identify an older Stable release while newer candidate source remains under development.

The legacy single `release_status` field is prohibited because it can conflate a repository's current source with a different historically accepted release. A candidate source version must not be represented as Stable solely because the same extension has an older accepted Stable artifact.

`shared/scripts/validate_repository.py` validates schema-v2 lifecycle separation plus repository-wide identity and manifest invariants, including exact source-version agreement, unique Firefox add-on IDs, and broad required-host permission checks. An extension that genuinely requires broad host access must declare a `broad_host_permission_review` path in the inventory, and that review must exist and document the functional requirement and privacy constraints.

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

## Current migration and release state

- Former `GoreeCloud/source-resync` → `extensions/source-resync/`: canonical standalone Firefox source migration is accepted and the separate repository was retired on 2026-09-18 after full Git history, pull-request/Actions provenance, and all five historical release records/assets were preserved in this repository.
- Former `GoreeCloud/goreecloud-redirector` → `extensions/redirector/`: canonical standalone Firefox source migration is accepted and the separate repository was retired on 2026-09-18 after full Git history, pull-request/Actions provenance, and Stable/signing/privacy/security records were preserved in this repository. Later canonical source versions retain independent signing gates from the historically accepted signed v0.2.0 release.
- Former `extensions/bookmarks/` → `GoreeCloud/goreecloud-bookmarks/clients/firefox/`: application-owned Firefox client migration completed on 2026-09-18 via Bookmarks PR #8. The application repository is now authoritative; the transitional shared-repository copy has been removed.
- `extensions/download-manager/`: currently transitional. GoreeCloud Download Manager Extension is attached to GoreeCloud Advanced Download Manager, so its Firefox client must migrate into `GoreeCloud/goreecloud-advanced-download-manager` and cease being authoritative here after application-repository acceptance.
- `extensions/privacy-shield/`: first-party Firefox Privacy Shield adapter introduced directly here. Because Privacy Shield is a platform foundation rather than a conventional application client, its long-term repository boundary requires explicit platform-adapter review before relocation.
- `extensions/advanced-tab-manager/` and `extensions/webspaces/`: standalone Firefox products and appropriate permanent residents of this repository.

A legacy or transitional repository may exist only while migration, rollback, compatibility, or provenance capture is actively required. Permanent historical retention must move to canonical records or approved archives so Firefox extensions do not remain in isolated repositories indefinitely.
