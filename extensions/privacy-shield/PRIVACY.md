# Privacy

GoreeCloud Privacy Shield is local-first.

The extension processes page URLs, request URLs, request/response headers needed for filtering, and DOM links locally in Firefox. It does not send browsing history, clipboard contents, logger contents, page content, or filter decisions to GoreeCloud or another telemetry service.

The Activity Logger is ephemeral and memory-only. Allowed-request logging is off by default. Logger UI receives redacted URLs by default: authentication, token, API-key, session, credential, signature, cookie, CSRF/XSRF, JWT-like, long high-entropy query values, credential-bearing URL authority, and URL fragments are suppressed. Raw activity URLs remain only in the background process's in-memory logger and are returned to the logger UI only for one selected entry after the user explicitly chooses **Reveal full URL**. Revealed values are not persisted by the logger page and disappear when that page is refreshed or closed.

The logger's **Privacy view** is a stricter presentation layer enabled by default. It additionally masks common opaque request, event, visitor, device, measurement, and trace identifiers while preserving enough URL structure for debugging. Disabling Privacy view returns to the normal redacted representation; it does not expose baseline-sensitive values. **Copy safe URL** always copies the current non-raw representation and never copies the explicitly revealed raw URL.

The popup's **Protection details** view uses only the already-redacted public logger representation. It filters entries to the active tab, groups blocked/redirected/hidden activity by stable reason code, and displays friendly reason labels with aggregate counts. The details renderer does not consume or display request URLs, final URLs, selectors, DOM text, page content, credentials, or identifiers. Because the underlying logger is intentionally memory-only, Protection details covers the current logger/background session rather than constructing durable browsing history.

Page-filter observability is deliberately metadata-only. When cosmetic filtering, the reviewed annoyance layer, the element picker, or the zapper matches/removes page elements, Privacy Shield may record a local in-memory activity event containing only the approved category, aggregate count, tab/page URL, and timestamp. It does not record the matched CSS selector, DOM text, HTML, element attributes, image contents, form contents, or other page content. Page activity URLs use the same baseline redaction and optional Privacy view as network activity.

The popup's **Hidden** value is a current-tab counter for observed page-filter matches. Blocked, Cleaned, Hidden, and Local current-tab counters are mirrored to Firefox `browser.storage.session` so a Manifest V3 event-page recreation does not erase the current browser-session values. This storage is not Firefox extension-local persistent storage and is not used as browsing-history retention. Counters still reset on a new tab navigation and are removed when the tab closes.

Reviewed site-specific ad and annoyance selectors operate entirely inside the loaded page. First-party promoted-placement selectors are part of cosmetic ad filtering and follow the Ads setting. The separate reviewed annoyance setting is disabled by default and currently covers narrowly identified sign-in/promotional prompt containers rather than applying broad modal suppression.

The popup's **Standard**, **Strict**, and **Compatible** site modes reuse the existing `siteOverrides` preference structure. Selecting a mode stores the user's deliberate protection preferences for that hostname in Firefox extension-local storage, just like existing per-site controls. The mode helper does not create a request log, visit timestamp, browsing timeline, or remote site-profile service. Changing a mode preserves the independent site enabled/disabled field. **Reset site** deletes the complete host-specific override.

Filter-list URLs are user-configured and empty by default; adding a subscription necessarily contacts that provider when refreshing the list.

Clipboard cleaning reacts to user copy operations and rewrites only standalone HTTP/HTTPS links or links copied from anchor elements. Clipboard contents are not stored. The popup's **Copy clean URL** action runs only after explicit user activation, sanitizes the current HTTP/HTTPS page URL with the same local Privacy Shield URL cleaner, and writes the resulting URL to the local clipboard. It does not send the URL to a remote shortening, cleaning, redirect, or analytics service.

The extension stores preferences, deliberate site overrides, user rules, and the last fetched filter-list text in Firefox extension-local storage. Current-tab counters use `storage.session`; Activity Logger entries and Protection details remain background-memory-only. No new remote data flow or extension permission is introduced by the 0.2.0 popup quick-controls candidate.
