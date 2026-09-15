# GoreeCloud Advanced Tab Manager — Security

## Current boundary

- No host permissions.
- No content scripts.
- No remote code or remote telemetry.
- No credential, cookie, token, or page-content storage.
- Firefox remains authoritative for browser state.
- Background state is reconstructed after suspension instead of trusting stale globals.
- UI commands accept numeric Firefox tab IDs and delegate mutations to Firefox APIs.
- Manual discard is suppressed in the current UI for active, pinned, or audible tabs.

## Release boundary

This source candidate has not completed Mozilla signing, signed-XPI runtime acceptance, security release review, or Stable qualification. Security claims must not be expanded beyond the implemented source and verified tests.
