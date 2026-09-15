# GoreeCloud Advanced Tab Manager

GoreeCloud Advanced Tab Manager is a local-first Firefox WebExtension for high-scale tab organization. Firefox remains authoritative for live tabs, windows, and native tab groups; the extension reconstructs live state on demand and augments it with extension-owned organization metadata.

## Current source state

- Version: `0.1.1`
- Lifecycle: `source-candidate`
- Firefox add-on ID: `advanced-tab-manager@goreecloud.com`
- Minimum Firefox version: `139.0`
- Stable release: none
- Host permissions: none
- Content scripts: none
- Private browsing: explicitly not allowed by manifest

The current source implements live window/tab/native-group synchronization, a persistent sidebar surface, a lightweight popup, exact duplicate counting, safe tab activation/close/discard actions, extension-owned logical tab identifiers, and durable parent/child tree relationships stored with Firefox session tab values.

Tree relationships are keyed by logical tab identity rather than Firefox runtime tab IDs. This allows a restored tab to recover its extension-owned parent relationship even when Firefox assigns new runtime IDs. Missing or cross-window parents are reconciled as orphaned live roots without fabricating browser state, and malformed cycles are broken for presentation while new cycle-producing reparent operations fail closed.

The sidebar now provides a tree view and native-group view. Tabs opened from another tab can adopt the opener as their tree parent; users can also make a tab a child of the previous browser tab or remove its tree parent. Tree metadata writes use verified transactional persistence with rollback on failure.

It does **not** yet implement persistent Tab Sets, transactional stashing, snoozing, automatic organization rules, tree drag-and-drop/bulk tree actions, hidden-tab Focus Mode, Webspaces integration, Mozilla signing, or Stable release acceptance.

## Development validation

```bash
python extensions/advanced-tab-manager/scripts/validate.py
node --test extensions/advanced-tab-manager/tests/*.test.mjs
python shared/scripts/validate_repository.py
python shared/scripts/package_extension.py advanced-tab-manager
```

Packaging produces a deterministic unsigned XPI under `dist/`. An unsigned package is not a Stable release.
