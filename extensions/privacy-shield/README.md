# GoreeCloud Privacy Shield for Firefox

GoreeCloud Privacy Shield is the first-party Firefox adapter for GoreeCloud's platform-wide Privacy Shield privacy identity. It provides local-first browser privacy controls without replacing Firefox/Gecko security boundaries or claiming authority outside the browser runtime.

## Implemented foundation

- automatic tracking-parameter removal on navigation and page links;
- clean copied links and a **Copy clean link** context-menu action;
- bypass of supported tracking redirect wrappers;
- removal of hyperlink `ping` attributes and blocking of ping/beacon requests;
- ETag tracking resistance by removing `ETag` responses and `If-None-Match` requests;
- resistance to link rewriting through document-start cleanup, mutation observation, and capture-phase click cleanup;
- wide-spectrum request filtering for built-in ad/tracker/miner categories plus custom and subscribed rules;
- support for hosts-style, common ABP domain rules, wildcard/regex URL rules, exceptions, and cosmetic rules;
- cosmetic filtering, persistent element picker rules, and a temporary element zapper;
- per-site protection override and controls for third-party scripts, third-party frames, and media/object requests;
- a local-only ephemeral request logger with blocked, redirected, and optionally allowed requests;
- exact-version local-resource substitution for reviewed CDN resources, initially normalize.css 8.0.1 across supported jsDelivr, cdnjs, and unpkg URLs;
- daily refresh of user-configured HTTPS filter lists, with no default remote subscription.

## Local-resource delivery

Local substitution is fail-closed and exact-versioned. Unknown libraries or versions continue to the network rather than receiving an approximate replacement. Bundled resources are listed in `vendor/THIRD_PARTY_NOTICES.md` and exposed only through `web_accessible_resources` needed for redirecting the matching public CDN request.

The initial catalog deliberately starts small. Adding libraries requires exact-version compatibility review, license/attribution review, source provenance, and a corresponding catalog mapping.

## Filter-list behavior

No remote filter-list provider is contacted by default. Users can add HTTPS list URLs in Settings; configured lists refresh daily and can be refreshed manually. This avoids silently turning a privacy extension into a browsing-adjacent telemetry source.

The initial parser supports a useful subset rather than claiming complete uBlock Origin filter-language compatibility. Unsupported advanced syntax should be treated as non-matching until deliberately implemented and tested.

## Permissions

This adapter requires broad HTTP/HTTPS host access because its documented role is to inspect, clean, cancel, redirect, and modify requests across ordinary websites. The exception is documented in `BROAD_HOST_PERMISSION_REVIEW.md` and enforced by repository validation.

## Development

From the repository root:

```bash
python shared/scripts/validate_repository.py
python extensions/privacy-shield/scripts/validate.py
node --check extensions/privacy-shield/src/core.js
node --check extensions/privacy-shield/src/background.js
node --check extensions/privacy-shield/src/content.js
python shared/scripts/package_extension.py privacy-shield
```

This is a source candidate. Successful validation and unsigned packaging do not make it a Mozilla-signed Stable release.
