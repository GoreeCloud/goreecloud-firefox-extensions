# GoreeCloud Advanced Tab Manager — Security

## Current boundary

- No host permissions.
- No content scripts.
- No remote code or remote telemetry.
- No credential, cookie, token, or page-content storage.
- Private browsing is explicitly disabled.
- Firefox remains authoritative for live browser state.
- Background state is reconstructed after suspension instead of trusting stale globals.
- Runtime Firefox tab/group IDs are never persisted as durable organizational identity.
- Persistent Tab Sets/stashes use a validated schema in local extension storage and fail closed on corrupt/unsupported state.
- Persistent writes require complete-record readback verification and attempt exact previous-record rollback on failure.
- Stashing cannot close a live source tab until the recovery record has persisted and verified.
- A stash restore cannot consume its recovery record until a live replacement has been created; failure to consume attempts to remove the replacement.
- Tab Set/stash capture accepts only `http:`, `https:`, and `about:blank` for restoration; privileged/executable URL schemes fail closed.
- Tree edges are accepted only between live tabs in the same normal window; cycle-producing relationships fail closed.
- Persistent operations are serialized so reads do not observe partial save/stash transactions.
- No `unlimitedStorage` permission is requested.
- Manual discard remains suppressed in the UI for active, pinned, or audible tabs.
- Duplicate cleanup is never automatic in 0.1.3 and requires an explicit reviewed set, selected keeper, and confirmation.
- Exact duplicate cleanup re-reads Firefox immediately before mutation and fails closed if the duplicate set or selected keeper is stale.
- Active, pinned, audible, hidden/private, tree-child, tree-parent, and explicitly excluded tabs are ineligible for duplicate cleanup.
- Duplicate cleanup adds no new manifest permission and does not perform normalized URL heuristics.
- Browser tab closure is not falsely described as rollback-safe: if Firefox rejects a multi-tab removal after partial browser-side effects, the UI is invalidated and reconciled from fresh Firefox truth.

## Release boundary

This source candidate has not completed representative Firefox runtime acceptance, Mozilla signing, signed-XPI acceptance, security release review, or Stable qualification. Security claims must not be expanded beyond the implemented source and verified tests.
