# GoreeCloud Webspaces — Repository Specification

## Status

This file describes the current source-candidate implementation slice only. The authoritative broader product specification remains the GoreeCloud Drive record `Project Specification — Webspaces.docx`.

## Current requirements

1. Firefox contextual identities provide browser-state separation; **Webspace** remains the GoreeCloud product abstraction.
2. Built-in Webspaces are GoreeCloud, Google, Microsoft, and Meta.
3. GoreeCloud Webspaces provides its own toolbar and management interface.
4. `goreecloud.com` and supported provider domains route deterministically to the intended Webspace unless an explicit higher-priority user rule applies.
5. Migration must establish the destination contextual identity before starting the requested website navigation.
6. A destination tab must be marked as an internal routing transition before the requested URL is applied to it.
7. Destination navigation setup must succeed before the source tab is removed.
8. If destination navigation setup fails, the source tab must remain available and the incomplete replacement should be cleaned up where possible.
9. If source cleanup fails after the destination is established, the destination must be retained rather than risking navigation loss.
10. Configuration is local-first and versioned.
11. Webspaces popup and management surfaces target the current consumer-eligible **GLAZE UI V1.3 / 1.3.0** design direction through local assets only.
12. Glaze material must remain bounded: neutral glass is interaction chrome; durable reading/control surfaces remain solid or near-solid.
13. Webspace color is an identity accent and must not be the sole carrier of identity or important state.
14. Webspaces must use a first-party local product identity mark rather than depending on another container extension's artwork.
15. Built-in and custom Webspaces must retain non-color identity cues in addition to bounded accent color.
16. Webspaces UI must preserve visible focus and degraded presentation for Reduced Motion, Reduced Transparency, missing backdrop blur, Forced Colors, and system dark appearance.
17. The source must not claim full Glaze consumer conformance until rendered Firefox and applicable accessibility acceptance evidence exists.
18. Platform-system integrations must not be claimed until separately implemented and verified.

## Compatibility boundary

Firefox contextual identities are browser-level and are not private to GoreeCloud Webspaces. Another extension can enumerate the same identities. If two extensions automatically route the same site, competing routing policies can cause repeated reopening or other unstable behavior; GoreeCloud Webspaces does not request broad extension-management authority merely to inspect or disable another extension.

## Current exclusions

- Context-menu actions.
- Temporary Webspaces and Close & Forget.
- Custom Webspace deletion/reset flows.
- Full conflict-resolution UI.
- Routing history/statistics UI.
- Sync, backup, Identity, Privacy Shield, Wardveil, Manager, Mesh, or Everkeep adapters.
- Managed enterprise policy.
- Firefox Android acceptance.
- Full Glaze UI V1.3 consumer conformance/production acceptance.
- Mozilla signing and Stable release acceptance.

## Acceptance criteria for this slice

- Repository validation passes.
- Routing, management, tab-migration, identity, and Glaze-adoption source tests pass.
- Manifest and both first-party UI surfaces use the local `icons/webspaces.svg` product identity mark.
- Popup and options surfaces declare `data-glaze-version="1.3"` and load only local consumer UI assets.
- The Glaze adoption layer contains Reduced Motion, Reduced Transparency, no-backdrop-filter, and Forced Colors fallbacks.
- Webspace identity remains understandable without relying on color alone.
- The migration test proves `about:blank` destination creation occurs before applying the requested website URL.
- The migration test proves destination setup failure does not remove the source tab.
- Explicit user assignments override provider mappings.
- Explicit exceptions override user/provider routing.
- Paused routing returns normal browsing behavior.
