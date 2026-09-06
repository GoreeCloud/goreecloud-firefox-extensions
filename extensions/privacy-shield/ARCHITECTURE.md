# Architecture

## Runtime layers

1. **Core (`src/core.js`)** — pure URL cleaning, redirect unwrapping, rule parsing, domain matching, setting resolution, reviewed site-specific ad/annoyance selector catalogs, cosmetic selector resolution, and local-resource catalog.
2. **Site profiles (`src/site-profiles.js`)** — pure per-site Standard/Strict/Compatible profile mapping over the existing `siteOverrides` settings structure. Profile application preserves the independent site enabled/disabled field and never broadens extension permissions.
3. **Support snapshot (`src/support-snapshot.js`)** — pure formatter for an explicitly requested, privacy-bounded support summary. It accepts only enumerated runtime/version, hostname, site mode, current-tab counters, and friendly aggregate reason-count fields and does not accept raw logger URLs, query strings, page content, selectors, credentials, cookies, or logger identifiers.
4. **Logger privacy (`src/logger-privacy.js`)** — pure sanitization of activity URLs before logger data crosses from the background process into UI surfaces plus a stricter presentation-only Privacy view for opaque identifiers.
5. **Background (`src/background.js`)** — Firefox network enforcement, ETag protection, user/filter-list state, local CDN redirects, unified per-tab counters, combined action-badge state, bounded in-memory network/page activity logging, scheduled list refresh, and context menus. Raw activity URLs remain inside this memory-only background layer unless one entry is explicitly revealed.
6. **Content (`src/content.js`)** — link cleanup, hyperlink-auditing removal, anti-rewrite mutation monitoring, copy cleaning, cosmetic filtering, reviewed site-specific page controls, privacy-safe page-filter activity reporting, picker, and zapper.
7. **Page guard (`src/page-guard.js`)** — page-world popup control that preserves user-initiated popup behavior while rejecting programmatic `window.open()` calls without active user activation.
8. **Glaze UI surfaces** — popup quick controls, live protection state, toolbar action badge, settings, hidden-element recovery, and privacy-redacted Activity Logger with explicit counter scope.

## Popup quick-control boundary

The popup remains a presentation/control surface rather than a competing enforcement authority. **Copy clean URL** calls the existing background `url:clean` message, which delegates to the canonical core URL sanitizer, then writes the result to the local clipboard. It does not create a separate sanitizer, remote shortening service, or redirect service.

Per-site modes are deliberately implemented in `src/site-profiles.js` rather than duplicating network-decision logic in the popup. The helper transforms only the current hostname's existing `siteOverrides` entry. **Standard** removes the profile-managed fields so global settings apply. **Strict** explicitly enables third-party script/frame blocking while retaining the normal protection set. **Compatible** keeps the core tracker/malware/miner/URL/ping/ETag/popup/ad-request protections while disabling cosmetic filtering and local-resource substitution and leaving third-party script/frame/media blocking off. The independent `enabled` field is preserved when a mode changes. **Reset site** removes the complete host-specific override.

The popup's **Protection details** view is derived only from `logger:get` public entries that have already crossed `src/logger-privacy.js`. It filters to the current tab, accepts only blocked/redirected/hidden outcomes, groups stable reason codes, and displays friendly reason labels plus aggregate counts. The details renderer never consumes or displays `url` or `finalUrl`. This makes the surface useful for “why did Privacy Shield act?” without creating a second raw-activity exposure path.

**Refresh** re-reads the current tab counters and the already-redacted logger view without reloading the page or creating a new store. The header's protection-state line is derived from the current local enabled state and site profile; it does not represent a remote health or certification signal.

## Privacy-safe support snapshot boundary

**Copy support snapshot** is explicit user-initiated clipboard export. The popup passes only the extension version, local Firefox name/version, current hostname, enabled state, active site profile, current-tab counters, and friendly aggregate reason-count rows to `src/support-snapshot.js`.

The formatter uses a positive allowlist: unknown caller fields are ignored rather than copied through. It never receives or reads raw request URLs, final URLs, query strings, page contents, DOM selectors, credentials, cookies, or logger entry identifiers. The resulting clipboard text includes a visible privacy-boundary statement so a copied diagnostic remains self-describing outside the extension.

No support snapshot is retained by Privacy Shield, sent to GoreeCloud, uploaded to a support service, or added to the Activity Logger. The feature introduces no new extension permission and uses the already-declared local clipboard permission. Regression tests intentionally pass secret-looking unknown fields to the formatter and require that they do not appear in output.

## Reviewed content-selector boundary

Generic network filtering cannot remove every first-party promotional surface. The core therefore carries a deliberately small reviewed site selector catalog. Ad selectors participate in ordinary cosmetic filtering; the initial site-specific entries cover Reddit promoted-post containers and Pinterest promoted-pin markers.

Annoyance selectors are separate and disabled by default. They are applied only when the user enables **Reviewed sign-in and promotional overlays**. The initial annoyance catalog covers narrowly identified Google One Tap-style prompt containers on Pinterest. Privacy Shield does not apply a generic rule that hides every modal/dialog because those surfaces can contain consent, authentication, payment, safety, or other functional UI.

## Page-filter observability boundary

The content layer records only observed matches for active page-filter categories. A `WeakSet` prevents the same element from being counted repeatedly, and short batching coalesces multiple matches into one `page:filtered` message. Supported reasons are limited to `cosmetic-content`, `annoyance-overlay`, `element-picker`, and `zapper`.

The background validates that reason set, increments the current tab's `hidden` counter, and emits a normal Activity Logger entry with activity type `page`, verdict `hidden`, aggregate count, timestamp, and page URL. Selectors, DOM text, element attributes, and page content are never included in the page activity message or log entry.

Page-filter activity is deliberately integrated into the existing background message authority rather than a second independent runtime listener. This keeps Firefox asynchronous message-response ownership deterministic and ensures popup counters, toolbar badge state, and logger entries use the same in-memory state.

## Logger data boundary

The background stores network and page activity entries only in memory. Normal `logger:get` responses and live `logger:event` messages are transformed through `src/logger-privacy.js`, which preserves useful host/path/activity metadata while redacting credential-like, token/session/authentication, long high-entropy query values, URL credentials, and fragments.

The logger's **Privacy view** applies another transformation only to the already-redacted UI representation. It masks common opaque request/event/visitor/device/measurement/trace identifiers while retaining URL structure. Disabling Privacy view returns to the baseline redacted representation; it does not bypass baseline redaction.

The logger UI has no bulk raw-log API. `logger:reveal` accepts one activity entry ID and returns that entry's raw URL only after an explicit user action. The logger page stores revealed values only in page memory and discards them on refresh or close.

Protection details deliberately uses `logger:get`, not `logger:reveal`, and therefore cannot receive the raw-URL representation. Its reason rows are a presentation of existing redacted metadata, not a durable privacy-history database. Support snapshots narrow that representation further by copying only friendly reason labels and aggregate counts rather than redacted URLs.

## Counter scopes and action badge

Per-tab counters live in `countersByTab` and reset when that tab begins loading a new page. They track `blocked`, `cleaned`, `hidden`, and `local`. The popup exposes those counters individually under **This tab**.

The Firefox action badge is derived only from those same four counters. Its value is `blocked + cleaned + hidden + local`; zero clears the badge, values through 999 display directly, and larger totals display `999+`. Each accepted counter mutation updates the badge immediately. Beginning a new navigation resets both the four counters and the badge, so the toolbar surface cannot silently drift into a longer-lived session total.

The counters are mirrored to memory-only Firefox `storage.session` so non-persistent MV3 event-page recreation does not erase current-browser-session values. This does not change the logger's separate memory-only lifecycle.

Logger entries live in the background's bounded in-memory logger and can include multiple tabs. Glaze UI therefore labels logger summary statistics **This logger session** instead of implying that logger totals should equal the current-tab popup or toolbar badge.

The logger's **Hidden** summary sums aggregate page-filter counts, while **Events** counts logger rows. A single row may therefore represent multiple hidden elements and display an `×N` suffix.

## Network decision order

1. disabled/site exception check;
2. main-frame tracking cleanup;
3. exact local-resource substitution;
4. explicit custom allow rules;
5. custom blocking rules;
6. ping/beacon blocking with separate reasons;
7. built-in category blocking;
8. optional third-party script/frame or media blocking;
9. optional allowed-request logging.

Page-filter observation occurs in the content layer alongside cosmetic enforcement and does not alter this network decision order. Site modes influence the existing resolved settings consumed by this order; they do not introduce another request interceptor.

## Privacy Shield boundary

This extension is a Firefox adapter implementing browser-specific privacy controls. The platform-wide Privacy Shield repository remains the authority for shared privacy contracts and capability governance. Firefox-specific interception remains here because the runtime that performs the work owns its implementation and acceptance evidence.

Stable 0.1.1 remains the accepted Firefox release while 0.2.0 quick controls and support diagnostics are developed and validated. Source integration of a new popup control, site profile, live-refresh view, or support snapshot does not itself constitute a Stable release, Mozilla signing, or broader platform production acceptance.
