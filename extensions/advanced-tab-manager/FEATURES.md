# GoreeCloud Advanced Tab Manager — Features

## Implemented in source candidate 0.1.3

- Manifest V3 Firefox identity and canonical component directory.
- Non-persistent ES-module background event page.
- Cold-start-safe reconstruction from live Firefox windows, tabs, and native groups.
- Firefox session-backed logical tab IDs for extension-owned tab identity.
- Durable tree-parent metadata stored with Firefox session tab values so relationships can survive supported close/restore cycles without depending on runtime tab IDs.
- Automatic opener-to-child tree adoption for eligible normal-window tabs when no restored tree parent already exists.
- Tree reconciliation that treats unavailable/cross-window parents as orphaned live roots and breaks malformed cycles for presentation rather than fabricating browser state.
- Fail-closed cycle prevention for new manual reparent operations.
- Verified tree-parent persistence with rollback to the prior relationship when a write or readback verification fails.
- Persistent Tab Sets stored in local extension storage using a versioned, validated schema.
- Save-focused-window Tab Set capture that preserves safe URLs, titles, order, pinning, supported native-group presentation metadata, active-tab identity, and tree relationships through set-local identifiers.
- Reusable Tab Set restoration into a new Firefox window, including supported native groups, pinning, tree reconstruction, and active-tab restoration.
- Transactional stashing that persists and verifies local recovery metadata before closing the source tab and rolls back the saved record if the close fails.
- Transactional stash restoration that creates a live replacement before consuming the stored record and removes the replacement if stored-state removal fails.
- Explicit safe-restoration URL boundary: `http:`, `https:`, and `about:blank`; privileged/executable schemes are not stashed or captured for restoration.
- Serialized persistent operations so UI state reads do not observe half-completed save/stash transactions.
- User-controlled deletion for individual Tab Sets, individual stashed items, and all saved Tab Set/stash state without closing unrelated live Firefox tabs.
- Exact-URL duplicate review in the sidebar with user-selected keeper controls and explicit confirmation before cleanup.
- Conservative duplicate-cleanup policy that rechecks live Firefox state and excludes active, pinned, audible, hidden/private, tree-linked, and explicitly excluded tabs from destructive cleanup.
- Stale duplicate reviews fail closed when the selected keeper or duplicate set is no longer current.
- Sidebar tree view, native-group view, Duplicates view, and Saved Items view with accessible actions.
- Toolbar popup showing live and saved-state counts plus Save Focused Window.
- No host permissions, no content scripts, and private browsing explicitly disallowed by the manifest.
- Component validation, pure state/tree/storage/duplicate-policy tests, background integration tests, and deterministic repository packaging integration.

## Planned / not yet implemented

Tree drag-and-drop, branch bulk actions, normalized duplicate matching, durable protected-tab rules, snoozing, rules, automatic discard policy, session snapshots, import/export, command palette, full manager/settings UI, Webspaces integration, optional hidden-tab Focus Mode, representative Firefox runtime acceptance, signing, and Stable qualification remain future work.
