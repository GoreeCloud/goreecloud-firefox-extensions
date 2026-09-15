# GoreeCloud Advanced Tab Manager — Repository Specifications

This repository document describes the implemented source boundary for version `0.1.0`. The broader product direction is governed by the canonical Drive project specification.

## Implemented foundation contract

- Firefox Manifest V3 extension.
- Add-on ID `advanced-tab-manager@goreecloud.com`.
- Firefox 139+ baseline because the `tabGroups` API became available in Firefox 139.
- Non-persistent Firefox background scripts loaded as ES modules.
- `tabs`, `tabGroups`, and `sessions` permissions only.
- No host permissions, content scripts, remote telemetry, or page-content inspection.
- Firefox is authoritative for whether tabs, windows, and native groups exist.
- Every UI snapshot is reconstructed from live Firefox APIs rather than trusted from stale globals.
- Extension-owned logical tab IDs use Firefox session tab values and are not substitutes for Firefox tab IDs.
- UI actions are deliberately bounded to activation, close, pin/mute plumbing, and manual discard operations supported by Firefox.

## Release boundary

`0.1.0` is a source candidate. Packaging, source tests, or pull-request CI do not establish Mozilla signing, runtime acceptance, or Stable qualification.
