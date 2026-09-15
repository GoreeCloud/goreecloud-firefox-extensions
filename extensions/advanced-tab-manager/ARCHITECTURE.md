# GoreeCloud Advanced Tab Manager — Architecture

## Authority model

Firefox owns live browser state. The extension owns only its metadata, presentation, and requested browser operations.

## Runtime

The Manifest V3 background event page is non-persistent. Top-level listeners wake it when Firefox emits relevant events. The implementation therefore treats every execution as a possible cold start.

The UI requests `atm:get-snapshot`; the background then queries normal Firefox windows with populated tabs, queries native tab groups, resolves extension-owned logical tab IDs and tree-parent logical IDs through `sessions` tab values, and returns a normalized immutable snapshot.

Browser events do not mutate a durable mirror of Firefox state. They broadcast a lightweight invalidation message so open extension views request a fresh snapshot. This avoids correctness depending on event order or long-lived JavaScript globals.

## Durable tree model

Every eligible tab has an extension-owned logical ID stored with `sessions.setTabValue()`. A child relationship is stored separately on the child as the parent's logical ID. Firefox runtime tab IDs are never persisted as tree identity.

The tree layer reconciles the persisted relationship against each fresh browser snapshot:

1. a parent logical ID that maps to a live tab in the same window becomes an active edge;
2. a missing or cross-window parent becomes an orphaned live root without deleting the durable relationship;
3. malformed cycles are removed from the presentation graph and surfaced as a repair state;
4. new reparent operations fail closed when they would create a cycle;
5. restored tabs can recover the same logical relationship even when Firefox assigns different runtime tab IDs.

Tree metadata mutation is transactional for the extension-owned state: read previous value → write requested value → readback verify → rollback previous value when verification fails → broadcast invalidation only after acceptance.

Tabs created with an eligible Firefox `openerTabId` may adopt the opener's logical ID as their initial tree parent when the child does not already carry restored parent metadata.

## Source modules

- `src/core/state.js` — browser-object normalization, snapshot construction, and exact duplicate counting.
- `src/core/tree.js` — tree reconciliation, deterministic row construction, orphan/cycle handling, and cycle prevention.
- `src/core/tree-session.js` — verified transactional session-value persistence with rollback.
- `src/background/background.js` — live API reconciliation, logical/tree metadata, event listeners, and bounded commands.
- `src/sidebar/` — primary tree/native-group operational views.
- `src/popup/` — fast status/actions surface.
- `tests/` — deterministic pure-state and transactional persistence tests.

## Next architecture layers

Tab Sets, transactional stashing, snoozing, rules, import/export, richer tree operations, and optional integrations will be added behind explicit schemas and source-preserving mutation sequences rather than mixed into a durable mirror of Firefox browser state.
