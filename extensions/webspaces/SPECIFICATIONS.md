# GoreeCloud Webspaces — Repository Specification

## Status

This file describes the current **0.1.6 source-candidate** implementation slice. The authoritative broader product specification remains the GoreeCloud Drive record `Project Specification — Webspaces.docx`.

## Current requirements

1. Firefox contextual identities provide browser-state separation; **Webspace** remains the GoreeCloud product abstraction.
2. Built-in Webspaces are GoreeCloud, Google, Microsoft, and Meta.
3. Routing is deterministic and explainable, including selected rule, reason, priority, and matching candidates where available.
4. Tab migration establishes the destination contextual identity before starting the requested site navigation; destination setup must succeed before source removal.
5. Context-menu one-time Open/Move actions use the same race-safe transition model.
6. Configuration is local-first and versioned.
7. Custom Webspaces may be persistent or temporary. Built-ins cannot be deleted.
8. Close & Forget is limited to temporary Webspaces in this slice, closes their managed tabs before contextual-identity removal, must remain hidden outside a temporary Webspace, and must not claim complete browser-data deletion beyond Firefox evidence.
9. Duplicate creates a fresh identity rather than copying authenticated site state. Copied explicit assignments are disabled by default.
10. Reset creates a fresh replacement identity before retiring the current identity and performs best-effort rollback if retirement fails.
11. Lock state blocks destructive configuration and assignment mutation involving the protected Webspace while still allowing unlock. Quick popup assignment and context-menu assignment must not retarget an existing explicit rule away from a locked Webspace.
12. Assignment management supports search, exact/domain scope, add/edit/remove, enable/disable, destination editing, duplicate-scope validation, and conflict reporting.
13. Portable export excludes `cookieStoreId` values, temporary Webspaces, authentication cookies, active login sessions, passwords, credentials, and browsing history.
14. Import validates the GoreeCloud Webspaces portable format, caps imported object counts, creates fresh custom identities, and skips conflicting/unavailable assignments rather than silently replacing local routes.
15. Per-Webspace activity in this slice is limited to local open-tab counts and is not browsing-history telemetry.
16. Firefox-supported contextual identity colors/icons may be discovered at runtime with compatibility fallbacks.
17. The extension uses `menus` for context-menu features and does not add broad host permissions for routing.
18. Popup and management surfaces target GLAZE UI V1.3 / 1.3.0 through local assets only, preserve non-color identity cues, visible focus, reduced-motion/transparency and Forced Colors behavior.
19. Platform integrations must not be claimed until separately implemented and verified.

## Current exclusions

Complete browsing-data erasure verification for Close & Forget; persistent routing-history storage; timed routing pause modes; advanced wildcard/domain-group routing; sync/recovery/Identity/Privacy Shield/Wardveil/Manager/Mesh/Everkeep adapters; managed enterprise policy; Firefox Android acceptance; full Glaze production acceptance; Mozilla signing; and Stable release acceptance remain outside this slice.

## Acceptance criteria

Repository validation and all Webspaces tests must pass. Manifest permissions must be exactly `activeTab`, `contextualIdentities`, `cookies`, `menus`, `storage`, and `webNavigation`, with no broad host permissions. Tests must cover routing explanation, migration safety, context menus, lifecycle ordering/rollback, management validation, portability exclusions, first-party UI controls, semantic hidden states, locked-rule quick-reassignment protection, identity, and Glaze adoption.
