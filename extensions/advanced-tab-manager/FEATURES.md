# GoreeCloud Advanced Tab Manager — Features

## Implemented in source candidate 0.1.7

- Manifest V3 Firefox identity and canonical component directory.
- Non-persistent ES-module background event page with cold-start live-state reconstruction.
- Firefox session-backed logical tab IDs and durable tree-parent metadata with cycle/orphan reconciliation and verified rollback-aware persistence.
- Persistent reusable Tab Sets and transactional stashing in versioned `storage.local` state.
- Safe restoration boundary limited to `http:`, `https:`, and `about:blank`.
- Exact-URL duplicate review with user-selected keeper, explicit confirmation, fresh-state recheck, and conservative cleanup guards.
- Restart-safe one-shot snoozing with separately versioned local recovery records and startup alarm reconstruction.
- Independently versioned local rule state with verified write/readback/rollback behavior.
- Deterministic local rule evaluation with explainable condition matches, explicit priority, stable ties, private-tab exclusion, and bounded explicit actions.
- Rule action vocabulary restricted to `pin`, `unpin`, `mute`, `unmute`, and `discard`, with equal-priority conflict rejection and explicit **Apply now** fresh-state rechecks.
- Rules sidebar view with engine enable/disable, bounded hostname-rule creation, rule enable/disable/delete controls, preview, conflict visibility, and explicit Apply now confirmation.
- Keyboard-first command-palette foundation with nine bounded commands for sidebar view navigation, local search focus, state refresh, and focused-window Tab Set capture.
- Deterministic multi-token command matching with stable ranking and fail-closed exact command lookup.
- Command-palette keyboard handling for `Ctrl/⌘+K`, Arrow Up/Down, Enter, and Escape plus pointer selection.
- Command palette routes through established sidebar controls and introduces no direct browser-API authority or new manifest permission.
- Command overlay includes Reduced Transparency and Forced Colors fallbacks.
- Sidebar Tree, Native Groups, Duplicates, Saved Items, Snoozed, and Rules views.
- Toolbar popup counts for open tabs, native groups, tree children, Tab Sets, stashed items, snoozed items, and exact duplicates.
- No host permissions, no content scripts, no telemetry, no remote synchronization, and private browsing disabled.
- Deterministic component validation, unit/integration tests, and repository packaging integration.

## Planned / not yet implemented

Tree drag-and-drop and branch bulk actions, normalized duplicate matching, durable protected-tab rules, richer arbitrary-date snooze scheduling UI, recurring snoozes, event-driven automatic rule application, richer rule editing, automatic discard policy, session snapshots, import/export, richer command actions, full manager/settings UI, Webspaces integration, optional hidden-tab Focus Mode, large-session qualification, representative Firefox runtime acceptance, signing, and Stable qualification remain future work.
