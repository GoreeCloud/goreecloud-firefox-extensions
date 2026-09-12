# GoreeCloud Webspaces — Privacy

## Current source behavior

GoreeCloud Webspaces 0.1.12 stores configuration in Firefox local extension storage and does not require a GoreeCloud account or remote service. Routing evaluates top-level HTTP(S) URLs locally. The implementation does not add advertising telemetry, remote browsing-history collection, cloud synchronization, or server-side routing decisions.

Provider logos used by built-in Webspaces are packaged local assets. The UI does not contact provider websites or image CDNs to render Google, Microsoft, Meta, Proton, Standard, or GoreeCloud identity marks.

The manager may count currently open tabs associated with GoreeCloud-managed contextual identities. Those counts are local status and are not persisted as browsing history by this implementation.

## Per-Webspace browser-state separation

Every GoreeCloud-managed Webspace is required to use its own Firefox contextual identity and unique `cookieStoreId`. Two Webspaces are not permitted to intentionally share the same Firefox cookie store. Standard, GoreeCloud, Google, Microsoft, Meta, Proton, custom persistent Webspaces, and temporary Webspaces therefore maintain distinct cookie stores.

Firefox contextual identities keep cookies in separate cookie stores and partition supported site state where Firefox's contextual-identity/origin-attribute architecture applies. Webspaces does not broaden those Firefox guarantees and does not represent browser-global history, bookmarks, password databases, IP addresses, or operating-system sandboxes as isolated by containers.

## Proton Webspace

The built-in Proton Webspace recognizes `proton.me`, `protonmail.com`, and `protonvpn.com` locally. This routing decision is made from the requested top-level hostname and does not require contacting GoreeCloud or Proton for classification. Higher-priority explicit user rules and exceptions retain precedence.

## Isolation Health

The manager locally compares the persisted Webspace map with Firefox's current contextual identities and reports whether each managed Webspace has a present, unique Firefox cookie store. It does not enumerate website cookie contents, read login values, inspect browsing history, or transmit the health result to a GoreeCloud service.

## Standard Webspace

Standard is the default isolated destination for ordinary external HTTP(S) websites that do not match a more specific assignment or provider rule while automatic routing is active. Explicit exceptions, deliberate routing pauses, browser-internal/unsupported URLs, and explicit-only local-development hosts may remain outside Standard according to routing policy.

## Import and export

Portable exports may contain persistent Webspace definitions, appearance, lock state, routing preferences, explicit assignments, and exceptions. Exports exclude Firefox `cookieStoreId` values, temporary Webspaces, authentication cookies, active login sessions, passwords, credentials, browsing history, and transient routing-pause state. Imported custom Webspaces receive fresh Firefox contextual identities.

## Close & Forget boundary

Close & Forget closes tabs Firefox reports as using a temporary Webspace and requests removal of its contextual identity. 0.1.12 does not request broad `browsingData` permission and does not claim verified deletion of every cache, artifact, network record, or browser datum outside the state Firefox removes with that contextual identity.

## Browser-state boundary

Firefox owns the contextual identities used for browser-state isolation. Those identities are browser-level objects and are not private to GoreeCloud Webspaces. Webspaces does not claim network anonymity, IP separation, process isolation, fingerprint resistance, malware containment, or complete cross-site tracking prevention. Future GoreeCloud integrations must be implemented and independently accepted before this record claims them.
