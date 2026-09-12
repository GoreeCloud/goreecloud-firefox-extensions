# GoreeCloud Webspaces — Privacy

## Current source behavior

GoreeCloud Webspaces 0.1.9 stores configuration in Firefox local extension storage and does not require a GoreeCloud account or remote service. Routing evaluates top-level HTTP(S) URLs locally. The implementation does not add advertising telemetry, remote browsing-history collection, cloud synchronization, or server-side routing decisions.

The manager may count currently open tabs associated with GoreeCloud-managed contextual identities. Those counts are local status and are not persisted as browsing history by this implementation.

## Standard Webspace

The built-in **Standard** Webspace is the default isolated destination for ordinary external HTTP(S) websites that do not match a more specific assignment or provider rule while automatic routing is active. Standard uses Firefox contextual-identity separation; it does not create a VPN, separate network identity, anonymity, fingerprinting resistance, or operating-system sandbox.

Standard exists to keep routine unassigned browsing out of browser-global Normal Firefox state. Explicit user exceptions, deliberate routing pauses, browser-internal or unsupported URLs, and explicit-only local-development hosts may remain outside Standard according to the routing policy.

## Import and export

Portable exports may contain persistent Webspace definitions, appearance, lock state, routing preferences, explicit assignments, and exceptions. Exports exclude Firefox `cookieStoreId` values, temporary Webspaces, authentication cookies, active login sessions, passwords, credentials, browsing history, and transient routing-pause state. Imported custom Webspaces receive fresh Firefox contextual identities, and imported global fallback settings normalize to Standard.

## Close & Forget boundary

Close & Forget closes tabs Firefox reports as using the temporary Webspace and requests removal of its contextual identity. 0.1.9 does not request broad `browsingData` permission and does not claim verified deletion of every cache, artifact, network record, or browser datum outside the state Firefox removes with that contextual identity.

## Browser-state boundary

Firefox owns the contextual identities used for browser-state isolation. Those identities are browser-level objects and are not private to GoreeCloud Webspaces. Webspaces does not claim network anonymity, IP separation, process isolation, fingerprint resistance, malware containment, or complete cross-site tracking prevention. Future GoreeCloud integrations must be implemented and independently accepted before this record claims them.
