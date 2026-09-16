# GoreeCloud Advanced Tab Manager — Architecture

## Authority model

Firefox owns live browser state. Advanced Tab Manager owns only extension metadata, saved organizational/recovery intent, presentation, and requested browser operations.

## Runtime

The Manifest V3 background event page is non-persistent and treats every wake as a potential cold start. Live window/tab/native-group state is re-read from Firefox. Extension-owned saved state is separately validated from `storage.local`.

## Durable tree model

Eligible tabs use extension-owned logical IDs in Firefox session tab values. Parent relationships store the parent logical ID rather than a runtime tab ID. Fresh snapshots reconcile missing/cross-window parents and malformed cycles without fabricating browser state.

## Persistent Tab Set/stash state

`src/core/persistent-state.js` retains the existing version-1 Tab Set/stash schema. Its verified mutation contract remains read previous → mutate copy → validate → write → readback verify → exact previous-record rollback on failure.

## Restart-safe snooze state

Snoozing deliberately uses a separate record owned by `src/core/snooze-store.js`. Firefox alarms are treated as ephemeral wake signals, not durable truth. The persisted `wakeAt` value is authoritative, and `src/background/snooze.js` reconstructs alarms from storage whenever the event page starts.

## Deterministic rule-engine foundation

Rules use a third independent record owned by `src/core/rule-state.js`:

```text
schemaVersion: 1
revision: integer
enabled: boolean
rules: [
  id, name, enabled, priority, createdAt, updatedAt,
  conditions: [field, operator, value]
]
```

The rule store is globally disabled by default and uses the same source-preserving verified-write pattern as other durable extension-owned state. Invalid or unsupported state fails closed instead of being guessed or migrated implicitly.

`src/core/rules.js` is a pure evaluator. It accepts validated rule state plus a fresh normalized Firefox snapshot and can inspect only locally available tab metadata: hostname, title, URL, native-group title, pinned/audible/muted/discarded state, and whether a durable tree parent is present. It does not inspect webpage contents, cookies, forms, network requests, or remote data.

Rules use explicit integer priority, deterministic rule-ID tie ordering, and all-condition matching. Every successful match includes per-condition expected/observed/matched data for explainability. Private/incognito tabs are excluded.

`src/background/rules.js` serializes rule storage operations and exposes rule-state CRUD plus preview evaluation. Preview always obtains a fresh Firefox snapshot. Version 0.1.5 contains no rule-action executor and the rule manager does not mutate live tabs; this keeps the first ATM-008 slice observational and independently reviewable before action semantics and user-facing management are designed.

## Source modules

- `src/core/state.js` — live browser normalization.
- `src/core/tree.js`, `tree-session.js` — durable tree reconciliation/persistence.
- `src/core/persistent-state.js`, `tab-sets.js`, `stash-transaction.js` — Tab Set/stash persistence and source-preserving transactions.
- `src/core/duplicates.js` — exact duplicate review/cleanup planning.
- `src/core/snooze-store.js`, `snooze.js`, `snooze-transaction.js` — restart-safe snooze recovery and transactions.
- `src/core/rule-state.js` — versioned rule schema, verified persistence, rollback.
- `src/core/rules.js` — pure deterministic local metadata evaluation and explanation.
- `src/background/browser-state.js` — live Firefox/session state.
- `src/background/saved-state.js` — Tab Set/stash operations.
- `src/background/duplicate-cleanup.js` — fresh-state guarded duplicate mutation.
- `src/background/snooze.js` — snooze operations, due restore, retries, and restart alarm reconstruction.
- `src/background/rules.js` — serialized rule CRUD and preview evaluation.
- `src/background/background.js` — event registration and message routing.
- `src/sidebar/` — Tree, Groups, Duplicates, Saved Items, and Snoozed surfaces.
- `src/popup/` — fast counts and focused-window capture.
- `tests/` — deterministic state, transaction, policy, evaluation, and background integration tests.

## Next architecture layers

Rule-action execution and rule-management UI require a separate mutation-safety/UX boundary. Command palette, full manager, import/export, large-session qualification, richer arbitrary-date/recurring snooze UX, tree branch operations, conservative normalized duplicate policy/protected-tab rules, automatic discard policy, and optional integrations remain future work behind explicit source-preserving transitions and acceptance evidence.
