# GoreeCloud Webspaces — Privacy

## Current source behavior

The current development foundation stores Webspace configuration in Firefox local extension storage and does not require a GoreeCloud account or remote service.

The current source does not implement analytics, advertising telemetry, remote browsing-history collection, cloud synchronization, or server-side routing decisions.

Automatic routing evaluates the top-level HTTP(S) URL locally against built-in provider rules, user rules, and user exceptions.

## Browser-state boundary

Webspaces relies on Firefox contextual identities for supported browser-state separation. This is a browser profile feature, not a claim of network anonymity, IP separation, process isolation, fingerprint resistance, or complete cross-site tracking prevention.

Any future synchronization, Identity, Privacy Shield, Wardveil, Manager, Mesh, or other GoreeCloud integration must be implemented and independently accepted before this privacy record claims that behavior.
