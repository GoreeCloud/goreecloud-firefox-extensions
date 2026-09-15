# GoreeCloud Advanced Tab Manager — Repository Specifications

This repository document describes the implemented source boundary for version `0.1.1`. The broader product direction is governed by the canonical Drive project specification.

## Implemented source contract

- Firefox Manifest V3 extension.
- Add-on ID `advanced-tab-manager@goreecloud.com`.
- Firefox 139+ baseline because the `tabGroups` API became available in Firefox 139.
- Non-persistent Firefox background scripts loaded as ES modules.
- `tabs`, `tabGroups`, and `sessions` permissions only.
- No host permissions, content scripts, remote telemetry, or page-content inspection.
- Firefox is authoritative for whether tabs, windows, and native groups exist.
- Every UI snapshot is reconstructed from live Firefox APIs rather than trusted from stale globals.
- Extension-owned logical tab IDs use Firefox session tab values and are not substitutes for Firefox tab IDs.
- Tree relationships use a child tab's Firefox session value to store its parent logical tab ID. They do not persist or trust runtime Firefox tab IDs.
- Tree relationships may bind only between live tabs in the same normal Firefox window.
- If a recorded parent is unavailable or in another window, the child remains a live root for presentation while the session metadata remains available for a later supported restore/reconciliation.
- Existing malformed cycles are broken for presentation and surfaced as repair-state UI; new reparent operations that would create a cycle fail closed.
- Eligible newly opened tabs may adopt their Firefox opener as a parent only when no restored tree parent already exists.
- Tree-parent writes use persist → readback verify → rollback-on-failure semantics before the UI treats the change as accepted.
- UI actions remain bounded to Firefox-supported operations and extension-owned metadata changes.

## Release boundary

`0.1.1` is a source candidate. Source tests, CI, deterministic packaging, or merge do not establish representative Firefox runtime acceptance, Mozilla signing, signed-XPI acceptance, or Stable qualification.
