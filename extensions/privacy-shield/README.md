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
- reviewed first-party promoted-placement cosmetic rules for supported sites, initially Reddit and Pinterest;
- support for hosts-style, common ABP domain rules, wildcard/regex URL rules, exceptions, and cosmetic rules;
- cosmetic filtering, persistent element picker rules, a temporary element zapper, one-click **Undo last hide**, and a **Hidden elements** manager for reviewing/restoring saved cosmetic rules;
- an optional, off-by-default reviewed annoyance layer for selected sign-in/promotional overlays, initially Google One Tap-style prompts on Pinterest;
- per-site protection override and controls for third-party scripts, third-party frames, and media/object requests;
- a local-only ephemeral **Activity Logger** covering both network decisions and privacy-safe page-filter events, with default URL redaction, optional stricter **Privacy view**, domain/type/verdict filters, safe-URL copy, explicit temporary full-URL reveal, and distinct ping/beacon reasons;
- explicit **This tab** popup counters for blocked requests, cleaned links, hidden page elements, and reviewed local-resource substitutions;
- exact-version local-resource substitution for reviewed CDN resources, initially normalize.css 8.0.1 across supported jsDelivr, cdnjs, and unpkg URLs;
- daily refresh of user-configured HTTPS filter lists, with no default remote subscription.

## Reviewed page controls

Network blocking is not sufficient for advertisements and promotional surfaces served through a site's own first-party application infrastructure. Privacy Shield therefore includes a small reviewed site-selector catalog in addition to generic cosmetic rules. The initial catalog recognizes current Reddit promoted-post containers and Pinterest promoted-pin markers. Built-in cosmetic ad selectors follow the **Ads** setting; user-defined cosmetic rules remain governed separately by **Cosmetic filtering**.

The separate **Reviewed sign-in and promotional overlays** setting is disabled by default. It currently targets narrowly reviewed Pinterest/Google One Tap-style prompt containers rather than applying broad modal heuristics. This avoids treating every dialog, consent surface, or sign-in flow as unwanted content. Future additions require a specific selector review and regression coverage.

## Page-filter observability

Privacy Shield counts page elements that its cosmetic, reviewed-annoyance, element-picker, or zapper controls actually match during the current tab load. The popup exposes this as **Hidden** alongside network **Blocked**, link **Cleaned**, and resource **Local** counts.

Page-filter events also enter the same in-memory Activity Logger as network events. They use activity type `page`, verdict `hidden`, and one of the reviewed reasons `cosmetic-content`, `annoyance-overlay`, `element-picker`, or `zapper`. Events may aggregate multiple elements into one row and display the aggregate as `×N`.

The observability boundary is intentionally narrow: page events contain only category, count, tab/page URL, and timestamp. Privacy Shield does not log matched selectors, DOM text, element attributes, or page content. Page URLs go through the same logger redaction and optional Privacy view as network URLs.

## Cosmetic rule recovery

The element picker creates persistent `domain##selector` cosmetic rules. **Undo last hide** removes the most recently saved custom cosmetic rule for the current site and reloads the page. **Hidden elements** lists all saved custom cosmetic rules with individual **Restore** actions. Existing picker-created rules from earlier Privacy Shield builds are recognized because recovery operates on the same `customRules` storage used by the picker.

The zapper remains temporary: it removes the selected element from the current document without saving a rule.

## Activity logger privacy

The activity logger is memory-only and does not persist browsing history or page-filter history. Logger views receive redacted URLs by default: authentication/token/session/credential-like query values, credential-bearing URL authority, URL fragments, and long high-entropy query values are suppressed while host, path, safe query values, activity type, verdict, reason, and aggregate count remain visible for debugging.

**Privacy view** is enabled by default in the logger UI and adds a second presentation-only privacy layer that masks common opaque request, event, visitor, device, measurement, and trace identifiers such as `ei`, `opi`, `ved`, `zx`, and `request_id`. Turning Privacy view off restores the already-redacted baseline representation; it does not expose credentials or other baseline-sensitive values.

Raw URLs remain only in the background process's ephemeral in-memory log. **Reveal full URL** retrieves one selected entry only after explicit user action, and the logger tab forgets revealed values when it is refreshed or closed. **Copy safe URL** always copies the current non-raw privacy representation, even if that row has been explicitly revealed in the interface.

Ping and beacon traffic are reported separately as `hyperlink-auditing-ping` and `telemetry-beacon` rather than being collapsed into one generic reason.

## Counter scope

Popup counts are explicitly labeled **This tab** and reset as that tab begins a new page load. They include network blocks, cleaned links, observed page-filter matches, and local-resource substitutions for that tab. Logger summary counts are explicitly labeled **This logger session** and can include activity from multiple tabs until the in-memory logger is cleared or the background state ends. The two surfaces therefore should not be expected to display the same totals.

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
node extensions/privacy-shield/scripts/test_core.js
node extensions/privacy-shield/scripts/test_logger_privacy.js
node extensions/privacy-shield/scripts/test_background_activity.js
node --check extensions/privacy-shield/src/background.js
node --check extensions/privacy-shield/src/content.js
python shared/scripts/package_extension.py privacy-shield
```

This is a source candidate. Successful validation and unsigned packaging do not make it a Mozilla-signed Stable release.
