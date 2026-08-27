# Architecture

## Runtime layers

1. **Core (`src/core.js`)** — pure URL cleaning, redirect unwrapping, rule parsing, domain matching, setting resolution, reviewed site-specific ad/annoyance selector catalogs, cosmetic selector resolution, and local-resource catalog.
2. **Logger privacy (`src/logger-privacy.js`)** — pure sanitization of request URLs before logger data crosses from the background process into UI surfaces plus a stricter presentation-only Privacy view for opaque identifiers.
3. **Background (`src/background.js`)** — Firefox network enforcement, ETag protection, user/filter-list state, local CDN redirects, per-tab counters, ephemeral raw logging, scheduled list refresh, and context menus. Raw logger URLs remain inside this memory-only background layer unless one entry is explicitly revealed.
4. **Content (`src/content.js`)** — link cleanup, hyperlink-auditing removal, anti-rewrite mutation monitoring, copy cleaning, cosmetic filtering, reviewed site-specific page controls, picker, and zapper.
5. **Page guard (`src/page-guard.js`)** — page-world popup control that preserves user-initiated popup behavior while rejecting programmatic `window.open()` calls without active user activation.
6. **Glaze UI surfaces** — popup, settings, hidden-element recovery, and privacy-redacted request logger with explicit counter scope.

## Reviewed content-selector boundary

Generic network filtering cannot remove every first-party promotional surface. The core therefore carries a deliberately small reviewed site selector catalog. Ad selectors participate in ordinary cosmetic filtering; the initial site-specific entries cover Reddit promoted-post containers and Pinterest promoted-pin markers.

Annoyance selectors are separate and disabled by default. They are applied only when the user enables **Reviewed sign-in and promotional overlays**. The initial annoyance catalog covers narrowly identified Google One Tap-style prompt containers on Pinterest. Privacy Shield does not apply a generic rule that hides every modal/dialog because those surfaces can contain consent, authentication, payment, safety, or other functional UI.

## Logger data boundary

The background stores request entries only in memory. Normal `logger:get` responses and live `logger:event` messages are transformed through `src/logger-privacy.js`, which preserves useful host/path/request metadata while redacting credential-like, token/session/authentication, long high-entropy query values, URL credentials, and fragments.

The logger's **Privacy view** applies another transformation only to the already-redacted UI representation. It masks common opaque request/event/visitor/device/measurement/trace identifiers while retaining URL structure. Disabling Privacy view returns to the baseline redacted representation; it does not bypass baseline redaction.

The logger UI has no bulk raw-log API. `logger:reveal` accepts one logger entry ID and returns that entry's raw URL only after an explicit user action. The logger page stores revealed values only in page memory and discards them on refresh or close.

## Counter scopes

Per-tab popup counters live in `countersByTab` and reset when that tab begins loading a new page. Logger entries live in the background's bounded in-memory logger and can include multiple tabs. Glaze UI therefore labels popup statistics **This tab** and logger summary statistics **This logger session** instead of implying that their totals should match.

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

## Privacy Shield boundary

This extension is a Firefox adapter implementing browser-specific privacy controls. The platform-wide Privacy Shield repository remains the authority for shared privacy contracts and capability governance. Firefox-specific interception remains here because the runtime that performs the work owns its implementation and acceptance evidence.
