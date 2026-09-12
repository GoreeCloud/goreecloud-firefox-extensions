# Security Policy

GoreeCloud Webspaces is in active development and has no Stable release.

## Security boundaries

Webspaces relies on Firefox contextual identities for supported browser-state separation. It does not claim operating-system process isolation, a malware sandbox, VPN/IP isolation, anonymity, fingerprint resistance, or complete tracking prevention.

0.1.5 adds Firefox `menus` for user-invoked context-menu actions but does not add broad host permissions, `management`, or `browsingData` merely to inspect other extensions or overstate cleanup guarantees.

## Destructive operations

- Tab migration establishes the destination before source removal.
- Session reset creates a fresh identity before retiring the old one and performs best-effort rollback if retirement fails.
- Built-in Webspaces cannot be deleted.
- Locked Webspaces reject destructive configuration and assignment mutation until unlocked.
- Close & Forget is limited to temporary Webspaces and closes managed tabs before contextual-identity removal.

Close & Forget must not be presented as proof that every browser artifact was erased.

## Repository hygiene

No secrets, credentials, authentication cookies, recovery codes, session exports, or production administrative endpoints belong in this repository.
