# GoreeCloud Webspaces — Features

## Implemented in the 0.1.1 source candidate

- Built-in Webspace definitions.
- Built-in Webspace provisioning through Firefox contextual identities.
- GoreeCloud root/subdomain routing.
- Initial Google, Microsoft, and Meta provider mappings.
- Deterministic rule evaluation with reason codes.
- User-rule and exception data hooks.
- Local versioned configuration persistence.
- Top-level navigation rerouting.
- Replacement-before-removal tab movement safety.
- Basic reroute loop suppression.
- GoreeCloud Webspaces toolbar popup.
- Current-Webspace identification.
- Routing-reason display.
- Open-new-tab-in-Webspace actions.
- Routing pause/resume.
- “Always open this site in” assignment from the popup.
- GoreeCloud Webspaces management page.
- Custom Webspace creation.
- Explicit assignment review/removal.
- Routing and management unit tests.

## Firefox platform boundary

The underlying contextual identities are Firefox browser-level objects. Other container-management interfaces may display them. GoreeCloud Webspaces owns the Webspace model and management experience but does not claim a Firefox-private container namespace that the platform does not provide.

## Planned

Context menus, richer conflict resolution, temporary Webspaces, Close & Forget, reset/delete flows, import/export, routing history, statistics, accessibility refinement, managed policy, synchronization, and GoreeCloud platform integrations remain planned unless separately evidenced in source and validation.
