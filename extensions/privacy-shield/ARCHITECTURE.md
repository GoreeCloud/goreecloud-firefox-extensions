# Architecture

## Runtime layers

1. **Core (`src/core.js`)** — pure URL cleaning, redirect unwrapping, rule parsing, domain matching, setting resolution, reviewed site-specific ad/annoyance selector catalogs, cosmetic selector resolution, and local-resource catalog.
2. **Logger privacy (`src/logger-privacy.js`)** — pure sanitization of activity URLs before logger data crosses from the background process into UI surfaces plus a stricter presentation-only Privacy view for opaque identifiers.
3. **Background (`src/background.js`)** — Firefox network enforcement, ETag protection, user/filter-list state, local CDN redirects, unified per-tab counters, combined action-badge state, bounded in-memory network/page activity logging, scheduled list refresh, and context menus. Raw activity URLs remain inside this memory-only background layer unless one entry is explicitly revealed.
4. **Content (`src/content.js`)** — link cleanup, hyperlink-auditing removal, anti-rewrite mutation monitoring, copy cleaning, cosmetic filtering, reviewed site-specific page controls, privacy-safe page-filter activity reporting, picker, and zapper.
5. **Page guard (`src/page-guard.js`)** — page-world popup control that preserves user-initiated popup behavior while rejecting programmatic `window.open()` calls without active user activation.
6. **Glaze UI surfaces** — popup, toolbar action badge, settings, hidden-element recovery, and privacy-redacted Activity Logger with explicit counter scope.

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

## Counter scopes and action badge

Per-tab counters live in `countersByTab` and reset when that tab begins loading a new page. They track `blocked`, `cleaned`, `hidden`, and `local`. The popup exposes those counters individually under **This tab**.

The Firefox action badge is derived only from those same four counters. Its value is `blocked + cleaned + hidden + local`; zero clears the badge, values through 999 display directly, and larger totals display `999+`. Each accepted counter mutation updates the badge immediately. Beginning a new navigation resets both the four counters and the badge, so the toolbar surface cannot silently drift into a longer-lived session total.

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

Page-filter observation occurs in the content layer alongside cosmetic enforcement and does not alter this network decision order.

## Privacy Shield boundary

This extension is a Firefox adapter implementing browser-specific privacy controls. The platform-wide Privacy Shield repository remains the authority for shared privacy contracts and capability governance. Firefox-specific interception remains here because the runtime that performs the work owns its implementation and acceptance evidence.
