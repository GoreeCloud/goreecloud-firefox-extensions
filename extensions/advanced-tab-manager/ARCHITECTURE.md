# GoreeCloud Advanced Tab Manager — Architecture

## Authority model

Firefox owns live browser state. Advanced Tab Manager owns only extension metadata, saved organizational/recovery intent, presentation, and explicitly requested browser operations.

The Manager does not become a second browser-state authority. It reads established background interfaces, manages extension-owned local records, and presents privacy-minimized diagnostics.

## Runtime and durable state

The Manifest V3 background event page is non-persistent and treats every wake as a potential cold start. Live window/tab/native-group state is re-read from Firefox. Extension-owned saved state is independently validated from `storage.local`.

Eligible tabs use extension-owned logical IDs in Firefox session tab values. Parent relationships store logical identity rather than runtime tab IDs. Organizational state contains Tab Sets, stashed items, bounded session snapshots, and snapshot-retention configuration. Snooze and rule state remain separate versioned records. Firefox alarms are ephemeral snooze wake signals; persisted deadlines are authoritative.

Session snapshots are recovery records, not a replacement Firefox session engine. Capture derives from a fresh Firefox snapshot, filters private and unsupported URLs through the existing restorable-URL boundary, and stores window/group/tree/pin/active metadata needed for supported reconstruction. Restore is additive into newly created windows. Failure attempts rollback of all windows created by that restore while preserving the saved snapshot.

## Rule and command layers

`src/core/rule-state.js` owns rule persistence. `src/core/rules.js` performs deterministic local evaluation/action planning. `src/background/rules.js` serializes CRUD/preview/apply operations; Apply now revalidates live state before bounded mutation.

`src/core/commands.js` is a browser-API-independent command catalog/search layer. `src/sidebar/command-palette.js` renders the palette and routes execution through existing sidebar controls.

## Manager, portability, and snapshot layers — 0.1.10 functional baseline carried into 0.1.11

`src/core/manager-model.js` produces a privacy-minimized diagnostic projection from dashboard/snooze/rule responses plus manifest metadata. Snapshot presentation is limited to snapshot ID, capture time, window count, and tab count; it does not expose saved URLs or titles.

`src/background/manager.js` composes established read paths and fails soft per store. A local-store read exception becomes `available: false`; other diagnostics remain usable.

`src/manager/manager.*` is the full-window presentation surface. It exposes diagnostics, explicit local backup/export/import, retained session-snapshot capture/restore/delete, and bounded snapshot-retention configuration. Destructive state changes require explicit user actions.

`src/core/portability.js` owns the backup envelope, canonical hashing/integrity verification, and privacy-minimized import preview model. `src/background/portability.js` owns serialized cross-store export/preview/apply transactions, fresh revision checks, readback verification, rollback, and snooze-alarm reconciliation. Session snapshots travel inside the validated organizational record; no separate unvalidated backup channel is introduced.

`src/core/session-snapshots.js` owns pure snapshot capture, retention normalization, trimming, and count helpers. `src/background/saved-state.js` serializes snapshot persistence and additive restore beside existing Tab Set/stash operations.

## Source modules

- `src/core/state.js` — live browser normalization.
- `src/core/tree.js`, `tree-session.js` — durable tree reconciliation/persistence.
- `src/core/persistent-state.js`, `tab-sets.js`, `stash-transaction.js` — organizational persistence and source-preserving Tab Set/stash transactions.
- `src/core/session-snapshots.js` — retained local session-snapshot capture and retention logic.
- `src/core/duplicates.js` — exact duplicate review/cleanup planning.
- `src/core/snooze-store.js`, `snooze.js`, `snooze-transaction.js` — restart-safe snooze recovery and transactions.
- `src/core/rule-state.js`, `rules.js` — rule persistence, deterministic evaluation, explanation, and action planning.
- `src/core/commands.js` — pure command catalog/search/lookup.
- `src/core/manager-model.js` — privacy-minimized manager aggregation.
- `src/core/portability.js` — versioned backup envelope, integrity verification, and import preview.
- `src/background/browser-state.js` — live Firefox/session state.
- `src/background/saved-state.js` — Tab Set, stash, snapshot, and retention operations.
- `src/background/duplicate-cleanup.js` — fresh-state guarded duplicate mutation.
- `src/background/snooze.js` — snooze operations, due restore, retries, and restart alarm reconstruction.
- `src/background/rules.js` — serialized rule CRUD, preview, and explicit apply.
- `src/background/manager.js` — bounded manager-state composition.
- `src/background/portability.js` — serialized local export/import validation and cross-store replacement transaction.
- `src/background/background.js` — event registration and message routing.
- `src/sidebar/` — operational sidebar and command palette.
- `src/popup/` — fast counts, focused-window capture, and manager/sidebar entry points.
- `src/manager/` — diagnostics, portability, snapshot, and bounded settings controls.
- `scripts/large-session-qualification.mjs` — deterministic 100/500/1,000-tab core-scale measurement.
- `tests/` — deterministic state, transaction, policy, manager, portability, snapshot, and background integration tests.

## Release qualification layer — 0.1.11

`scripts/glaze_consumer_qualification.py` validates the applicable GLAZE UI 1.5.1 browser-surface contract and emits exact-revision evidence without inheriting shared performance or posture claims.

`scripts/stable_security_review.py` validates the exact candidate manifest/runtime/XPI and scans full Advanced Tab Manager Git history for recognized secret patterns. The dedicated release-qualification workflow uses a non-shallow checkout, proves deterministic package bytes, and retains candidate digest, Glaze evidence, security evidence, and large-session evidence.

These release tools are maintenance-only and are excluded from the packaged XPI.

## Qualification boundary

The CI core-scale harness measures deterministic capture and manager aggregation over synthetic 100/500/1,000-tab fixtures and produces candidate evidence. It does not establish representative Firefox rendering, interaction latency, accessibility, actual browser-restart recovery, or device/runtime performance.

## Next architecture layers

Broader manager/settings workflows, richer command actions, event-driven automatic rule application, richer snooze UX, tree branch operations, conservative normalized duplicate/protected-tab policy, automatic discard policy, optional integrations, representative Firefox runtime/accessibility/rendered-scale acceptance, and release qualification remain future work behind explicit source-preserving transitions and exact-candidate evidence.
