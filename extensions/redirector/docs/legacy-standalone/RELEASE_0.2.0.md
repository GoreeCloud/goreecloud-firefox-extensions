# GoreeCloud Redirector v0.2.0 Release Record

## Status

**Stable**

## Release date

2026-08-17

## Product

GoreeCloud Redirector is a privacy-first Firefox extension that redirects selected external service URLs to GoreeCloud services.

## Built-in redirect

- `https://keep.google.com/*` → `https://memos.goreecloud.com/`

## Stable acceptance results

The v0.2.0 release candidate completed the required Mozilla signing and persistent-install acceptance tests.

Verified acceptance criteria:

- Firefox accepted the Mozilla-signed build through normal extension installation.
- GoreeCloud Redirector remained installed and enabled after fully quitting and restarting Firefox.
- The built-in Google Keep → GoreeCloud Memos redirect continued to function after restart.
- No regression requiring a source-code change was identified during signed-build acceptance.

## Release disposition

The signing and restart-persistence gates are satisfied. GoreeCloud Redirector v0.2.0 is approved as the first Stable signed release of the extension.

## Source version

`manifest.json`: `0.2.0`

## Historical repository

`GoreeCloud/goreecloud-redirector`
