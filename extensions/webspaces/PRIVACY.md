# GoreeCloud Webspaces — Privacy

## Current source behavior

GoreeCloud Webspaces 0.1.10 stores configuration in Firefox local extension storage and does not require a GoreeCloud account or remote service. Routing evaluates top-level HTTP(S) URLs locally. The implementation does not add advertising telemetry, remote browsing-history collection, cloud synchronization, or server-side routing decisions.

The manager may count currently open tabs associated with GoreeCloud-managed contextual identities. Those counts are local status and are not persisted as browsing history by this implementation.

## Per-Webspace browser-state separation

Every GoreeCloud-managed Webspace is required to use its own Firefox contextual identity and unique `cookieStoreId`. Two Webspaces are not permitted to intentionally share the same Firefox cookie store. If persisted configuration would map two Webspaces to one cookie store, Webspaces treats that as an isolation-integrity failure rather than continuing with silently shared authenticated state.

Firefox contextual identities keep cookies in separate cookie stores. Firefox's container architecture also partitions supported site state through contextual identity/origin attributes, including storage such as localStorage and IndexedDB and cache state where Firefox supports that partitioning. GoreeCloud Webspaces does not broaden those Firefox guarantees.

Browser-global information that Firefox does not scope to contextual identities is outside this boundary. Webspaces must not imply that container use alone creates independent browser history, bookmarks, saved-password databases, IP addresses, or operating-system sandboxes.

## Isolation Health

The 0.1.10 manager can locally compare the persisted Webspace map with Firefox's current contextual identities. It reports whether each managed Webspace has a present, unique Firefox cookie store and detects missing or shared mappings.

Isolation Health does not enumerate website cookie contents, read login values, inspect browsing history, or transmit the result to a GoreeCloud service. The displayed health state is diagnostic evidence about the Webspace-to-contextual-identity mapping only.

## Standard Webspace

The built-in **Standard** Webspace is the default isolated destination for ordinary external HTTP(S) websites that do not match a more specific assignment or provider rule while automatic routing is active. Standard uses Firefox contextual-identity separation; it does not create a VPN, separate network identity, anonymity, fingerprinting resistance, or operating-system sandbox.

Standard exists to keep routine unassigned browsing out of browser-global Normal Firefox state. Explicit user exceptions, deliberate routing pauses, browser-internal or unsupported URLs, and explicit-only local-development hosts may remain outside Standard according to the routing policy.

## Import and export

Portable exports may contain persistent Webspace definitions, appearance, lock state, routing preferences, explicit assignments, and exceptions. Exports exclude Firefox `cookieStoreId` values, temporary Webspaces, authentication cookies, active login sessions, passwords, credentials, browsing history, and transient routing-pause state. Imported custom Webspaces receive fresh Firefox contextual identities, and imported global fallback settings normalize to Standard.

## Close & Forget boundary

Close & Forget closes tabs Firefox reports as using the temporary Webspace and requests removal of its contextual identity. 0.1.10 does not request broad `browsingData` permission and does not claim verified deletion of every cache, artifact, network record, or browser datum outside the state Firefox removes with that contextual identity.

## Browser-state boundary

Firefox owns the contextual identities used for browser-state isolation. Those identities are browser-level objects and are not private to GoreeCloud Webspaces. Webspaces does not claim network anonymity, IP separation, process isolation, fingerprint resistance, malware containment, or complete cross-site tracking prevention. Future GoreeCloud integrations must be implemented and independently accepted before this record claims them.
