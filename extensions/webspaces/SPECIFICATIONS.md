# GoreeCloud Webspaces — Repository Specification

## Status

This file describes the current source-candidate implementation slice only. The authoritative broader product specification remains the GoreeCloud Drive record `Project Specification — Webspaces.docx`.

## Current requirements

1. The extension targets Firefox and uses Firefox contextual identities for browser-state separation.
2. The product model uses the term **Webspace**; Firefox container identity is an adapter/runtime mechanism.
3. GoreeCloud Webspaces must provide its own product-facing toolbar and management experience rather than relying on another container extension's UI.
4. Firefox contextual identities are browser-level and are not falsely represented as private to GoreeCloud Webspaces.
5. Built-in Webspaces are GoreeCloud, Google, Microsoft, and Meta.
6. `goreecloud.com` and all subdomains route to the GoreeCloud Webspace.
7. Curated provider domain rules route supported Google, Microsoft, and Meta properties.
8. User assignments and exceptions outrank provider defaults.
9. Routing decisions are deterministic and explainable by a reason code.
10. The toolbar popup identifies the current Webspace and the current routing reason when Firefox exposes the active page URL.
11. Users can open a new tab in any Webspace from GoreeCloud Webspaces.
12. Users can pause and resume automatic routing from GoreeCloud Webspaces.
13. Users can explicitly assign the current HTTP(S) hostname to a Webspace from the GoreeCloud popup.
14. The management page lists GoreeCloud-managed Webspaces and explicit domain assignments.
15. Users can create custom Webspaces locally without a cloud account.
16. A reroute creates the destination tab before removing the source tab.
17. A failed destination-tab creation must leave the original navigation/tab intact where Firefox behavior permits.
18. Configuration is local-first and versioned.
19. Platform-system integrations must not be claimed until separately implemented and verified.

## Firefox ownership limitation

Firefox does not expose extension-private contextual identities. Identities created by GoreeCloud Webspaces may also be visible in Firefox-native or third-party container-management interfaces. GoreeCloud ownership is represented by the local Webspace record and durable Webspace-to-`cookieStoreId` mapping, not by an exclusive Firefox container namespace.

## Current exclusions

- Full conflict-resolution UI beyond replacing an existing exact domain assignment.
- Context-menu actions.
- Temporary Webspaces and Close & Forget.
- Custom Webspace deletion/reset flows.
- Routing history/statistics UI.
- Sync, backup, Identity, Privacy Shield, Wardveil, Manager, Mesh, or Everkeep adapters.
- Managed enterprise policy.
- Firefox Android acceptance.
- Mozilla signing and Stable release acceptance.

## Acceptance criteria for this slice

- Repository validation passes.
- Routing and management unit tests pass.
- Manifest exposes the GoreeCloud toolbar popup and management page.
- Provider rules do not match hostname lookalikes such as `fakegoreecloud.com` for `goreecloud.com`.
- Explicit user assignments override provider mappings.
- Reassigning an explicitly assigned domain updates the existing rule rather than producing duplicate conflicting records.
- Explicit exceptions override user/provider routing.
- Paused routing returns normal browsing behavior.
- Unsupported URL schemes are not routed.
