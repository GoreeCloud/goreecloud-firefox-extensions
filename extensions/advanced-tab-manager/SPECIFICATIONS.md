# GoreeCloud Advanced Tab Manager — Repository Specifications

This repository document describes the implemented source boundary for version `0.1.9`. The broader product direction is governed by the canonical Drive project specification.

## Component and dependency contract

- Component class: browser extension.
- Supported platform: Firefox 139+.
- Source state: `source-candidate`; product lifecycle: In Development.
- Required GoreeCloud runtime dependencies: none.
- Optional/planned integrations such as Webspaces are not implemented dependencies in 0.1.9.
- Browser-surface presentation follows current GoreeCloud Glaze principles where practical without claiming a separate Glaze runtime-package or product-level acceptance state.

## Implemented source contract

- Manifest V3 add-on ID `advanced-tab-manager@goreecloud.com`.
- Non-persistent ES-module background scripts.
- Permissions only: `alarms`, `sessions`, `storage`, `tabGroups`, and `tabs`.
- No `unlimitedStorage`, host permissions, content scripts, remote telemetry, page-content inspection, or private-browsing access.
- Firefox remains authoritative for live tabs/windows/native groups; extension UI and automation snapshots are reconstructed from Firefox APIs.
- Runtime Firefox tab/group IDs are not durable persistent identity.
- Tab Set/stash, snooze recovery, and rule definitions remain in separate versioned `storage.local` records.
- Restorable URLs remain limited to `http:`, `https:`, and `about:blank`.
- Existing tree, Tab Set/stash, duplicate-cleanup, snooze, rule-action, and command-palette contracts remain in force.

### ATM-008C manager/diagnostics boundary — 0.1.8

- `src/core/manager-model.js` is a pure aggregation layer. It has no browser API dependency.
- The manager model contains source/lifecycle/component metadata, live/saved counts, local-store availability/schema/revision metadata, and manifest-declared permission posture.
- The manager model deliberately omits tab titles, tab URLs, Tab Set/stash/snooze URLs, rule contents, and browsing-history records.
- `src/background/manager.js` reads the already-established dashboard, snooze, and rule-state interfaces. A failed store read is converted to a degraded availability state so one broken local store does not suppress the remaining diagnostics.
- `atm:get-manager-state` is read-only. It does not mutate Firefox or extension-owned saved state.
- `src/manager/manager.html`, `.css`, and `.js` provide the full-window read-only diagnostic surface with Refresh and Open sidebar actions only.
- The manager can be opened from the sidebar, popup, or command palette. The command palette still routes through an existing UI control and contains no direct browser API calls.
- The manager adds no new manifest permission, host permission, content script, remote dependency, telemetry, or private-browsing access.
- Reduced Transparency, responsive layout, keyboard focus indication, and Forced Colors fallbacks are included in source.
- Session snapshots, bulk organization, destructive settings, automatic rule execution, remote management, and synchronization remain outside the current boundary.

### ATM-008D local backup portability boundary — 0.1.9

- `src/core/portability.js` defines a versioned GoreeCloud Advanced Tab Manager backup envelope with exact Gecko identity, source extension version, export timestamp, implemented store payloads, canonical JSON hashing, and SHA-256 integrity verification.
- Imported organizational, snooze, and rule payloads are revalidated through their existing authoritative store validators before replacement.
- Preview returns only imported counts, ID-conflict counts, source version/time, integrity status, and expected current revisions; it does not return imported URLs or titles to the Manager UI.
- `src/background/portability.js` serializes export/preview/apply operations and does not call live-tab create/update/remove/discard APIs.
- Apply requires the exact revisions observed during preview. Drift fails closed with `state-changed-since-preview`.
- Imported store revision numbers are not trusted as local chronology; successful replacement writes each imported payload at the current local revision + 1.
- One storage write replaces the three implemented extension-owned stores, readback verifies all three, and snooze alarms are reconstructed from imported deadlines.
- Readback or snooze-reconstruction failure attempts exact restoration of all pre-import records and then reconstructs the prior snooze alarms.
- The Manager enforces a 16 MiB selected-file cap before JSON parsing and requires explicit confirmation before replacement.
- Import itself never opens or closes Firefox tabs. Restoring saved records and opening live browser tabs remain separate user actions.
- Version 0.1.9 adds no Firefox permission and preserves the existing no-host/no-content-script/private-browsing boundary.

## Release boundary

`0.1.9` is a source candidate. Source tests, CI, deterministic packaging, or merge do not establish representative Firefox manager/portability runtime/accessibility acceptance, browser-restart acceptance, Mozilla signing, signed-XPI acceptance, production release, or Stable qualification.
