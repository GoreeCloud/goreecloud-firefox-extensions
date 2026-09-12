# GoreeCloud Webspaces — Repository Specification

## Status

This file describes the current **0.1.12 source-candidate** implementation slice. The authoritative broader product specification remains the GoreeCloud Drive record `Project Specification — Webspaces.docx`.

## Current requirements

1. Firefox contextual identities provide browser-state separation; **Webspace** remains the GoreeCloud product abstraction.
2. Built-in Webspaces are Standard, GoreeCloud, Google, Microsoft, Meta, and Proton.
3. Standard is the fixed V1 fallback for ordinary external HTTP(S) websites that do not match a higher-priority routing destination while automatic routing is active.
4. Explicit user assignments, user exceptions, exact/subdomain rules, provider mappings, and the built-in GoreeCloud rule retain deterministic precedence above Standard.
5. Browser-internal/unsupported URLs, deliberate routing pauses, explicit Normal-Firefox exceptions, and explicit-only local-development hosts may remain outside Standard according to their defined semantics.
6. `localhost`, loopback addresses, and local-development hostnames may be routed only through explicit user configuration; they must not automatically fall into Standard.
7. Configuration is local-first and versioned. Schema 2 remains current for 0.1.12 because adding a built-in Webspace does not change the persisted data shape.
8. Routing is deterministic and explainable, including selected rule, reason, priority, and matching candidates where available.
9. Tab migration establishes the destination contextual identity before starting requested site navigation; destination setup must succeed before source removal.
10. Context-menu one-time Open/Move actions use the same race-safe transition model.
11. Custom Webspaces may be persistent or temporary. Built-ins cannot be deleted.
12. Close & Forget is limited to temporary Webspaces and must not claim complete browser-data deletion beyond Firefox evidence.
13. Duplicate and import create fresh identities rather than copying authenticated site state.
14. Reset creates a fresh replacement identity before retiring the current identity and performs best-effort rollback if retirement fails.
15. Lock state blocks destructive configuration and assignment mutation involving the protected Webspace while still allowing unlock.
16. Assignment management supports search, exact/domain scope, add/edit/remove, enable/disable, destination editing, duplicate-scope validation, and conflict reporting.
17. Portable export excludes `cookieStoreId` values, temporary Webspaces, authentication cookies, active login sessions, passwords, credentials, browsing history, and transient routing-pause state.
18. Import validates the GoreeCloud Webspaces portable format, caps imported object counts, creates fresh custom identities, and skips conflicting/unavailable assignments rather than silently replacing local routes.
19. Per-Webspace activity is limited to local open-tab counts and is not browsing-history telemetry.
20. Firefox-supported contextual identity colors/icons may be discovered at runtime with compatibility fallbacks.
21. The extension uses `menus` for context-menu features and does not add broad host permissions for routing.
22. Popup and management surfaces target GLAZE UI V1.3 / 1.3.0 through local assets only and preserve non-color identity cues, visible focus, reduced-motion/transparency, and Forced Colors behavior.
23. Automatic routing can be paused for 5 minutes, 30 minutes, the current exact hostname, until Firefox restarts, or indefinitely.
24. Timed pauses expire according to their stored deadline. A site-only pause must not suppress sibling/parent subdomains unless separately selected.
25. Bulk assignment accepts normalized hostnames or HTTP(S) URLs, deduplicates them, caps one operation at 200 entries, and must not silently retarget another Webspace's existing rule.
26. Bulk operations must reject attempts that would retarget a rule owned by a locked Webspace.
27. Webspaces registers keyboard commands for the launcher, every built-in Webspace including Proton, routing pause/resume, and manager without silently reserving default key combinations.
28. Users can inspect current shortcut assignments and open Firefox's extension-shortcut settings from the Webspaces manager.
29. Popup routing-pause controls use a compact disclosure while routing is active and automatically expand when an active pause needs a Resume surface.
30. Ask-every-time, inherit-current-Webspace, temporary-default behavior, wildcard/domain-group routing, persistent routing history/statistics, and unimplemented platform integrations must not be claimed.
31. Every GoreeCloud-managed Webspace maps one-to-one to a distinct Firefox contextual identity and unique `cookieStoreId`. Missing or duplicate mappings are isolation-integrity failures.
32. Isolation claims are limited to Firefox-supported contextual-identity partitioning; browser-global state must not be represented as isolated merely because a tab belongs to a Webspace.
33. The manager exposes **Isolation Health** and detects missing store mappings, removed/missing Firefox identities, and shared-store mappings without enumerating website cookie contents.
34. Isolation Health is diagnostic evidence for the Webspace-to-contextual-identity mapping only and is not proof of separate IP addresses, browser history, bookmarks, password stores, operating-system isolation, or complete privacy protection.
35. Runtime-message modules use non-overlapping namespaces: Isolation Health uses `webspaces-health:*`, the main router owns `webspaces:*`, and routing controls own `webspaces-controls:*`.
36. Built-in provider identities use locally packaged logo/icon assets in the popup and manager. Standard and GoreeCloud use existing first-party GoreeCloud assets; Google, Microsoft, Meta, and Proton use locally packaged provider marks with attribution/licensing records. Text names and fallback glyphs remain available so the UI does not depend on image rendering alone.
37. Provider artwork must not be fetched from remote hosts at runtime. Local marks are presentation assets and must not influence routing, authorization, or contextual-identity ownership.
38. Proton is a first-class built-in Webspace. The initial deterministic Proton provider registry includes `proton.me`, `protonmail.com`, and `protonvpn.com`; matching subdomains route to Proton unless a higher-priority user rule or exception applies.
39. Adding Proton must create/reconcile a distinct Firefox contextual identity for Proton rather than reuse another built-in Webspace's `cookieStoreId`.

## Standard fallback boundary

Standard is a real built-in Firefox contextual identity managed by GoreeCloud Webspaces. A more specific explicit/provider destination always supersedes Standard.

## Per-Webspace isolation boundary

Standard, GoreeCloud, Google, Microsoft, Meta, Proton, custom persistent Webspaces, duplicated Webspaces, imported custom Webspaces, reset identities, and temporary Webspaces each own their own Firefox contextual identity.

## Provider branding and Proton boundary

Provider logos are local UI identity aids. They do not imply sponsorship, partnership, or endorsement. Third-party marks remain the property of their owners. The dedicated Proton Webspace groups Proton services into one isolated identity by provider-domain rules; it does not claim that Proton services are otherwise affiliated with GoreeCloud.

## Isolation Health boundary

Live Firefox 155.0.1 evidence for 0.1.11 confirmed the healthy five-built-in mapping before Proton was introduced: five managed Webspaces, five unique cookie stores, five Firefox identities present, and each marked isolated. 0.1.12 must be accepted again with Proton present before the six-Webspace runtime state is treated as verified.

## Current exclusions

Complete browsing-data erasure verification for Close & Forget; persistent routing-history storage; ask-every-time/inherit-current/temporary default modes; advanced wildcard/domain-group routing; synchronization/recovery/Identity/Privacy Shield/Wardveil/Manager/Mesh/Everkeep adapters; managed enterprise policy; Firefox Android acceptance; full Glaze production acceptance; Mozilla signing; and Stable release acceptance remain outside this slice.

## Acceptance criteria

Repository validation and all Webspaces tests must pass. Manifest permissions remain exactly `activeTab`, `contextualIdentities`, `cookies`, `menus`, `storage`, and `webNavigation`, with no broad host permissions. Tests cover Proton provider routing, provider-logo asset mapping, built-in command mapping including Proton, deterministic routing, migration safety, context menus, lifecycle ordering/rollback, management validation, portability exclusions, first-party UI controls, semantic hidden states, locked-rule protection, routing pause lifecycle/scope, Standard fallback, explicit local-development routing, bulk-assignment safety, unique cookie-store isolation, Isolation Health, and non-overlapping runtime-message routing. Shortcut configuration remains under Firefox/user control.
