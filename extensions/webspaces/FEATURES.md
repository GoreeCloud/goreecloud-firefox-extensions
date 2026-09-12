# GoreeCloud Webspaces — Features

## Implemented in the 0.1.8 source candidate

- Built-in GoreeCloud, Google, Microsoft, and Meta Webspaces.
- Deterministic provider routing, explicit assignments, exceptions, and reason codes.
- **Why this Webspace?** candidate/priority explanation and local routing-rule tester.
- Firefox context menus for Open Link in Webspace, Move Tab to Webspace, Always Open This Site In, and Remove Webspace Assignment.
- Persistent and temporary custom Webspaces.
- Temporary **Close & Forget** with tab closure before contextual-identity removal; the control is hidden outside temporary Webspaces.
- Custom rename, description, color/icon editing; built-in appearance editing.
- Duplicate, lock/unlock, reset, and custom persistent deletion.
- Locked Webspaces protect their explicit rules against popup/context-menu retargeting.
- Searchable assignment manager with domain/exact scope, add/edit/remove, enable/disable, destination changes, duplicate validation, and conflict reporting.
- Timed routing pause for 5 minutes or 30 minutes, site-only pause, restart-scoped pause, indefinite pause, and explicit Resume.
- Compact popup routing-control disclosure that automatically expands when routing is paused.
- Default behavior for unassigned sites: Normal Firefox or a selected persistent Webspace.
- Bulk assignment for hostnames and HTTP(S) URLs with deduplication and conservative conflict handling.
- Explicit user rules for `localhost`, loopback addresses, and local development hostnames; no automatic localhost assignment.
- Firefox keyboard commands for opening the launcher, built-in Webspaces, toggling routing pause, and opening the manager.
- Firefox-owned shortcut assignment with an in-product view and a direct Manage Firefox shortcuts action.
- Per-Webspace and total managed-tab counts without persistent browsing history.
- Portable local JSON import/export excluding authenticated session state and transient routing-pause state.
- Race-hardened tab handoff and source-preserving failure behavior.
- GLAZE UI V1.3 local visual layer with first-party identity mark, system dark appearance, visible focus, Reduced Motion, Reduced Transparency, missing-blur, Forced Colors fallbacks, and preserved semantic hidden states.

## Boundaries

Webspaces does not reserve keyboard combinations by default; users remain in control of shortcut assignment through Firefox. Site-only pause matches one exact hostname. Bulk assignment does not silently replace an assignment owned by another Webspace. A locked Webspace blocks protected routing changes. Close & Forget does not claim complete erasure beyond what Firefox confirms through contextual-identity APIs. Import/export is configuration-only and excludes cookies, login sessions, credentials, browsing history, and temporary/timed pause state. Managed-tab counts are local status, not analytics.

## Planned

Ask-every-time/inherit-current/temporary default behavior, richer wildcard/domain-group routing, bounded local routing history/statistics, managed enterprise policy, synchronization/recovery adapters, broader GoreeCloud platform integrations, Firefox Android acceptance, and full rendered/accessibility Glaze consumer acceptance remain planned.
