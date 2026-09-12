# GoreeCloud Webspaces — Features

## Implemented in the 0.1.4 source candidate

- Built-in GoreeCloud, Google, Microsoft, and Meta Webspaces.
- Firefox contextual-identity provisioning.
- GoreeCloud root/subdomain and provider routing.
- Deterministic routing with reason codes.
- Explicit user assignments and exceptions.
- Local versioned configuration persistence.
- GoreeCloud Webspaces toolbar popup and management page.
- Current-Webspace identification and routing-reason display.
- Open-new-tab-in-Webspace actions.
- Routing pause/resume.
- “Always open this site in” assignment.
- Custom Webspace creation.
- Explicit assignment review/removal.
- Race-hardened destination-tab staging at `about:blank` before routed navigation.
- Source-preserving failure behavior when destination navigation setup fails.
- GLAZE UI V1.3 visual adoption layer for popup and settings surfaces.
- First-party Webspaces SVG identity mark registered with Firefox and used in product chrome.
- Distinct glyph + accent identity treatment for built-in and custom Webspaces.
- Compact two-column Glaze launcher in the popup.
- Routing, Webspace, and explicit-assignment summary capsules in the manager.
- Collapsible Firefox isolation boundary explanation to reduce persistent visual noise.
- System light/dark presentation plus Reduced Motion, Reduced Transparency, missing-blur, and Forced Colors fallbacks.
- Routing, management, migration, identity, and Glaze-adoption source tests.

## Glaze UI boundary

GLAZE UI V1.3 / 1.3.0 is the current shared Stable consumer target in the canonical Glaze repository. Webspaces adopts its current visual direction locally, but full downstream conformance and production acceptance are not claimed by this source candidate.

## Firefox platform boundary

Contextual identities are browser-level objects. Other container-management interfaces may display them, and another extension with automatic routing can conflict if it targets the same sites.

## Planned

Context menus, richer conflict resolution, temporary Webspaces, Close & Forget, reset/delete flows, import/export, routing history, statistics, managed policy, synchronization, broader GoreeCloud platform integrations, and full rendered/accessibility Glaze consumer acceptance remain planned unless separately evidenced in source and validation.
