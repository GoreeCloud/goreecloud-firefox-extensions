# GoreeCloud Firefox Extensions

This repository is the canonical source-control home for **standalone** Firefox extensions built and maintained by GoreeCloud, plus shared Firefox/WebExtension tooling.

Firefox support that is a client, adapter, or platform variant of a broader GoreeCloud application belongs in that application's repository alongside its other supported variants (for example Android, iOS, web, Linux, and Firefox). Such an extension must not be split into its own isolated repository. During migration, an application-owned Firefox extension may temporarily remain represented here, but its permanent source-control authority is the owning application repository.

## Repository role

`GoreeCloud/goreecloud-firefox-extensions` is the authoritative Firefox-extension maintenance location for GoreeCloud.

The repository provides:

- one discoverable home for standalone GoreeCloud Firefox extensions and shared browser-extension tooling;
- independent extension identities and release boundaries inside one repository;
- shared Firefox/WebExtension validation and deterministic packaging tooling;
- common Mozilla signing and release-gate guidance;
- consistent privacy, security, compatibility, and provenance records;
- reusable Glaze UI, Wardveil Security, and Privacy Shield patterns where appropriate.

## Canonical layout

```text
extensions/
├── advanced-tab-manager/
├── bookmarks/
├── download-manager/
├── privacy-shield/
├── redirector/
├── source-resync/
└── webspaces/

docs/
├── extension-inventory.json
├── MOZILLA_SIGNING.md
└── repository-policy.md

shared/
└── scripts/
    ├── package_extension.py
    └── validate_repository.py
```

## Current extension inventory

| Extension | Current directory | Firefox add-on ID | Source state | Ownership / disposition |
| --- | --- | --- | --- | --- |
| GoreeCloud Advanced Tab Manager | `extensions/advanced-tab-manager/` | `advanced-tab-manager@goreecloud.com` | **Stable 0.1.11** accepted for Mozilla unlisted/self-distribution | Standalone Firefox product; remains here |
| GoreeCloud Bookmarks | `extensions/bookmarks/` | `goreecloud-bookmarks@goreecloud.com` | Source baseline; not Stable | Application-owned Firefox client; transitional here pending migration to `GoreeCloud/goreecloud-bookmarks` |
| GoreeCloud Download Manager Extension | `extensions/download-manager/` | `download-manager@goreecloud.com` | **Stable 0.2.12** accepted for Mozilla unlisted/self-distribution | Application-owned Firefox client; transitional here pending migration to `GoreeCloud/goreecloud-advanced-download-manager` |
| GoreeCloud Privacy Shield | `extensions/privacy-shield/` | `privacy-shield@goreecloud.com` | Stable 0.2.0 accepted for Mozilla unlisted/self-distribution | Platform adapter; retained here pending explicit platform-boundary review |
| GoreeCloud Redirector | `extensions/redirector/` | `redirector@goreecloud.com` | Canonical source | Standalone Firefox product; canonical here; isolated legacy repository pending retirement |
| GoreeCloud Source Resync | `extensions/source-resync/` | `source-resync@goreecloud.com` | Canonical source | Standalone Firefox product; canonical here; `GoreeCloud/source-resync` pending retirement |
| GoreeCloud Webspaces | `extensions/webspaces/` | `webspaces@goreecloud.com` | **Stable 0.1.14** accepted for Mozilla unlisted/self-distribution | Standalone Firefox product; remains here |

Machine-readable inventory lives in [`docs/extension-inventory.json`](docs/extension-inventory.json). Inventory schema v2 records each checked-in manifest version and source lifecycle state separately from independently accepted Mozilla-signed Stable versions, preventing a newer source candidate from silently inheriting older release status.

## Validation

Repository-wide source validation:

```bash
python shared/scripts/validate_repository.py
```

The shared validator checks schema-v2 inventory, exact manifest-to-inventory source-version agreement, source-versus-Stable lifecycle separation, Manifest V3 status, GoreeCloud product names, unique Firefox add-on IDs, version syntax, required documentation, and reviewed broad required-host permissions.

GitHub Actions additionally runs maintained extension-specific source suites, JavaScript syntax checks, deterministic unsigned packaging, and archive-integrity verification.

## Packaging

Create a deterministic unsigned XPI candidate with:

```bash
python shared/scripts/package_extension.py <extension-slug>
```

Generated packages are written to `dist/` and are build outputs rather than authoritative source. Packaging success does not imply Mozilla signing or Stable acceptance.

## Mozilla signing

See [`docs/MOZILLA_SIGNING.md`](docs/MOZILLA_SIGNING.md). Each extension keeps an independent release state. A source merge or unsigned package must never be described as Stable solely because repository validation passes.

### GoreeCloud Advanced Tab Manager 0.1.11

Advanced Tab Manager 0.1.11 is the accepted Stable release for Mozilla unlisted/self-distribution. Governed signing/restart run `35350654198` accepted authoritative source revision `34c27805c3b56f3ba858794c785f6b68d1f7b8f3`, deterministic unsigned XPI SHA-256 `9c0f44926ac1d2f213fd07f82dd18fa11bd54ceebc6cd871898fe82b962a5b02`, and Mozilla-signed XPI SHA-256 `e0f16901529cb8fa76e57d9aa056c98de9fa04e708f2232c151d5b75c1dfdb1d`.

The governed gate re-ran Stable Security Blockers and GLAZE UI 1.5.1 consumer qualification, verified Mozilla signature metadata and governed signed-payload parity, installed the signed XPI persistently, fully restarted Firefox without reinstalling the add-on, verified persisted organizational state, and repeated release-critical Manager/tree/stash/snooze/duplicate/rule/session-snapshot/backup acceptance after restart.

### GoreeCloud Download Manager Extension 0.2.12

Download Manager 0.2.12 is the accepted Stable release for Mozilla unlisted/self-distribution. Governed signing/restart run `34176105690` accepted source revision `2cc6d3bbe6ec2c63d49bec338bd68f154747be70`, candidate SHA-256 `779425b150921c1969462066a3e79cb345d976d11369a6891b5611c63a3d5537`, signed XPI SHA-256 `4c02a152a258c4f8e76581ece2cb2a41f088463a4464354da0c374dfb2957f25`, compatible native helper 0.2.11/protocol 2, persistent installation, full Firefox process restart without reinstalling, automatic same-job preserved-range recovery, exact final integrity, staging cleanup, and post-restart helper reconnect with zero manual Resume actions.

0.2.11 was intentionally not promoted despite passing runtime recovery because its already-signed Settings page still labeled itself a source candidate. 0.2.12 corrected that packaged release-quality issue using a lifecycle-neutral version label and repeated the full governed signed gate.

### GoreeCloud Privacy Shield 0.2.0

Privacy Shield 0.2.0 remains the accepted Stable Privacy Shield Firefox release for Mozilla unlisted/self-distribution after exact-payload signing, signed-artifact runtime verification, persistent installation, full same-profile Firefox restart acceptance, and governed target-environment acceptance.

### GoreeCloud Webspaces 0.1.14

Webspaces 0.1.14 is the accepted Stable release for Mozilla unlisted/self-distribution. It includes the runtime-accepted Standard fallback, six-Webspace isolation, provider identity marks, Proton routing, and current-Webspace reconciliation with lifecycle-neutral packaged UI.

The accepted deterministic unsigned XPI SHA-256 is `ac605e4781a6dcc605d6c7474989e5f125cee12448580786cfefc4ffd81f3e00`. The Mozilla-signed XPI SHA-256 is `37a42b44e779b0a5585b622ae5040ffe1b51e15a72099e2c13182ca3c5a18479`. Governed signing/restart run `34735370919` verified the existing unlisted Mozilla-signed 0.1.14 artifact, persistent installation, a full Firefox 155.0.1 restart on the same profile without reinstalling Webspaces, the active extension registration after restart, and persistence of all six distinct built-in Firefox contextual identities.

## Maintenance rule

A standalone GoreeCloud Firefox extension is not fully centralized until its active source, documentation, validation, package workflow, release instructions, required licensing/attribution, and relevant release history are represented here. After migration acceptance, its isolated legacy repository must be retired; long-term provenance belongs in canonical records or approved archives rather than a permanent standalone extension repository.

An application-owned Firefox client is not permanently centralized here. Its authoritative source must converge on the owning application repository, where Firefox is maintained as one supported platform variant alongside the application's other clients. Transitional copies must be clearly identified and removed from authority after migration acceptance.

See [`docs/repository-policy.md`](docs/repository-policy.md) for repository governance and migration rules.
