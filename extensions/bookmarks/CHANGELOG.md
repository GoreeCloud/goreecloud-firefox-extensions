# Changelog

## 0.1.1 — 2026-08-21

- Added a dedicated Connection settings page for a user-provided, revocable GoreeCloud Bookmarks access token.
- Added local Firefox extension storage only for that optional token and documented its privacy/security boundary.
- Added Bearer-token authentication with authenticated-session fallback for GoreeCloud Bookmarks API requests.
- Replaced free-form collection-name entry with server-provided collection selection using collection IDs.
- Integrated the dedicated `/api/v1/bookmarks/extension-capture` contract and existing `/api/v1/collections` API.
- Added clear duplicate-link, authentication, and server-error feedback.
- Expanded source validation for the capture endpoint, collection API, token storage, and options UI.

This is a source candidate. It is not a Mozilla-signed Stable release and requires matching server integration, Firefox runtime acceptance, token revocation testing, signing, persistent-install verification, restart verification, and post-restart capture acceptance.

## 0.1.0 — 2026-08-21

- Established the canonical GoreeCloud Bookmarks Firefox source baseline.
- Replaced the inherited Linkwarden product identity with GoreeCloud-controlled Firefox identity.
- Narrowed the initial permission model to `activeTab` and the canonical GoreeCloud Bookmarks application origin.
- Added explicit current-page capture fields for title, URL, collection, tags, and note.
- Added privacy and security documentation and an automated source validation contract.
- Kept Safari/Xcode release artifacts outside the Firefox-only repository boundary.
- Recorded the legacy Linkwarden-derived repository as provenance rather than importing its cross-browser release boundary.

This is a source-development baseline, not a Mozilla-signed Stable release.
