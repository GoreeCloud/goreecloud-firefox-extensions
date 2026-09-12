# Security Policy

GoreeCloud Webspaces 0.1.10 is in active development and has no Stable release.

## Security boundaries

Webspaces relies on Firefox contextual identities for supported browser-state separation. It does not claim operating-system process isolation, a malware sandbox, VPN/IP isolation, anonymity, fingerprint resistance, or complete tracking prevention.

The built-in **Standard** Webspace is a normal Firefox contextual identity used as the fallback for otherwise-unassigned external HTTP(S) websites. It improves consistency of browser-state separation but does not raise the isolation boundary beyond Firefox contextual identities.

The current permission set includes Firefox `menus` for user-invoked context-menu actions but does not add broad host permissions, `management`, or `browsingData` merely to inspect other extensions or overstate cleanup guarantees.

## Isolation integrity

Each GoreeCloud-managed Webspace must own a distinct Firefox contextual identity and unique `cookieStoreId`. A managed Webspace with no cookie store, or two managed Webspaces mapped to the same cookie store, is treated as an isolation-integrity failure. The source fails closed during Webspace initialization rather than silently allowing shared authenticated browser state.

Standard, GoreeCloud, Google, Microsoft, Meta, custom persistent Webspaces, duplicated Webspaces, imported custom Webspaces, reset identities, and temporary Webspaces must therefore use independent Firefox contextual identities.

The 0.1.10 manager includes **Isolation Health**, which compares the GoreeCloud-managed Webspace map with Firefox's current contextual identities and reports missing, removed, or shared identity mappings. This diagnostic does not enumerate cookie contents and does not weaken the fail-closed invariant.

This isolation applies only to browser state Firefox actually partitions by contextual identity. Cookies are explicitly separated by Firefox contextual identities, and supported site storage such as localStorage, IndexedDB, and cache state may be partitioned through Firefox OriginAttributes. Browser-global history, bookmarks, saved passwords, network identity, and operating-system state are outside this guarantee unless separately implemented and verified.

## Routing safety

- Explicit user exceptions and assignments retain higher precedence than the Standard fallback.
- Provider and built-in GoreeCloud mappings supersede Standard when they match.
- Local-development targets such as localhost and loopback addresses remain explicit-only rather than automatically falling into Standard.
- Routing pauses deliberately suppress automatic Webspace migration while active.
- Tab migration establishes the destination before source removal.

## Destructive operations

- Session reset creates a fresh identity before retiring the old one and performs best-effort rollback if retirement fails.
- Built-in Webspaces, including Standard, cannot be deleted.
- Locked Webspaces reject destructive configuration and assignment mutation until unlocked.
- Close & Forget is limited to temporary Webspaces and closes managed tabs before contextual-identity removal.

Close & Forget must not be presented as proof that every browser artifact was erased.

## Repository hygiene

No secrets, credentials, authentication cookies, recovery codes, session exports, or production administrative endpoints belong in this repository.
