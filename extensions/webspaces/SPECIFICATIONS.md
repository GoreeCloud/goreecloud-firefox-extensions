# GoreeCloud Webspaces — Repository Specification

## Status

This file describes the first source-candidate implementation slice only. The authoritative broader product specification remains the GoreeCloud Drive record `Project Specification — Webspaces.docx`.

## Current requirements

1. The extension targets Firefox and uses Firefox contextual identities for browser-state separation.
2. The product model uses the term **Webspace**; Firefox container identity is an adapter/runtime mechanism.
3. Built-in Webspaces are GoreeCloud, Google, Microsoft, and Meta.
4. `goreecloud.com` and all subdomains route to the GoreeCloud Webspace.
5. Curated provider domain rules route supported Google, Microsoft, and Meta properties.
6. User assignments and exceptions outrank provider defaults.
7. Routing decisions are deterministic and explainable by a reason code.
8. Only top-level HTTP(S) navigations are eligible for this first routing slice.
9. A reroute creates the destination tab before removing the source tab.
10. A failed destination-tab creation must leave the original navigation/tab intact where Firefox behavior permits.
11. Configuration is local-first and versioned.
12. No cloud account is required for the implemented routing foundation.
13. Platform-system integrations must not be claimed until separately implemented and verified.

## Current exclusions

- Assignment-management UI.
- Toolbar popup and launcher.
- Context-menu actions.
- User-created Webspace UI.
- Temporary Webspaces and Close & Forget.
- Routing history/statistics UI.
- Sync, backup, Identity, Privacy Shield, Wardveil, Manager, Mesh, or Everkeep adapters.
- Managed enterprise policy.
- Firefox Android acceptance.
- Release packaging/signing acceptance.

## Acceptance criteria for this slice

- Repository validation passes.
- Routing unit tests pass.
- Provider rules do not match hostname lookalikes such as `fakegoreecloud.com` for `goreecloud.com`.
- Explicit user assignments override provider mappings.
- Explicit exceptions override user/provider routing.
- Paused routing returns normal browsing behavior.
- Unsupported URL schemes are not routed.
