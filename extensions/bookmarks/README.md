# GoreeCloud Bookmarks Firefox Extension

This directory is the canonical Firefox-extension maintenance location for GoreeCloud Bookmarks.

## Role

This extension provides fast current-page capture into the private GoreeCloud Bookmarks application for standard Firefox installations. It is separate from the deeper unified-bookmark integration being built directly into GoreeCloud Browser.

## Capture workflow

The popup reads only the active tab selected by the user. It displays the page title and URL, loads accessible GoreeCloud Bookmarks collections, and allows the user to choose a collection, add tags, add an optional note, and save through the dedicated `/api/v1/bookmarks/extension-capture` server contract.

The server contract reuses GoreeCloud Bookmarks authentication, collection authorization, duplicate prevention, validation, tag handling, and link-creation behavior rather than duplicating those rules in the extension.

## Authentication

Version `0.1.1` supports a dedicated revocable GoreeCloud Bookmarks access token. Open **Connection settings**, create a dedicated access token in GoreeCloud Bookmarks, and paste it into the extension. Firefox stores it in extension local storage and the extension sends it only to `bookmarks.goreecloud.com` as a Bearer token.

When no token is stored, requests may use the existing authenticated GoreeCloud Bookmarks browser session as a compatibility fallback. A token is preferred because it is independently revocable and does not require storing the user's normal password.

## Transition from the legacy extension

The former `GoreeCloud/goreecloud-bookmark-browser-extension` repository is derived from the Linkwarden browser extension and contains cross-browser and Safari-specific material. Its inspected Firefox manifest still carried upstream Linkwarden identity and broad `<all_urls>` access.

The canonical Firefox implementation therefore follows the controlled first-party replacement path rather than copying obsolete Safari/Xcode material or unnecessarily broad Firefox privileges. The legacy repository remains provenance and a behavior reference.

## Permissions

- `activeTab` — reads the current page title and URL only after the user opens the extension.
- `storage` — stores the optional revocable GoreeCloud Bookmarks access token locally in Firefox.
- `https://bookmarks.goreecloud.com/*` — communicates only with the canonical private GoreeCloud Bookmarks application.

## Release state

Version `0.1.1` is a source candidate, not a Mozilla-signed Stable release. The matching server-side capture endpoint must be integrated and both repositories must pass their validation gates. Real Firefox runtime testing, token revocation testing, Mozilla signing, persistent installation, restart verification, and post-restart capture acceptance remain required before Stable promotion.
