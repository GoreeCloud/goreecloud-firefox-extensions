# GoreeCloud Webspaces — Features

## Implemented in the 0.1.2 source candidate

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
- Routing, management, and migration unit tests.

## Firefox platform boundary

Contextual identities are browser-level objects. Other container-management interfaces may display them, and another extension with automatic routing can conflict if it targets the same sites.

## Planned

Context menus, richer conflict resolution, temporary Webspaces, Close & Forget, reset/delete flows, import/export, routing history, statistics, accessibility refinement, managed policy, synchronization, and GoreeCloud platform integrations remain planned unless separately evidenced in source and validation.
