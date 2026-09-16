# Changelog

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
- Added Save Focused Window as Tab Set with safe-URL filtering and set-local group/tree identities.
- Added reusable Tab Set restoration into a new Firefox window with supported group, pin, tree, and active-tab reconstruction.
- Added transactional tab stashing that persists recovery state before closing the source tab and restores prior persistent state if close fails.
- Added transactional stash restoration that creates a replacement before consuming stored state and rolls the replacement back if storage consumption fails.
- Added conservative restoration URL allowlist for `http:`, `https:`, and `about:blank`.
- Added serialized persistent operations and consistent dashboard reads.
- Added Saved Items sidebar controls, individual deletion, and clear-all saved-state control.
- Added focused-window Tab Set capture to the popup and saved-state counts to popup/sidebar summaries.
- Added `storage` as the only new manifest permission; no host permissions, content scripts, or `unlimitedStorage` permission were added.
- Expanded deterministic tests with persistent-state, Tab Set, stash transaction, and background message-flow coverage.

## 0.1.1 — Source candidate

- Added durable parent/child tree relationships using Firefox session tab values keyed by logical tab identity.
- Added restoration-safe tree reconstruction that does not depend on Firefox runtime tab IDs.
- Added opener-based child adoption without overwriting restored parent metadata.
- Added orphan and malformed-cycle reconciliation without fabricating live browser state.
- Added fail-closed cycle prevention for new reparent operations.
- Added transactional tree-parent persistence with readback verification and rollback.
- Added tree/native-group sidebar modes with indentation, relationship-state badges, attach-to-previous-tab, and detach actions.
- Expanded pure-state and transactional tests for tree restoration, orphan/cycle behavior, and rollback.

## 0.1.0 — Source candidate

- Established the canonical Advanced Tab Manager extension directory and Firefox identity.
- Added non-persistent Manifest V3 background architecture with live Firefox reconciliation.
- Added logical tab IDs through Firefox session tab values.
- Added live tab/window/native-group event invalidation.
- Added the first sidebar and popup surfaces.
- Added exact duplicate counting and bounded tab actions.
- Added component validation, unit tests, inventory registration, CI, and deterministic packaging integration.

No Stable release is declared.
