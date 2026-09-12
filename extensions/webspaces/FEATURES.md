# GoreeCloud Webspaces — Features

## Implemented in the 0.1.6 source candidate

- Built-in GoreeCloud, Google, Microsoft, and Meta Webspaces.
- Deterministic provider routing, explicit assignments, exceptions, and reason codes.
- **Why this Webspace?** candidate/priority explanation and local routing-rule tester.
- Firefox context menus for Open Link in Webspace, Move Tab to Webspace, Always Open This Site In, and Remove Webspace Assignment.
- Persistent and temporary custom Webspaces.
- Temporary **Close & Forget** with tab closure before contextual-identity removal; the control is hidden outside temporary Webspaces.
- Custom rename, description, color/icon editing; built-in appearance editing.
- Duplicate, lock/unlock, reset, and custom persistent deletion.
- Locked Webspaces protect their explicit rules against quick popup/context-menu retargeting.
- Duplicate creates a fresh identity and copies explicit rules disabled by default.
- Searchable assignment manager with domain/exact scope, add/edit/remove, enable/disable, destination changes, duplicate validation, and conflict reporting.
- Per-Webspace and total managed-tab counts without persistent browsing history.
- Portable local JSON import/export excluding authenticated session state.
- Firefox-supported contextual-identity appearance discovery with compatibility fallbacks.
- Race-hardened tab handoff and source-preserving failure behavior.
- GLAZE UI V1.3 local visual layer with first-party identity mark, system dark appearance, visible focus, Reduced Motion, Reduced Transparency, missing-blur, Forced Colors fallbacks, and preserved semantic hidden states.

## Boundaries

Close & Forget does not claim complete erasure beyond what Firefox confirms through contextual-identity APIs. Import/export is configuration-only and excludes cookies, login sessions, credentials, and browsing history. Managed-tab counts are local status, not analytics.

## Planned

Timed routing pauses, richer wildcard/domain-group routing, bounded local routing history/statistics, keyboard-shortcut expansion, managed enterprise policy, synchronization/recovery adapters, broader GoreeCloud platform integrations, Firefox Android acceptance, and full rendered/accessibility Glaze consumer acceptance remain planned.
