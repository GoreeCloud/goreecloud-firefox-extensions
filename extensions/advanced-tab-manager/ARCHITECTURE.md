# GoreeCloud Advanced Tab Manager — Architecture

## Authority model

Firefox owns live browser state. The extension owns only its metadata, saved organizational intent, presentation, and requested browser operations.

## Runtime

The Manifest V3 background event page is non-persistent. Top-level listeners wake it when Firefox emits relevant events. The implementation therefore treats every execution as a possible cold start.

The UI requests a dashboard state from the background. The background queries normal Firefox windows with populated tabs, queries native tab groups, resolves extension-owned logical/tree metadata through `sessions` tab values, and separately loads validated extension-owned saved state from `storage.local`.

Browser events do not mutate a durable mirror of Firefox live state. Open views re-query after invalidation. Persistent Tab Sets and stash records are organizational/recovery data, not claims that corresponding live Firefox objects exist.

## Durable tree model

Every eligible tab has an extension-owned logical ID stored with `sessions.setTabValue()`. A child relationship is stored separately on the child as the parent's logical ID. Firefox runtime tab IDs are never persisted as tree identity.

The tree layer reconciles persisted relationships against each fresh browser snapshot. Missing or cross-window parents become orphaned live roots without deleting durable session metadata; malformed cycles are removed from presentation; new cycle-producing relationships fail closed.

## Persistent organizational state

`src/core/persistent-state.js` owns the first persistent schema:

```text
schemaVersion: 1
revision: integer
tabSets: []
stashedItems: []
```

The record is stored under one extension-owned `storage.local` key. Reads validate schema and relationships before returning data. Invalid or unsupported state fails closed instead of being rewritten as an empty record.

Persistent mutation uses an explicit sequence:

**read previous → mutate copy → increment revision → validate → write complete record → readback verify → rollback previous record on failure.**

Background persistent operations are serialized. Dashboard/saved-state reads join the same queue so user interfaces do not observe intermediate transactional state.

## Tab Set model

A Tab Set is a reusable saved collection. Capture translates live Firefox state into local identities:

- generated Tab Set ID;
- generated item IDs;
- generated set-local native-group IDs;
- safe restorable URL and title;
- source order;
- pin state;
- optional set-local parent item ID;
- optional set-local group ID;
- captured active item.

Current capture rejects rather than stores unsupported restoration URLs. Runtime Firefox tab/group IDs never become persistent Tab Set identity.

Tab Set restore is non-consuming. It creates a new Firefox window, creates the remaining tabs, reconstructs supported native groups, reapplies pinning, reconstructs tree relationships, and restores the active item. If restoration fails before completion, the implementation attempts to close the newly created restore window while leaving the saved Tab Set available.

## Transactional stash model

Stashing converts one live tab into local recovery state using source-preserving ordering:

**prepare safe metadata → persist/verify stash record → close live source.**

If the close fails, the persistent record is rolled back to the exact prior state when possible.

Stash restoration uses the reverse source-preserving sequence:

**create live replacement → apply supported state → remove stored stash record.**

If consuming the stored record fails, the newly created replacement tab is removed as rollback. A prior tree parent is reattached only if its logical identity currently maps to a live tab in the selected target window.

## Duplicate review and cleanup model

`src/core/duplicates.js` derives an ephemeral review model from the current Firefox snapshot. It groups only byte-for-byte equal non-empty URLs; it does not normalize fragments, query parameters, hosts, or tracking parameters.

Each duplicate member receives cleanup exclusion reasons from current browser/tree state. Active, pinned, audible, hidden/private, tree-child, tree-parent, and explicitly excluded tabs are guarded. The review chooses a conservative default keeper, preferring a guarded tab when one exists, while still allowing the user to choose any reviewed set member as the operation-local keeper.

Duplicate cleanup is not scheduled or automatic. The sidebar requires review plus explicit confirmation. `src/background/duplicate-cleanup.js` then discards the UI's earlier assumptions and reconstructs a fresh duplicate set from Firefox immediately before mutation. If the requested exact URL is no longer duplicated or the selected keeper no longer belongs to the current set, the operation fails closed. Only the fresh plan's unguarded, non-keeper tab IDs are passed to `tabs.remove()`.

A browser removal error triggers state invalidation and a fresh UI reconciliation; the source does not claim transactional rollback for browser tabs that Firefox may already have closed.

## Source modules

- `src/core/state.js` — browser-object normalization, snapshot construction, and exact duplicate counting.
- `src/core/tree.js` — tree reconciliation, deterministic row construction, orphan/cycle handling, and cycle prevention.
- `src/core/tree-session.js` — verified transactional session-value persistence with rollback.
- `src/core/persistent-state.js` — versioned Tab Set/stash schema, validation, URL restoration boundary, verified storage mutation, and rollback.
- `src/core/tab-sets.js` — safe live-window capture and stash-record preparation.
- `src/core/stash-transaction.js` — source-preserving persist/close and create/consume transaction primitives.
- `src/core/duplicates.js` — exact duplicate review, guard-reason analysis, deterministic keeper selection, and cleanup planning.
- `src/background/background.js` — event registration and message routing for bounded browser/organizational commands.
- `src/background/browser-state.js` — live Firefox reconciliation, logical/session metadata, opener adoption, and tree-parent mutation.
- `src/background/saved-state.js` — serialized Tab Set/stash persistence, restoration, deletion, and recovery transactions.
- `src/background/duplicate-cleanup.js` — fresh-state duplicate cleanup verification and guarded `tabs.remove()` dispatch.
- `src/sidebar/sidebar.js` — sidebar state loading, command dispatch, and high-level view coordination.
- `src/sidebar/open-tabs-view.js` — live tree/native-group rendering and tab-row actions.
- `src/sidebar/saved-view.js` — Tab Set/stash presentation and saved-item actions.
- `src/sidebar/duplicates-view.js` — exact duplicate review, keeper selection, guard disclosure, and cleanup action surface.
- `src/sidebar/ui.js` — shared accessible sidebar action/badge primitives.
- `src/popup/` — fast live/saved status and focused-window Tab Set capture.
- `tests/` — deterministic state, tree, storage-transaction, duplicate-policy, cleanup, and background integration tests.

## Next architecture layers

Conservative normalized duplicate matching/protected-tab policy, snoozing, richer tree operations, rules, import/export, and optional integrations remain future work behind explicit policies, schemas where needed, and source-preserving mutation sequences.
