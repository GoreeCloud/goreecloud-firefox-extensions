# GoreeCloud Firefox Extensions

This repository is the canonical source-control home for Firefox extensions built and maintained by GoreeCloud.

All first-party GoreeCloud Firefox-extension source code, extension-specific documentation, validation tooling, packaging workflows, release metadata, and maintained extension assets belong here. New GoreeCloud Firefox extensions should be created in this repository unless a documented technical, licensing, or platform requirement makes separation necessary.

## Repository role

`GoreeCloud/goreecloud-firefox-extensions` is the authoritative Firefox-extension maintenance location for GoreeCloud.

The repository provides:

- one discoverable home for every GoreeCloud Firefox extension;
- independent extension identities and release boundaries inside one repository;
- shared Firefox/WebExtension validation and deterministic packaging tooling;
- common Mozilla signing and release-gate guidance;
- consistent privacy, security, compatibility, and provenance records;
- reusable Glaze UI, Wardveil Security, and Privacy Shield patterns where appropriate.

## Canonical layout

```text
extensions/
├── bookmarks/
├── download-manager/
├── privacy-shield/
├── redirector/
└── source-resync/

docs/
├── extension-inventory.json
├── MOZILLA_SIGNING.md
└── repository-policy.md

shared/
└── scripts/
    ├── package_extension.py
    └── validate_repository.py
```

Additional extension directories use concise lowercase kebab-case names under `extensions/`.

## Current extension inventory

| Extension | Canonical directory | Firefox add-on ID | Canonical source state | Legacy repository |
| --- | --- | --- | --- | --- |
| GoreeCloud Bookmarks | `extensions/bookmarks/` | `goreecloud-bookmarks@goreecloud.com` | Source baseline; not Stable | `GoreeCloud/goreecloud-bookmark-browser-extension` |
| GoreeCloud Download Manager Extension | `extensions/download-manager/` | `download-manager@goreecloud.com` | Stable 0.2.11 accepted for Mozilla unlisted/self-distribution | None |
| GoreeCloud Privacy Shield | `extensions/privacy-shield/` | `privacy-shield@goreecloud.com` | Stable 0.2.0 accepted for Mozilla unlisted/self-distribution | None |
| GoreeCloud Redirector | `extensions/redirector/` | `redirector@goreecloud.com` | Canonical source | `GoreeCloud/goreecloud-redirector` |
| GoreeCloud Source Resync | `extensions/source-resync/` | `source-resync@goreecloud.com` | Canonical source | `GoreeCloud/goreecloud-source-resync` |

Machine-readable inventory lives in [`docs/extension-inventory.json`](docs/extension-inventory.json). Inventory schema v2 deliberately records each checked-in manifest version and source lifecycle state separately from any independently accepted Mozilla-signed Stable version, so a newer source candidate cannot silently inherit an older release's Stable status.

Legacy repositories may remain available for provenance, redirects, compatibility, or release continuity, but new Firefox-specific development belongs in the canonical directory after migration acceptance.

## Validation

Repository-wide source validation:

```bash
python shared/scripts/validate_repository.py
```

The shared validator checks the schema-v2 inventory, exact manifest-to-inventory source-version agreement, source-versus-Stable lifecycle separation, Manifest V3 status, GoreeCloud product names, unique Firefox add-on IDs, version syntax, required documentation, and required-host permission boundaries. Broad required host access is accepted only when the extension inventory points to a substantive review document.

Extension-specific validation remains available where an extension needs stricter checks. GitHub Actions runs repository-wide validation, JavaScript syntax checks, deterministic unsigned packaging, and archive-integrity checks for maintained extensions.

## Packaging

Create a deterministic unsigned XPI candidate with:

```bash
python shared/scripts/package_extension.py <extension-slug>
```

For example:

```bash
python shared/scripts/package_extension.py download-manager
```

Generated packages are written to `dist/` and are build outputs rather than authoritative source. Packaging success does not imply Mozilla signing or Stable acceptance.

## Mozilla signing

See [`docs/MOZILLA_SIGNING.md`](docs/MOZILLA_SIGNING.md). Each extension keeps an independent release state. A source merge or unsigned package must never be described as Stable solely because repository validation passes.

Privacy Shield 0.2.0 is the current accepted Stable Privacy Shield Firefox release for Mozilla unlisted/self-distribution after exact-payload Mozilla signing, signed-artifact runtime and popup verification, persistent installation, full same-profile Firefox restart acceptance, and governed target-environment acceptance. Stable 0.1.1 remains preserved as the prior accepted release record.

GoreeCloud Download Manager Extension 0.2.11 is the accepted Stable Download Manager Firefox release for Mozilla unlisted/self-distribution. Its governed signing run `34174320808` proved exact signed-payload parity, matching 0.2.11 native-helper compatibility, persistent installation, survival across a full Firefox process restart without reinstalling, automatic same-job partial-range recovery, binary-safe final publication, exact final SHA-256 integrity, staging cleanup, and native-helper reconnection.

## Maintenance rule

A GoreeCloud Firefox extension is not fully centralized until its active source, documentation, validation, package workflow, release instructions, required licensing/attribution, and relevant release history are represented here.

See [`docs/repository-policy.md`](docs/repository-policy.md) for repository governance and migration rules.
