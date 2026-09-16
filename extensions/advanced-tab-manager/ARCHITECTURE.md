# GoreeCloud Advanced Tab Manager — Architecture

## Authority model

Firefox owns live browser state. Advanced Tab Manager owns only extension metadata, saved organizational/recovery intent, presentation, and requested browser operations.

## Runtime

The Manifest V3 background event page is non-persistent and treats every wake as a potential cold start. Live window/tab/native-group state is re-read from Firefox. Extension-owned saved state is separately validated from `storage.local`.

## Durable state layers

Eligible tabs use extension-owned logical IDs in Firefox session tab values. Parent relationships store the parent logical ID rather than a runtime tab ID. Fresh snapshots reconcile missing/cross-window parents and malformed cycles without fabricating browser state.

Tab Set/stash state, snooze state, and rule state use separate extension-owned records so one capability does not silently reinterpret another capability's persistent data. Verified-write paths preserve exact prior records for rollback where the operation contract supports it.

Firefox alarms are treated as ephemeral snooze wake signals, not durable truth; persisted snooze deadlines are authoritative and are reconstructed on event-page startup.

## Deterministic rule engine and bounded actions

`src/core/rule-state.js` owns the versioned rule schema and persistence contract. `src/core/rules.js` is a pure evaluator/action planner over locally available Firefox metadata. Private tabs are excluded, conditions are explainable, explicit priority controls ordering, and equal-priority differing action plans fail closed.

`src/background/rules.js` serializes rule CRUD/preview/apply operations. Apply now is explicitly user-triggered and revalidates a fresh plan before bounded pin/unpin, mute/unmute, or discard mutations. It does not close, navigate, or create tabs.

## Command-palette foundation

`src/core/commands.js` is a pure command catalog and deterministic search layer. It has no browser API dependency and exposes only bounded command descriptors/actions.

`src/sidebar/command-palette.js` renders the keyboard-first palette and routes execution through existing sidebar controls rather than calling Firefox APIs directly. This preserves one browser-authority path for existing operations while allowing `Ctrl/⌘+K`, keyboard traversal, Enter execution, Escape close, and pointer activation.

The 0.1.7 palette is intentionally limited to view navigation, local search focus, refresh, and focused-window Tab Set capture. It does not introduce automatic browser mutation or a generalized command dispatcher.

## Source modules

- `src/core/state.js` — live browser normalization.
- `src/core/tree.js`, `tree-session.js` — durable tree reconciliation/persistence.
- `src/core/persistent-state.js`, `tab-sets.js`, `stash-transaction.js` — Tab Set/stash persistence and source-preserving transactions.
- `src/core/duplicates.js` — exact duplicate review/cleanup planning.
- `src/core/snooze-store.js`, `snooze.js`, `snooze-transaction.js` — restart-safe snooze recovery and transactions.
- `src/core/rule-state.js`, `rules.js` — rule persistence, deterministic evaluation, explanation, and action planning.
- `src/core/commands.js` — pure command catalog/search/lookup.
- `src/background/browser-state.js` — live Firefox/session state.
- `src/background/saved-state.js` — Tab Set/stash operations.
- `src/background/duplicate-cleanup.js` — fresh-state guarded duplicate mutation.
- `src/background/snooze.js` — snooze operations, due restore, retries, and restart alarm reconstruction.
- `src/background/rules.js` — serialized rule CRUD, preview, and explicit apply.
- `src/background/background.js` — event registration and message routing.
- `src/sidebar/` — Tree, Groups, Duplicates, Saved Items, Snoozed, Rules, and command-palette surfaces.
- `src/popup/` — fast counts and focused-window capture.
- `tests/` — deterministic state, transaction, policy, evaluation, command-search, and background integration tests.

## Next architecture layers

Full manager/settings UI, import/export, large-session qualification, richer command actions, event-driven automatic rule application, richer arbitrary-date/recurring snooze UX, tree branch operations, conservative normalized duplicate policy/protected-tab rules, automatic discard policy, and optional integrations remain future work behind explicit source-preserving transitions and acceptance evidence.
