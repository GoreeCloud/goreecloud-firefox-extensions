# GoreeCloud Webspaces — Features

## Implemented in the 0.1.7 source candidate

- Built-in GoreeCloud, Google, Microsoft, and Meta Webspaces.
- Deterministic provider routing, explicit assignments, exceptions, and reason codes.
- **Why this Webspace?** candidate/priority explanation and local routing-rule tester.
- Firefox context menus for Open Link in Webspace, Move Tab to Webspace, Always Open This Site In, and Remove Webspace Assignment.
- Persistent and temporary custom Webspaces.
- Temporary **Close & Forget** with tab closure before contextual-identity removal; the control is hidden outside temporary Webspaces.
- Custom rename, description, color/icon editing; built-in appearance editing.
- Duplicate, lock/unlock, reset, and custom persistent deletion.
- Locked Webspaces protect their explicit rules against popup/context-menu retargeting.
- Duplicate creates a fresh identity and copies explicit rules disabled by default.
- Searchable assignment manager with domain/exact scope, add/edit/remove, enable/disable, destination changes, duplicate validation, and conflict reporting.
- **Timed routing pause:** 5 minutes or 30 minutes.
- **Site-only routing pause** for the current exact hostname.
- **Pause until Firefox restarts** and **pause indefinitely** modes.
- Explicit Resume action and visible routing-pause state.
- Default behavior for unassigned sites: Normal Firefox or a selected persistent Webspace.
- Bulk assignment for hostnames and HTTP(S) URLs, with deduplication and conservative conflict handling.
- Explicit user rules for `localhost`, loopback addresses, and local development hostnames; no automatic localhost assignment.
- Per-Webspace and total managed-tab counts without persistent browsing history.
- Portable local JSON import/export excluding authenticated session state and transient routing-pause state.
- Firefox-supported contextual-identity appearance discovery with compatibility fallbacks.
- Race-hardened tab handoff and source-preserving failure behavior.
- GLAZE UI V1.3 local visual layer with first-party identity mark, system dark appearance, visible focus, Reduced Motion, Reduced Transparency, missing-blur, Forced Colors fallbacks, and preserved semantic hidden states.

## Boundaries

Site-only pause matches one exact hostname. Bulk assignment does not silently replace an assignment owned by another Webspace. A locked Webspace blocks protected routing changes. Close & Forget does not claim complete erasure beyond what Firefox confirms through contextual-identity APIs. Import/export is configuration-only and excludes cookies, login sessions, credentials, browsing history, and temporary/timed pause state. Managed-tab counts are local status, not analytics.

## Planned

Ask-every-time/inherit-current/temporary default behavior, richer wildcard/domain-group routing, bounded local routing history/statistics, keyboard-shortcut expansion, managed enterprise policy, synchronization/recovery adapters, broader GoreeCloud platform integrations, Firefox Android acceptance, and full rendered/accessibility Glaze consumer acceptance remain planned.
