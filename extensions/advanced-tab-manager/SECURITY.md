# GoreeCloud Advanced Tab Manager — Security

## Current boundary

- No host permissions.
- No content scripts.
- No remote code or remote telemetry.
- No credential, cookie, token, or page-content storage.
- Firefox remains authoritative for browser state.
- Background state is reconstructed after suspension instead of trusting stale globals.
- Extension-owned logical and tree-parent identifiers use Firefox session tab values rather than persisted runtime tab IDs.
- Tree edges are accepted only between live tabs in the same normal window.
- New self/descendant relationships and relationships whose ancestry is already malformed fail closed.
- Missing/cross-window parents are reconciled as orphaned live roots without fabricating a browser tab.
- Tree metadata writes require readback verification and attempt rollback to the prior relationship if persistence fails.
- UI commands accept numeric Firefox tab IDs only as current runtime handles and delegate browser mutations to Firefox APIs.
- Manual discard is suppressed in the current UI for active, pinned, or audible tabs.

## Release boundary

This source candidate has not completed representative Firefox runtime acceptance, Mozilla signing, signed-XPI acceptance, security release review, or Stable qualification. Security claims must not be expanded beyond the implemented source and verified tests.
