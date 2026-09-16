# Changelog

## 0.1.6 — Source candidate

- Added a bounded rule-action vocabulary: `pin`, `unpin`, `mute`, `unmute`, and `discard`.
- Kept rule-state schema version 1 compatible with existing 0.1.5 rules; rules without an `actions` field remain valid and preview-only until explicitly updated.
- Added validation that rejects unsupported, duplicate, and contradictory rule actions.
- Added deterministic action planning in which the highest matching priority controls each tab and differing equal-priority action plans fail closed as explicit conflicts.
- Expanded rule preview to report actionable targets and conflicts without browser mutation.
- Added explicit **Apply now** execution only after two independently reconstructed live Firefox snapshots produce the same conflict-free plan.
- Added a final live tab read before each target mutation and fail-closed handling for missing/private/window-moved targets.
- Added only bounded pin/mute updates and tab discard as rule mutations; no rule path closes, navigates, or creates tabs.
- Added a Rules sidebar view with engine enable/disable, bounded hostname-rule creation, per-rule enable/disable/delete, preview, conflict visibility, and explicit Apply now confirmation.
- Added focused tests for action validation, deterministic planning, equal-priority conflicts, two-snapshot drift rejection, explicit mutation, and legacy rule-state compatibility.
- Expanded source validation to enforce the 0.1.6 mutation boundary and unchanged permission/privacy posture.
- Added no new manifest permission; the existing `alarms`, `sessions`, `storage`, `tabGroups`, and `tabs` boundary remains unchanged.
- Event-driven automatic rule application, richer rule editing, representative Firefox runtime acceptance, signing, and Stable qualification remain outside this source-candidate milestone.

## 0.1.5 — Source candidate

- Added a separately versioned local rule-state record with strict validation, revisioning, readback verification, and exact previous-record rollback on failed persistence.
- Added global rule-engine enable/disable state defaulting disabled plus per-rule enabled state.
- Added bounded rule definitions with stable IDs, names, explicit integer priority, timestamps, and one-to-eight conditions.
- Added deterministic local metadata matching for hostname, title, URL, native-group title, pinned, audible, muted, discarded, and tree-child state.
- Added explainable per-condition expected/observed/matched results and deterministic higher-priority-first evaluation with stable rule-ID tie ordering.
- Added fresh-snapshot rule preview routing plus create/update/delete/read operations.
- Kept 0.1.5 preview-only: no automatic browser mutation, rule-action executor, rule-management UI, command palette, or full manager is claimed.
- Added no new manifest permission; the existing `alarms`, `sessions`, `storage`, `tabGroups`, and `tabs` boundary remains unchanged.
- Added deterministic rule-state, evaluator, and background-manager tests.

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
