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

Snoozing deliberately uses a separate record owned by `src/core/snooze-store.js`:

```text
schemaVersion: 1
revision: integer
items: [
  id, url, title, pinned, createdAt, wakeAt,
  treeParentLogicalId, nativeGroup
]
```

This separation prevents a snooze release from silently migrating or reinterpreting the established Tab Set/stash schema.

Firefox alarms are treated as ephemeral wake signals, not durable truth. The persisted `wakeAt` value is authoritative. `src/background/snooze.js` reconstructs alarms from storage whenever the event page starts and clears stale ATM snooze alarms with no corresponding recovery item.

### Snooze transaction

**prepare → persist/readback verify recovery record → create/readback verify alarm → close source tab.**

If scheduling or verification fails, the candidate alarm is cleared best-effort and prior storage is restored. If source closure fails, the alarm is cleared and prior storage is restored.

### Restore transaction

**read persisted recovery item → create replacement → restore supported metadata → remove/readback verify recovery record → clear alarm.**

If recovery-record consumption fails, the created replacement is removed so the persistent record remains the single recovery source. A failed due restore keeps the item and schedules a bounded retry.

### Restart and overdue handling

Because Firefox alarms do not survive browser sessions, startup reconciliation recreates every expected alarm. Future deadlines use their persisted absolute `wakeAt`. Already-due items receive a small startup grace so the browser can establish a usable normal window before restore is attempted.

### Rescheduling

A reschedule first commits/verifies the new `wakeAt`, then replaces and verifies the named one-shot alarm. If alarm replacement fails, storage is rolled back and the prior deadline alarm is recreated when possible.

## Source modules

- `src/core/state.js` — live browser normalization.
- `src/core/tree.js`, `tree-session.js` — durable tree reconciliation/persistence.
- `src/core/persistent-state.js`, `tab-sets.js`, `stash-transaction.js` — Tab Set/stash persistence and source-preserving transactions.
- `src/core/duplicates.js` — exact duplicate review/cleanup planning.
- `src/core/snooze-store.js` — versioned snooze recovery schema and verified mutation.
- `src/core/snooze.js` — snooze metadata preparation, alarm naming, retry/grace timing.
- `src/core/snooze-transaction.js` — persist/schedule/verify/close transaction.
- `src/background/browser-state.js` — live Firefox/session state.
- `src/background/saved-state.js` — Tab Set/stash operations.
- `src/background/duplicate-cleanup.js` — fresh-state guarded duplicate mutation.
- `src/background/snooze.js` — snooze operations, due restore, retries, and restart alarm reconstruction.
- `src/background/background.js` — event registration and message routing.
- `src/sidebar/` — Tree, Groups, Duplicates, Saved Items, and Snoozed surfaces.
- `src/popup/` — fast counts and focused-window capture.
- `tests/` — deterministic state, transaction, policy, and background integration tests.

## Next architecture layers

Richer arbitrary-date/recurring snooze UX, tree branch operations, conservative normalized duplicate policy/protected-tab rules, automatic discard policy, rules, import/export, and optional integrations remain future work behind explicit policies and source-preserving transitions.
