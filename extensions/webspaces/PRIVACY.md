# GoreeCloud Webspaces — Privacy

## Current source behavior

GoreeCloud Webspaces 0.1.5 stores configuration in Firefox local extension storage and does not require a GoreeCloud account or remote service. Routing evaluates top-level HTTP(S) URLs locally. The implementation does not add advertising telemetry, remote browsing-history collection, cloud synchronization, or server-side routing decisions.

The manager may count currently open tabs associated with GoreeCloud-managed contextual identities. Those counts are local status and are not persisted as browsing history by this implementation.

## Import and export

Portable exports may contain persistent Webspace definitions, appearance, lock state, routing preferences, explicit assignments, and exceptions. Exports exclude Firefox `cookieStoreId` values, temporary Webspaces, authentication cookies, active login sessions, passwords, credentials, and browsing history. Imported custom Webspaces receive fresh Firefox contextual identities.

## Close & Forget boundary

Close & Forget closes tabs Firefox reports as using the temporary Webspace and requests removal of its contextual identity. 0.1.5 does not request broad `browsingData` permission and does not claim verified deletion of every cache, artifact, network record, or browser datum outside the state Firefox removes with that contextual identity.

## Browser-state boundary

Webspaces does not claim network anonymity, IP separation, process isolation, fingerprint resistance, malware containment, or complete cross-site tracking prevention. Future GoreeCloud integrations must be implemented and independently accepted before this record claims them.
