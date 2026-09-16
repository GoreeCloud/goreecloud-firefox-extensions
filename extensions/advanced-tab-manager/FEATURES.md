# GoreeCloud Advanced Tab Manager — Features

## Implemented in source candidate 0.1.6

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
- Independently versioned local rule state with exact readback verification and rollback on persistence failure.
- Rule engine globally disabled by default plus per-rule enable/disable controls.
- Bounded rule definitions with stable IDs, explicit priority, timestamps, one-to-eight local metadata conditions, and optional bounded actions.
- Deterministic all-condition evaluation over fresh Firefox snapshots using hostname, title, URL, native-group title, pinned, audible, muted, discarded, and tree-child metadata.
- Explainable rule matches with per-condition expected/observed values and deterministic priority/tie ordering.
- Rule action vocabulary restricted to `pin`, `unpin`, `mute`, `unmute`, and `discard`; contradictory or unsupported action definitions fail closed.
- Deterministic highest-priority action planning with explicit equal-priority conflict rejection.
- Preview-only rule evaluation remains available and does not mutate Firefox.
- Explicit **Apply now** rule execution with two-snapshot plan confirmation, per-target live tab recheck, no tab close/navigation, and no manifest-permission expansion.
- Rules sidebar view with engine enable/disable, bounded hostname-rule creation, rule enable/disable/delete controls, preview, conflict visibility, and explicit Apply now confirmation.
- Sidebar Tree, Native Groups, Duplicates, Saved Items, Snoozed, and Rules views.
- Snooze 1 hour, Open now, and +1h delay controls.
- Toolbar popup counts for open tabs, native groups, tree children, Tab Sets, stashed items, snoozed items, and exact duplicates.
- No host permissions, no content scripts, no telemetry, no remote synchronization, and private browsing disabled.
- Deterministic component validation, unit/integration tests, and repository packaging integration.

## Planned / not yet implemented

Tree drag-and-drop and branch bulk actions, normalized duplicate matching, durable protected-tab rules, richer arbitrary-date snooze scheduling UI, recurring snoozes, event-driven automatic rule application, richer rule editing, automatic discard policy, session snapshots, import/export, command palette, full manager/settings UI, Webspaces integration, optional hidden-tab Focus Mode, large-session qualification, representative Firefox runtime acceptance, signing, and Stable qualification remain future work.
