# Architecture

## Runtime layers

1. **Core (`src/core.js`)** — pure URL cleaning, redirect unwrapping, rule parsing, domain matching, setting resolution, cosmetic selector resolution, and local-resource catalog.
2. **Background (`src/background.js`)** — Firefox network enforcement, ETag protection, user/filter-list state, local CDN redirects, per-tab counters, ephemeral logging, scheduled list refresh, and context menus.
3. **Content (`src/content.js`)** — link cleanup, hyperlink-auditing removal, anti-rewrite mutation monitoring, copy cleaning, cosmetic filtering, picker, and zapper.
4. **Page guard (`src/page-guard.js`)** — page-world popup control that preserves user-initiated popup behavior while rejecting programmatic `window.open()` calls without active user activation.
5. **Glaze UI surfaces** — popup, settings, and request logger.

## Network decision order

1. disabled/site exception check;
2. main-frame tracking cleanup;
3. exact local-resource substitution;
4. explicit custom allow rules;
5. custom blocking rules;
6. ping/beacon blocking;
7. built-in category blocking;
8. optional third-party script/frame or media blocking;
9. optional allowed-request logging.

## Privacy Shield boundary

This extension is a Firefox adapter implementing browser-specific privacy controls. The platform-wide Privacy Shield repository remains the authority for shared privacy contracts and capability governance. Firefox-specific interception remains here because the runtime that performs the work owns its implementation and acceptance evidence.
