# Changelog

## 0.1.4 — Source candidate

- Added restart-safe one-shot tab snoozing backed by a separately versioned local recovery store.
- Added `alarms` as the only new permission for local wake scheduling; no host/content/private-browsing expansion.
- Added source-preserving snooze transaction: persist/verify recovery → create/verify alarm → close source.
- Added startup alarm reconstruction from persisted deadlines because Firefox alarms do not survive browser sessions.
- Added overdue startup grace and bounded retry after failed due restoration.
- Added due restore that creates a replacement before consuming recovery state and restores supported pin, native-group, and live tree-parent metadata.
- Added verified +1h deadline rescheduling with storage/alarm rollback behavior.
- Added Snooze 1 hour row action, Snoozed view, Open now, +1h delay, and popup/sidebar snoozed counts.
- Added deterministic snooze-store, alarm/deadline, transaction, and background-manager tests.
- Recurring snoozes, notifications, and richer arbitrary-date scheduling UI remain outside 0.1.4.

## 0.1.3 — Source candidate

- Added exact-URL duplicate review as a dedicated sidebar view.
- Added explicit user-selected keeper controls and confirmation before destructive duplicate cleanup.
- Added conservative cleanup exclusions for active, pinned, audible, hidden/private, tree-child, tree-parent, and explicitly excluded tabs.
- Added fresh-state background verification immediately before cleanup so stale duplicate sets or keeper selections fail closed.
- Added guarded batch tab closure using existing `tabs` authority with no new manifest permission.
- Kept normalized URL matching and durable protected-tab policy out of the 0.1.3 boundary for a later explicit policy milestone.
- Expanded deterministic tests with duplicate grouping, guard-reason, keeper-selection, cleanup-plan, stale-review, and background cleanup coverage.

## 0.1.2 — Source candidate

- Added versioned persistent Tab Set and stash state in Firefox `storage.local`.
- Added verified complete-record storage mutation with schema validation, revisioning, readback verification, and rollback.
- Added Save Focused Window as Tab Set, reusable restoration, transactional stashing/restoration, safe URL filtering, and saved-state UI.
- Added `storage` as the only new manifest permission; no host permissions, content scripts, or `unlimitedStorage` permission were added.

## 0.1.1 — Source candidate

- Added durable logical-ID tree relationships, reconciliation/cycle prevention, transactional session metadata persistence, and tree/native-group sidebar modes.

## 0.1.0 — Source candidate

- Established canonical identity, live Firefox reconciliation, logical IDs, initial sidebar/popup, tests, inventory, CI, and deterministic packaging.

No Stable release is declared.
