# GoreeCloud Webspaces — Repository Specification

## Status

This file describes the current **0.1.10 source-candidate** implementation slice. The authoritative broader product specification remains the GoreeCloud Drive record `Project Specification — Webspaces.docx`.

## Current requirements

1. Firefox contextual identities provide browser-state separation; **Webspace** remains the GoreeCloud product abstraction.
2. Built-in Webspaces are Standard, GoreeCloud, Google, Microsoft, and Meta.
3. Standard is the fixed V1 fallback for ordinary external HTTP(S) websites that do not match a higher-priority routing destination while automatic routing is active.
4. Explicit user assignments, user exceptions, exact/subdomain rules, provider mappings, and the built-in GoreeCloud rule retain deterministic precedence above Standard.
5. Browser-internal/unsupported URLs, deliberate routing pauses, explicit Normal-Firefox exceptions, and explicit-only local-development hosts may remain outside Standard according to their defined semantics.
6. `localhost`, loopback addresses, and local-development hostnames may be routed only through explicit user configuration; they must not automatically fall into Standard.
7. Configuration is local-first and versioned. Schema 1 configuration must migrate to schema 2 without discarding existing Webspaces, assignments, or exceptions, and the migrated fallback must normalize to Standard.
8. Routing is deterministic and explainable, including selected rule, reason, priority, and matching candidates where available. Standard fallback decisions use the explicit `standard-fallback` reason.
9. Tab migration establishes the destination contextual identity before starting the requested site navigation; destination setup must succeed before source removal.
10. Context-menu one-time Open/Move actions use the same race-safe transition model.
11. Custom Webspaces may be persistent or temporary. Built-ins cannot be deleted.
12. Close & Forget is limited to temporary Webspaces, closes their managed tabs before contextual-identity removal, remains hidden outside a temporary Webspace, and must not claim complete browser-data deletion beyond Firefox evidence.
13. Duplicate creates a fresh identity rather than copying authenticated site state. Copied explicit assignments are disabled by default.
14. Reset creates a fresh replacement identity before retiring the current identity and performs best-effort rollback if retirement fails.
15. Lock state blocks destructive configuration and assignment mutation involving the protected Webspace while still allowing unlock. Popup/context-menu assignment must not retarget an existing explicit rule away from a locked Webspace.
16. Assignment management supports search, exact/domain scope, add/edit/remove, enable/disable, destination editing, duplicate-scope validation, and conflict reporting.
17. Portable export excludes `cookieStoreId` values, temporary Webspaces, authentication cookies, active login sessions, passwords, credentials, browsing history, and transient routing-pause state. Portable import/export must normalize the global fallback to Standard.
18. Import validates the GoreeCloud Webspaces portable format, caps imported object counts, creates fresh custom identities, and skips conflicting/unavailable assignments rather than silently replacing local routes.
19. Per-Webspace activity is limited to local open-tab counts and is not browsing-history telemetry.
20. Firefox-supported contextual identity colors/icons may be discovered at runtime with compatibility fallbacks.
21. The extension uses `menus` for context-menu features and does not add broad host permissions for routing.
22. Popup and management surfaces target GLAZE UI V1.3 / 1.3.0 through local assets only, preserve non-color identity cues, visible focus, reduced-motion/transparency and Forced Colors behavior.
23. Automatic routing can be paused for 5 minutes, 30 minutes, the current exact hostname, until Firefox restarts, or indefinitely. The active pause state must be visible and explicitly resumable.
24. Timed pauses expire according to their stored deadline. A site-only pause must not suppress routing for sibling/parent subdomains unless separately selected.
25. Bulk assignment accepts normalized hostnames or HTTP(S) URLs, deduplicates them, caps one operation at 200 entries, and must not silently retarget another Webspace's existing rule.
26. Bulk operations must reject attempts that would retarget a rule owned by a locked Webspace.
27. Webspaces registers keyboard commands for the launcher, Standard and the other built-in Webspaces, routing pause/resume, and manager without silently reserving default key combinations.
28. Users must be able to inspect current shortcut assignments and open Firefox's extension-shortcut settings from the Webspaces manager.
29. The popup routing-pause controls use a compact disclosure while routing is active and automatically expand when an active pause needs an immediate Resume surface.
30. Ask-every-time, inherit-current-Webspace, temporary-default behavior, wildcard/domain-group routing, persistent routing history/statistics, and platform integrations must not be claimed until separately implemented and verified.
31. Every GoreeCloud-managed Webspace must map one-to-one to a distinct Firefox contextual identity and unique `cookieStoreId`. A missing store or duplicate `cookieStoreId` is an isolation-integrity failure; the extension must fail closed rather than silently operate with shared authenticated state.
32. Isolation claims are limited to Firefox-supported contextual-identity partitioning. Cookies and cookie-backed authentication state must be separated, and supported storage such as localStorage, IndexedDB, and cache state may be separated where Firefox OriginAttributes apply. Browser-global history, bookmarks, saved passwords, and other non-container-scoped browser state must not be represented as isolated merely because a tab belongs to a Webspace.
33. The Webspaces manager must expose an **Isolation Health** view that compares the persisted GoreeCloud-managed Webspace map with Firefox's current contextual identities and reports whether every Webspace has a present, unique cookie store. It must detect missing store mappings, removed/missing Firefox identities, and shared-store mappings without enumerating or exposing website cookie contents.
34. Isolation Health is diagnostic evidence for the Webspace-to-contextual-identity mapping only; it must not be represented as proof of separate IP addresses, separate browser history, separate bookmarks, separate saved-password stores, operating-system isolation, or complete privacy protection.

## Standard fallback boundary

Standard is a real built-in Firefox contextual identity managed by GoreeCloud Webspaces. It is not equivalent to Normal Firefox. The fixed fallback policy exists so routine unassigned browsing has an isolated Webspace instead of browser-global state. A more specific explicit/provider destination must always supersede Standard.

The implementation intentionally preserves escape cases. A user exception that explicitly selects Normal Firefox remains higher priority than Standard. Routing pauses suppress automatic routing. Local development targets remain explicit-only so `localhost` and loopback traffic are not unexpectedly recreated in another contextual identity before the developer assigns them.

## Per-Webspace isolation boundary

Standard, GoreeCloud, Google, Microsoft, Meta, custom persistent Webspaces, duplicated Webspaces, imported custom Webspaces, reset identities, and temporary Webspaces must each own their own Firefox contextual identity. Webspace creation, duplication, import, and reset workflows must create a fresh contextual identity rather than reuse another Webspace's cookie store.

The product may describe cookie and supported site-storage separation only to the degree provided by Firefox. It must not imply separate browser profiles, separate password stores, separate history databases, separate bookmarks, separate IP addresses, or operating-system sandboxing.

## Isolation Health boundary

Isolation Health verifies the identity mapping GoreeCloud Webspaces itself manages. A healthy result means each managed Webspace references a Firefox contextual identity that currently exists and no two managed Webspaces share the same `cookieStoreId`. It intentionally does not inspect cookie values and is not a substitute for Firefox's own security guarantees or for broader privacy/security systems.

## Current exclusions

Complete browsing-data erasure verification for Close & Forget; persistent routing-history storage; ask-every-time/inherit-current/temporary default modes; advanced wildcard/domain-group routing; synchronization/recovery/Identity/Privacy Shield/Wardveil/Manager/Mesh/Everkeep adapters; managed enterprise policy; Firefox Android acceptance; full Glaze production acceptance; Mozilla signing; and Stable release acceptance remain outside this slice.

## Acceptance criteria

Repository validation and all Webspaces tests must pass. Manifest permissions must remain exactly `activeTab`, `contextualIdentities`, `cookies`, `menus`, `storage`, and `webNavigation`, with no broad host permissions. Tests must cover routing explanation, migration safety, context menus, lifecycle ordering/rollback, management validation, portability exclusions, first-party UI controls, semantic hidden states, locked-rule protection, routing pause lifecycle/scope, Standard fallback routing, schema-1-to-schema-2 migration, explicit local-development routing, bulk-assignment safety, keyboard-command mapping including Standard, unique cookie-store isolation, isolation-health detection for healthy/shared/missing mappings, identity, and Glaze adoption. Manifest commands must be explicit, and shortcut configuration must remain under Firefox/user control.
