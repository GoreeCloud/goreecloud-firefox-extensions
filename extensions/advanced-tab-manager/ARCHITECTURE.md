# GoreeCloud Advanced Tab Manager — Architecture

## Authority model

Firefox owns live browser state. Advanced Tab Manager owns only extension metadata, saved organizational/recovery intent, presentation, and requested browser operations.

The manager does not become a second state authority. It reads established background interfaces and presents a privacy-minimized diagnostic projection.

## Runtime and durable state

The Manifest V3 background event page is non-persistent and treats every wake as a potential cold start. Live window/tab/native-group state is re-read from Firefox. Extension-owned saved state is independently validated from `storage.local`.

Eligible tabs use extension-owned logical IDs in Firefox session tab values. Parent relationships store logical identity rather than runtime tab IDs. Tab Set/stash, snooze, and rule state use separate versioned records. Firefox alarms are ephemeral snooze wake signals; persisted deadlines are authoritative.

## Rule and command layers

`src/core/rule-state.js` owns rule persistence. `src/core/rules.js` performs deterministic local evaluation/action planning. `src/background/rules.js` serializes CRUD/preview/apply operations; Apply now revalidates live state before bounded mutation.

`src/core/commands.js` is a browser-API-independent command catalog/search layer. `src/sidebar/command-palette.js` renders the palette and routes execution through existing sidebar controls.

## Manager and portability layers — 0.1.9

`src/core/manager-model.js` produces a privacy-minimized immutable-style diagnostic projection from existing dashboard/snooze/rule responses plus manifest metadata. It returns counts and health metadata rather than user browsing content.

`src/background/manager.js` composes the three existing read paths and fails soft per store. A local-store read exception becomes `available: false`; other diagnostics remain usable.

`src/background/background.js` exposes one new read-only message route: `atm:get-manager-state`.

`src/manager/manager.*` is a full-window presentation surface. Its diagnostics remain privacy-minimized. Version 0.1.9 adds explicit local backup export and previewed replacement import controls; the import path mutates only extension-owned local stores and does not directly mutate live Firefox tabs.

Sidebar and popup entry points open the extension-owned manager page. The command palette triggers the established sidebar manager button, preserving its no-direct-browser-API command boundary.

`src/core/portability.js` owns the backup envelope, canonical hashing/integrity verification, and privacy-minimized import preview model. `src/background/portability.js` owns serialized cross-store export/preview/apply transactions, fresh revision checks, readback verification, rollback, and snooze-alarm reconciliation. The portability background has no live-tab mutation API authority.

`src/core/portability.js` owns the backup envelope, canonical hashing/integrity verification, and privacy-minimized import preview model. `src/background/portability.js` owns serialized cross-store export/preview/apply transactions, fresh revision checks, readback verification, rollback, and snooze-alarm reconciliation. The portability background has no live-tab mutation API authority.

## Source modules

- `src/core/state.js` — live browser normalization.
- `src/core/tree.js`, `tree-session.js` — durable tree reconciliation/persistence.
- `src/core/persistent-state.js`, `tab-sets.js`, `stash-transaction.js` — Tab Set/stash persistence and source-preserving transactions.
- `src/core/duplicates.js` — exact duplicate review/cleanup planning.
- `src/core/snooze-store.js`, `snooze.js`, `snooze-transaction.js` — restart-safe snooze recovery and transactions.
- `src/core/rule-state.js`, `rules.js` — rule persistence, deterministic evaluation, explanation, and action planning.
- `src/core/commands.js` — pure command catalog/search/lookup.
- `src/core/manager-model.js` — privacy-minimized manager aggregation.
- `src/core/portability.js` — versioned backup envelope, integrity verification, and import preview.
- `src/core/portability.js` — versioned backup envelope, integrity verification, and import preview.
- `src/background/browser-state.js` — live Firefox/session state.
- `src/background/saved-state.js` — Tab Set/stash operations.
- `src/background/duplicate-cleanup.js` — fresh-state guarded duplicate mutation.
- `src/background/snooze.js` — snooze operations, due restore, retries, and restart alarm reconstruction.
- `src/background/rules.js` — serialized rule CRUD, preview, and explicit apply.
- `src/background/manager.js` — bounded manager-state composition.
- `src/background/portability.js` — serialized local export/import validation and cross-store replacement transaction.
- `src/background/portability.js` — serialized local export/import validation and cross-store replacement transaction.
- `src/background/background.js` — event registration and message routing.
- `src/sidebar/` — operational sidebar and command palette.
- `src/popup/` — fast counts, focused-window capture, and manager/sidebar entry points.
- `src/manager/` — full-window diagnostics plus explicit local backup/export/import controls.
- `tests/` — deterministic state, transaction, policy, evaluation, command, manager-model, and background integration tests.

## Next architecture layers

Broader manager/settings mutation workflows, local session snapshots, large-session qualification, richer command actions, event-driven automatic rule application, richer snooze UX, tree branch operations, conservative normalized duplicate/protected-tab policy, automatic discard policy, and optional integrations remain future work behind explicit source-preserving transitions and acceptance evidence.
