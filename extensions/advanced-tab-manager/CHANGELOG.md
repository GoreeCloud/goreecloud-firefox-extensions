# Changelog

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
