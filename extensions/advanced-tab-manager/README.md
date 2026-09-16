# GoreeCloud Advanced Tab Manager

GoreeCloud Advanced Tab Manager is a local-first Firefox WebExtension for high-scale tab organization. Firefox remains authoritative for live tabs, windows, and native tab groups; the extension reconstructs live state on demand and augments it with extension-owned organization metadata.

## Current source state

- Version: `0.1.3`
- Lifecycle: `source-candidate`
- Firefox add-on ID: `advanced-tab-manager@goreecloud.com`
- Minimum Firefox version: `139.0`
- Stable release: none
- Permissions: `sessions`, `storage`, `tabGroups`, `tabs`
- Host permissions: none
- Content scripts: none
- Private browsing: explicitly not allowed by manifest

The current source implements live window/tab/native-group synchronization, durable logical-ID trees, persistent Tab Sets, transactional tab stashing, safe restoration, exact-URL duplicate review with guarded cleanup, a persistent sidebar surface, a lightweight popup, and bounded tab actions.

Tree relationships remain keyed by logical tab identity rather than Firefox runtime tab IDs. Tab Sets and stashed items are stored locally in `storage.local` under an explicit versioned schema. Saved records contain only the minimum local restoration metadata required by the implemented features: safe URLs, titles, ordering, pin state, tree relationships, and native-group presentation metadata where applicable.

Tab Set capture excludes URLs the extension cannot safely recreate with Firefox extension APIs. The current restorable boundary is `http:`, `https:`, and `about:blank`; privileged or executable schemes are not captured for restoration.

Stashing is source-preserving: persist recovery state → verify persistence → close the live tab. If the close fails, the saved state is rolled back. Restoring a stash reverses the sequence: create the replacement tab → verify/update its supported metadata → remove the stored recovery record. If stored-state removal fails, the created replacement is removed as rollback.

Restoring a Tab Set creates a new Firefox window and reconstructs restorable tabs, supported native groups, pinning, tree relationships, and the captured active tab. The saved Tab Set remains stored after restoration so it can be reused or deleted explicitly.

Duplicate cleanup is review-first and exact-URL-only in 0.1.3. The sidebar presents each duplicate set before any destructive action, lets the user choose a tab to keep, and re-reads live Firefox state immediately before cleanup. Active, pinned, audible, hidden/private, tree-linked, and explicitly excluded tabs are never eligible for duplicate cleanup. If the reviewed keeper is stale or the set has changed, cleanup fails closed and requires a fresh review. Normalized URL matching remains unimplemented.

It does **not** yet implement tree drag-and-drop/bulk tree operations, normalized duplicate matching, durable protected-tab rules, snoozing, automatic organization rules, automatic discard policy, import/export, the full manager/settings interface, Webspaces integration, representative Firefox runtime acceptance, Mozilla signing, or Stable release acceptance.

## Development validation

```bash
python extensions/advanced-tab-manager/scripts/validate.py
node --test extensions/advanced-tab-manager/tests/*.test.mjs
python shared/scripts/validate_repository.py
python shared/scripts/package_extension.py advanced-tab-manager
```

Packaging produces a deterministic unsigned XPI under `dist/`. An unsigned package is not a Stable release.
