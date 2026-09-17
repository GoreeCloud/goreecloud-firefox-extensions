# GoreeCloud Advanced Tab Manager — Features

## Implemented in source candidate 0.1.8

- Firefox Manifest V3 identity, canonical component directory, Firefox 139+ baseline, and deterministic packaging integration.
- Non-persistent ES-module background event page with cold-start Firefox state reconstruction.
- Firefox session-backed logical tab IDs and durable tree-parent metadata with cycle/orphan reconciliation and verified rollback-aware persistence.
- Persistent reusable Tab Sets and transactional stashing in versioned `storage.local` state.
- Safe restoration boundary limited to `http:`, `https:`, and `about:blank`.
- Exact-URL duplicate review with user-selected keeper, explicit confirmation, fresh-state recheck, and conservative cleanup guards.
- Restart-safe one-shot snoozing with separately versioned local recovery records and startup alarm reconstruction.
- Independently versioned local rule state with verified write/readback/rollback behavior.
- Deterministic local rule evaluation with explicit priority, stable ties, explainable condition matches, private-tab exclusion, bounded explicit actions, conflict rejection, and user-triggered Apply now rechecks.
- Rules sidebar view with engine enable/disable, bounded rule creation, rule enable/disable/delete, preview, conflict visibility, and Apply now confirmation.
- Keyboard-first command palette with deterministic local search and bounded view/search/refresh/Tab Set/manager routing.
- ATM-008C read-only full-window Manager/diagnostics foundation.
- Manager aggregation limited to counts, source/lifecycle metadata, store availability/schema/revisions, and manifest permission posture; tab titles/URLs, saved URLs, rule contents, and browsing history are not included in the manager model.
- Degraded manager rendering when one local store is unavailable.
- Manager entry points from sidebar, toolbar popup, and command palette.
- Reduced Transparency and Forced Colors fallbacks across the bounded manager/command surfaces.
- No host permissions, no content scripts, no telemetry, no remote synchronization, and private browsing disabled.

## Planned / not yet implemented

Tree drag-and-drop and branch bulk actions, normalized duplicate matching, durable protected-tab rules, richer arbitrary-date/recurring snoozing, event-driven automatic rule application, richer rule editing, automatic discard policy, session snapshots, import/export, richer command actions, full manager mutation/settings workflows, Webspaces integration, optional hidden-tab Focus Mode, large-session qualification, representative Firefox runtime/accessibility acceptance, Mozilla signing, signed-XPI acceptance, production release, and Stable qualification remain future work.
