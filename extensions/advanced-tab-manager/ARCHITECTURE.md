# GoreeCloud Advanced Tab Manager — Architecture

## Authority model

Firefox owns live browser state. The extension owns only its metadata, presentation, and requested browser operations.

## Runtime

The Manifest V3 background event page is non-persistent. Top-level listeners wake it when Firefox emits relevant events. The implementation therefore treats every execution as a possible cold start.

The UI requests `atm:get-snapshot`; the background then queries normal Firefox windows with populated tabs, queries native tab groups, resolves extension-owned logical tab IDs through `sessions` tab values, and returns a normalized immutable snapshot.

Browser events do not mutate a durable mirror of Firefox state. They broadcast a lightweight invalidation message so open extension views request a fresh snapshot. This avoids correctness depending on event order or long-lived JavaScript globals.

## Source modules

- `src/core/state.js` — browser-object normalization, snapshot construction, and exact duplicate counting.
- `src/background/background.js` — live API reconciliation, logical tab identity, event listeners, and bounded commands.
- `src/sidebar/` — primary operational view.
- `src/popup/` — fast status/actions surface.
- `tests/` — deterministic pure-state tests.

## Next architecture layers

Tree state, Tab Sets, stashing, snoozing, rules, import/export, and optional integrations will be added behind explicit persistent schemas and transactional mutation sequences rather than mixed into the live browser snapshot.
