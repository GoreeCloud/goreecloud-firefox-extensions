# GoreeCloud Bookmarks Firefox Extension

This directory is the canonical Firefox-extension maintenance location for GoreeCloud Bookmarks.

## Role

This extension provides fast current-page capture into the private GoreeCloud Bookmarks application for standard Firefox installations. It is separate from the deeper unified-bookmark integration being built directly into GoreeCloud Browser.

## Transition from the legacy extension

The former `GoreeCloud/goreecloud-bookmark-browser-extension` repository is derived from the Linkwarden browser extension and contains cross-browser and Safari-specific material. Its inspected Firefox manifest still carried the upstream Linkwarden name, homepage, add-on identity, broad `<all_urls>` host permission, and a mixed Chrome/Firefox/Safari release boundary.

Rather than importing Safari/Xcode material or preserving unnecessarily broad Firefox permissions in the canonical Firefox-only repository, this directory starts the controlled first-party Firefox replacement required by the GoreeCloud fork-to-native strategy. The legacy repository remains historical provenance and a reference for useful behavior until all required capture workflows have equivalent validated implementations here.

## Privacy and authentication

The Firefox baseline requests only `activeTab` plus host access to `https://bookmarks.goreecloud.com/*`. It stores no reusable password, API token, cookie, private key, or signing secret. Capture requests use the browser's existing authenticated session with GoreeCloud Bookmarks.

## Release state

Version `0.1.0` is a source baseline, not a Mozilla-signed Stable release. It requires the corresponding server-side extension-capture endpoint, automated validation, real Firefox runtime testing, Mozilla signing, persistent installation, restart verification, and post-restart capture acceptance before Stable promotion.
