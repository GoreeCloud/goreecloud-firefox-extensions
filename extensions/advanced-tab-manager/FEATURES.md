# GoreeCloud Advanced Tab Manager — Features

## Implemented in source candidate 0.1.4

- Manifest V3 Firefox identity and canonical component directory.
- Non-persistent ES-module background event page with cold-start live-state reconstruction.
- Firefox session-backed logical tab IDs and durable tree-parent metadata with cycle/orphan reconciliation and verified rollback-aware persistence.
- Persistent reusable Tab Sets and transactional stashing in versioned `storage.local` state.
- Safe restoration boundary limited to `http:`, `https:`, and `about:blank`.
- Exact-URL duplicate review with user-selected keeper, explicit confirmation, fresh-state recheck, and conservative cleanup guards.
- Restart-safe one-shot snoozing with separately versioned local recovery records.
- Snooze source-preserving transaction: verified recovery persistence → verified Firefox alarm → source tab close.
- Startup alarm reconstruction from persisted deadlines because Firefox alarms do not survive browser sessions.
- Overdue startup grace and bounded retry after failed due restoration.
- Due restoration that creates a replacement before consuming recovery state and restores supported pin, native-group, and live tree-parent metadata.
- Snooze deadline rescheduling with verified storage mutation and alarm replacement rollback.
- Sidebar Tree, Native Groups, Duplicates, Saved Items, and Snoozed views.
- Snooze 1 hour, Open now, and +1h delay controls.
- Toolbar popup counts for open tabs, native groups, tree children, Tab Sets, stashed items, snoozed items, and exact duplicates.
- No host permissions, no content scripts, no telemetry, no remote synchronization, and private browsing disabled.
- Deterministic component validation, unit/integration tests, and repository packaging integration.

## Planned / not yet implemented

Tree drag-and-drop and branch bulk actions, normalized duplicate matching, durable protected-tab rules, richer arbitrary-date snooze scheduling UI, recurring snoozes, automatic organization rules, automatic discard policy, session snapshots, import/export, command palette, full manager/settings UI, Webspaces integration, optional hidden-tab Focus Mode, representative Firefox runtime acceptance, signing, and Stable qualification remain future work.
