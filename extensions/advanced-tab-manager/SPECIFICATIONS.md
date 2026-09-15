# GoreeCloud Advanced Tab Manager — Repository Specifications

This repository document describes the implemented source boundary for version `0.1.2`. The broader product direction is governed by the canonical Drive project specification.

## Implemented source contract

- Firefox Manifest V3 extension.
- Add-on ID `advanced-tab-manager@goreecloud.com`.
- Firefox 139+ baseline because the `tabGroups` API became available in Firefox 139.
- Non-persistent Firefox background scripts loaded as ES modules.
- `tabs`, `tabGroups`, `sessions`, and `storage` permissions only.
- `storage` is used for extension-owned persistent Tab Set and stash state. No `unlimitedStorage` permission is requested.
- No host permissions, content scripts, remote telemetry, or page-content inspection.
- Firefox is authoritative for whether tabs, windows, and native groups exist.
- Every live UI snapshot is reconstructed from Firefox APIs rather than trusted from a durable mirror.
- Extension-owned logical tab IDs and tree-parent relationships use Firefox session tab values rather than persisted runtime Firefox tab IDs.
- Persistent Tab Set/stash state uses a versioned schema in `storage.local` and fails closed on unsupported/corrupt schema rather than silently replacing it.
- Tab Sets store set-local item/group identities; they do not persist Firefox runtime tab IDs or runtime group IDs.
- Save-focused-window capture includes only URLs that current extension APIs can safely recreate: `http:`, `https:`, and `about:blank`.
- Stashing follows persist → readback verify → close source. Close failure attempts to restore the exact previous persistent-state record.
- Stash restore follows create replacement → apply supported metadata → remove stored record. Stored-state removal failure attempts to remove the newly created replacement.
- Restoring a Tab Set leaves the saved Tab Set intact and creates a new Firefox window containing the captured restorable state.
- Native groups are reconstructed from set-local group descriptors for unpinned restored tabs; pin state is applied after grouping because Firefox grouping can unpin tabs.
- Tree relationships are reconstructed from set-local item IDs after restored runtime tabs exist.
- Persistent operations are serialized so dashboard/saved-state reads wait for in-flight save/stash transactions.
- User deletion operations can remove individual or all extension-owned Tab Set/stash records without deleting unrelated live browser state.
- UI actions remain bounded to Firefox-supported operations and extension-owned metadata changes.

## Release boundary

`0.1.2` is a source candidate. Source tests, CI, deterministic packaging, or merge do not establish representative Firefox runtime acceptance, Mozilla signing, signed-XPI acceptance, or Stable qualification.
