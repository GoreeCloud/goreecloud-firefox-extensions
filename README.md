# GoreeCloud Firefox Extensions

This repository is the canonical source-control home for Firefox extensions built and maintained by GoreeCloud.

All first-party GoreeCloud Firefox-extension source code, extension-specific documentation, validation tooling, packaging workflows, release metadata, and maintained extension assets belong in this repository. New GoreeCloud Firefox extensions should be created here rather than in separate standalone repositories unless a documented technical or licensing requirement makes separation necessary.

## Repository role

`GoreeCloud/goreecloud-firefox-extensions` is the authoritative maintenance location for GoreeCloud Firefox extensions.

The repository is intended to provide:

- one discoverable home for every GoreeCloud Firefox extension;
- consistent Firefox/WebExtension engineering and validation practices;
- shared packaging, signing, release, privacy, security, and compatibility tooling;
- clear extension ownership and lifecycle status;
- reusable Glaze UI, Wardveil Security, and Privacy Shield integration patterns where applicable;
- preserved source history and migration records for extensions that previously lived in standalone repositories.

## Canonical layout

```text
extensions/
├── bookmarks/
├── redirector/
└── source-resync/

docs/
└── repository-policy.md

shared/
├── assets/
├── scripts/
└── tooling/
```

Additional extension directories should use concise lowercase kebab-case names under `extensions/`.

## Current extension inventory

| Extension | Purpose | Canonical directory | Legacy repository |
| --- | --- | --- | --- |
| GoreeCloud Bookmarks browser extension | Browser integration for GoreeCloud Bookmarks | `extensions/bookmarks/` | `GoreeCloud/goreecloud-bookmark-browser-extension` |
| GoreeCloud Redirector | Firefox request and URL redirection controls | `extensions/redirector/` | `GoreeCloud/goreecloud-redirector` |
| GoreeCloud Source Resync | Manual resynchronization support for compatible ChatGPT Project Sources | `extensions/source-resync/` | `GoreeCloud/goreecloud-source-resync` |

The legacy repositories remain historical migration sources until their code, release metadata, and relevant history have been reconciled with this repository. After migration, active development should occur here.

## Maintenance rule

A GoreeCloud Firefox extension is not considered fully centralized until its active source, documentation, validation, build/package workflow, and release instructions are represented here. Legacy repositories may remain available for history, redirects, or compatibility, but they are not the preferred location for new development after migration.

See [`docs/repository-policy.md`](docs/repository-policy.md) for the repository governance and migration rules.
