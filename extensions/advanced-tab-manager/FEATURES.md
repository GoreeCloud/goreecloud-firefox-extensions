# GoreeCloud Advanced Tab Manager — Features

## Implemented in source candidate 0.1.1

- Manifest V3 Firefox identity and canonical component directory.
- Non-persistent ES-module background event page.
- Cold-start-safe reconstruction from live Firefox windows, tabs, and native groups.
- Firefox session-backed logical tab IDs for extension-owned tab identity.
- Durable tree-parent metadata stored with Firefox session tab values so relationships can survive supported close/restore cycles without depending on runtime tab IDs.
- Automatic opener-to-child tree adoption for eligible normal-window tabs when no restored tree parent already exists.
- Tree reconciliation that treats unavailable/cross-window parents as orphaned live roots and breaks malformed cycles for presentation rather than fabricating browser state.
- Fail-closed cycle prevention for new manual reparent operations.
- Verified tree-parent persistence with rollback to the prior relationship when a write or readback verification fails.
- Sidebar tree view and native-group view, with indentation, relationship-state badges, attach-to-previous-tab, and remove-parent actions.
- Live listeners for tab, window, native-group, and session changes.
- Sidebar showing titles, URLs, native groups, pinned/audio/muted/discarded state, search, activation, close, and safe manual discard.
- Toolbar popup showing open-tab/group counts and exact duplicate counts, plus sidebar launch and status refresh.
- No host permissions, no content scripts, and private browsing explicitly disallowed by the manifest.
- Component validation, state/tree unit tests, and deterministic repository packaging integration.

## Planned / not yet implemented

Tree drag-and-drop, branch bulk actions, Tab Sets, stashing, snoozing, rules, normalized duplicate cleanup, automatic discard policy, session snapshots, import/export, command palette, full manager/settings UI, Webspaces integration, optional hidden-tab Focus Mode, representative Firefox runtime acceptance, signing, and Stable qualification remain future work.
