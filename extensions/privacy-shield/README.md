# GoreeCloud Privacy Shield for Firefox

GoreeCloud Privacy Shield is the first-party Firefox adapter for GoreeCloud's platform-wide Privacy Shield privacy identity. It provides local-first browser privacy controls without replacing Firefox/Gecko security boundaries or claiming authority outside the browser runtime.

## Implemented foundation

- automatic tracking-parameter removal on navigation and page links;
- clean copied links and a **Copy clean link** context-menu action;
- a popup **Copy clean URL** action for the current page using the same canonical local URL sanitizer;
- bypass of supported tracking redirect wrappers;
- removal of hyperlink `ping` attributes and blocking of ping/beacon requests;
- ETag tracking resistance by removing `ETag` responses and `If-None-Match` requests;
- resistance to link rewriting through document-start cleanup, mutation observation, and capture-phase click cleanup;
- wide-spectrum request filtering for built-in ad/tracker/miner categories plus custom and subscribed rules;
- reviewed first-party promoted-placement cosmetic rules for supported sites, initially Reddit and Pinterest;
- support for hosts-style, common ABP domain rules, wildcard/regex URL rules, exceptions, and cosmetic rules;
- cosmetic filtering, persistent element picker rules, a temporary element zapper, one-click **Undo last hide**, and a **Hidden elements** manager for reviewing/restoring saved cosmetic rules;
- an optional, off-by-default reviewed annoyance layer for selected sign-in/promotional overlays, initially Google One Tap-style prompts on Pinterest;
- per-site protection override plus **Standard**, **Strict**, and **Compatible** site modes with one-click site reset;
- controls for third-party scripts, third-party frames, and media/object requests;
- a local-only ephemeral **Activity Logger** covering both network decisions and privacy-safe page-filter events, with default URL redaction, optional stricter **Privacy view**, domain/type/verdict filters, safe-URL copy, explicit temporary full-URL reveal, and distinct ping/beacon reasons;
- popup **Protection details** that summarizes current-tab protection reason counts from already-redacted in-memory logger metadata without displaying request URLs or page content;
- on-demand **Refresh** for current-tab counters and Protection details without page reload or new history storage;
- an explicit **Copy support snapshot** action that exports only bounded derived diagnostic state to the local clipboard and excludes raw activity URLs, query strings, page content, selectors, credentials, cookies, and logger identifiers;
- a compact live protection-state line showing the current local On/Off state and active site mode;
- explicit **This tab** popup counters for blocked requests, cleaned links, hidden page elements, and reviewed local-resource substitutions;
- a Firefox toolbar badge showing the combined current-tab total: **Blocked + Cleaned + Hidden + Local**;
- MV3 event-page-safe current-tab counter recovery through memory-only `browser.storage.session`, with blocking listeners awaiting background initialization before making protection decisions;
- exact-version local-resource substitution for reviewed CDN resources, initially normalize.css 8.0.1 across supported jsDelivr, cdnjs, and unpkg URLs;
- daily refresh of user-configured HTTPS filter lists, with no default remote subscription.

## Popup quick controls

**Copy clean URL** applies the same reviewed Privacy Shield URL-cleaning function used by navigation and link cleanup, then writes only the resulting current-page URL to the local clipboard. It does not contact a remote shortening, redirect, or analytics service.

The popup exposes three per-site protection modes:

- **Standard** removes profile-managed site overrides and follows the user's normal/global Privacy Shield settings.
- **Strict** retains the normal protection set and additionally enables third-party script and third-party frame blocking for that site. It does not automatically enable the reviewed annoyance layer or media blocking.
- **Compatible** keeps tracker, malware, miner, URL-cleaning, ping/beacon, ETag, popup, and ad-request protections while disabling cosmetic filtering and reviewed local-resource substitution and leaving third-party script/frame/media blocking off to reduce page-altering behavior.

Changing a site mode preserves the independent site enabled/disabled state. **Reset site** removes the complete host-specific override and returns the site to global Privacy Shield settings. Site modes are stored in the existing local `siteOverrides` settings structure; no browsing-history store or new network service is introduced.

**Protection details** is an intentionally bounded explanation surface. It groups the current tab's blocked, redirected, and hidden logger events by stable reason code and displays only friendly reason labels plus aggregate counts. It does not display request URLs, final URLs, selectors, DOM text, page content, credentials, or identifiers. Because the Activity Logger is intentionally memory-only, detail rows cover the current logger/background session while the separate This tab counters can survive an MV3 event-page recreation through `storage.session`.

**Refresh** asks the existing background authorities for the current tab counters and already-redacted logger entries again. It does not reload the page, create persistent history, or contact a remote endpoint. The popup's small protection-state line is derived from local enabled/profile state and is not a remote health, trust, or certification indicator.

**Copy support snapshot** creates a user-requested text diagnostic from an explicit allowlist: extension version, local Firefox name/version, hostname, enabled state, site mode, This tab counters, and friendly Protection-details labels/counts. The formatter ignores unknown caller fields, and regression tests inject secret-looking raw URL/query/DOM/logger fields to prove they do not cross the snapshot boundary. The resulting text is copied locally, includes a visible privacy-boundary statement, and is neither retained nor transmitted by Privacy Shield.

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

## Counter scope and toolbar badge

Popup counts are explicitly labeled **This tab** and reset as that tab begins a new page load. They include network blocks, cleaned links, observed page-filter matches, and local-resource substitutions for that tab.

The toolbar badge is derived from the same current-tab counters and shows their combined total: **Blocked + Cleaned + Hidden + Local**. A zero total clears the badge, totals from 1 through 999 are displayed directly, and larger totals display `999+`. The counters are mirrored to Firefox `storage.session`, so a non-persistent Manifest V3 event-page recreation does not silently erase the current browser-session values. The badge still resets when the tab begins a new navigation, matching the popup's **This tab** scope.

Logger summary counts are explicitly labeled **This logger session** and can include activity from multiple tabs until the in-memory logger is cleared or the background state ends. The logger and toolbar badge therefore should not be expected to display the same totals.

## Local-resource delivery

Local substitution is fail-closed and exact-versioned. Unknown libraries or versions continue to the network rather than receiving an approximate replacement. Bundled resources are listed in `vendor/THIRD_PARTY_NOTICES.md` and exposed only through `web_accessible_resources` needed for redirecting the matching public CDN request.

The initial catalog deliberately starts small. Adding libraries requires exact-version compatibility review, license/attribution review, source provenance, and a corresponding catalog mapping.

## Filter-list behavior

No remote filter-list provider is contacted by default. Users can add HTTPS list URLs in Settings; configured lists refresh daily and can be refreshed manually. This avoids silently turning a privacy extension into a browsing-adjacent telemetry source.

The initial parser supports a useful subset rather than claiming complete uBlock Origin filter-language compatibility. Unsupported advanced syntax should be treated as non-matching until deliberately implemented and tested.

## Permissions

This adapter requires broad HTTP/HTTPS host access because its documented role is to inspect, clean, cancel, redirect, and modify requests across ordinary websites. The exception is documented in `BROAD_HOST_PERMISSION_REVIEW.md` and enforced by repository validation.

The 0.2.0 quick-control/support-diagnostics candidate adds no new extension permission. Clipboard use remains covered by the existing `clipboardWrite` permission, per-site modes reuse existing local settings, Protection details reuse the existing privacy-safe in-memory logger boundary, and support snapshots are built locally from bounded derived state.

## Development and release status

From the repository root:

```bash
python shared/scripts/validate_repository.py
python extensions/privacy-shield/scripts/validate.py
node extensions/privacy-shield/scripts/test_core.js
node extensions/privacy-shield/scripts/test_site_profiles.js
node extensions/privacy-shield/scripts/test_support_snapshot.js
node extensions/privacy-shield/scripts/test_logger_privacy.js
node extensions/privacy-shield/scripts/test_background_activity.js
node --check extensions/privacy-shield/src/background.js
node --check extensions/privacy-shield/src/content.js
node --check extensions/privacy-shield/src/popup.js
node --check extensions/privacy-shield/src/support-snapshot.js
python shared/scripts/package_extension.py privacy-shield
```

Privacy Shield **0.1.1** remains the current Stable Firefox release for Mozilla unlisted/self-distribution within the accepted Firefox 155.0.1 evidence. The signed artifact passed persistent installation, full restart acceptance, real MV3 event-page termination/wake recovery, and target-environment popup-counter verification.

Privacy Shield **0.2.0** is a feature **candidate** adding popup quick controls, site protection modes, site reset, live Protection-details refresh, local protection-state presentation, and privacy-safe support snapshots. It is not Stable and must pass exact candidate repository/runtime validation, compatibility review, Mozilla signing, persistent-install/restart acceptance, and user-facing acceptance before it may supersede 0.1.1. Source validation or unsigned packaging alone never creates a Stable claim.
