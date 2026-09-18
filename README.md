# GoreeCloud Redirector

GoreeCloud Redirector is a small, privacy-first Firefox extension for redirecting selected external service URLs to GoreeCloud services.

## Built-in redirect

- `https://keep.google.com/*` → `https://memos.goreecloud.com/`

The built-in redirect is enabled by default and can be paused from the toolbar popup or settings page.

## Custom redirects

The settings page can add additional redirect rules. When a custom rule is saved, Firefox requests access only to the source site required by that rule. Custom rules are stored locally in Firefox and implemented with `declarativeNetRequest` dynamic rules.

## Privacy and security

GoreeCloud Redirector:

- has no analytics or telemetry;
- loads no remote JavaScript, fonts, icons, or UI dependencies;
- injects no content scripts into websites;
- does not read page contents;
- uses Firefox `declarativeNetRequest` rules for redirects;
- requests source-site access only where a redirect needs it;
- declares no data collection in Firefox manifest metadata;
- rejects duplicate custom source rules and obvious self-matching redirect loops.

## Glaze UI

The user interface targets **Glaze UI 1.0.0**. It uses GoreeCloud semantic colors, rounded controls, layered surfaces, purposeful gradients, 44 px minimum interactive targets, reduced-motion handling, increased-contrast handling, forced-colors behavior, and solid-surface fallbacks. All assets are local.

## Validation

Run:

```bash
python3 scripts/validate.py
node --check popup.js
node --check options.js
```

The validator checks extension structure, manifest requirements, privacy boundaries, built-in redirect scope, icons, Glaze UI markers, and packaging-sensitive paths.

## Development installation

1. Open `about:debugging` in Firefox.
2. Select **This Firefox**.
3. Select **Load Temporary Add-on**.
4. Select `manifest.json` from this folder or an unsigned development XPI.
5. Open `https://keep.google.com/`.
6. Confirm Firefox sends the navigation to `https://memos.goreecloud.com/`.

Temporary add-ons are removed when Firefox restarts. Normal persistent installation in Firefox Release requires Mozilla signing.

## Signing

See [`docs/AMO_SIGNING.md`](docs/AMO_SIGNING.md). The repository never stores Mozilla API credentials. `scripts/sign-unlisted.sh` accepts them only through environment variables.

## Repository

Canonical Firefox source: `GoreeCloud/goreecloud-firefox-extensions` → `extensions/redirector/`.

## Version

0.2.0 — source and unsigned package candidate. Persistent Stable installation remains gated on Mozilla signing and signed-build acceptance testing.
