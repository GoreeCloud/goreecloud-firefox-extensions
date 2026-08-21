# GoreeCloud Redirector

GoreeCloud Redirector is the first-party Firefox extension for privacy-preserving URL redirection into approved GoreeCloud services.

This directory is the canonical development and maintenance location. The historical standalone repository `GoreeCloud/goreecloud-redirector` remains a legacy source and release-history reference; active Firefox development belongs here.

## Current capability

- Manifest V3 Firefox extension.
- Built-in Google Keep → GoreeCloud Memos redirect.
- User-controlled enable/disable state.
- Custom redirect rules stored locally in Firefox.
- Per-source optional host-permission requests.
- Redirect-loop prevention and duplicate-source validation.
- Dynamic-rule reconciliation after permission changes.
- No analytics, injected page scripts, remote code, or external runtime service.
- Glaze UI 1.3 interface foundation.

## Privacy boundary

Redirect decisions are evaluated through Firefox Declarative Net Request. Custom rule definitions remain in local extension storage. The extension asks for a source site's host permission only when the user creates or enables a rule requiring that site.

## Release state

Version `0.2.1` establishes the canonical-repository migration and maintenance baseline. Signed-package acceptance remains a separate release gate.
