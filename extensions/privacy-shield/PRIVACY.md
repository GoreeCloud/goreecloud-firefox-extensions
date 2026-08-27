# Privacy

GoreeCloud Privacy Shield is local-first.

The extension processes page URLs, request URLs, request/response headers needed for filtering, and DOM links locally in Firefox. It does not send browsing history, clipboard contents, logger contents, page content, or filter decisions to GoreeCloud or another telemetry service.

The request logger is ephemeral and memory-only. Allowed-request logging is off by default. Logger UI receives redacted request URLs by default: authentication, token, API-key, session, credential, signature, cookie, CSRF/XSRF, JWT-like, long high-entropy query values, credential-bearing URL authority, and URL fragments are suppressed. Raw request URLs remain only in the background process's in-memory logger and are returned to the logger UI only for one selected entry after the user explicitly chooses **Reveal full URL**. Revealed values are not persisted by the logger page and disappear when that page is refreshed or closed.

The logger's **Privacy view** is a stricter presentation layer enabled by default. It additionally masks common opaque request, event, visitor, device, measurement, and trace identifiers while preserving enough URL structure for debugging. Disabling Privacy view returns to the normal redacted representation; it does not expose baseline-sensitive values. **Copy safe URL** always copies the current non-raw representation and never copies the explicitly revealed raw URL.

Reviewed site-specific ad and annoyance selectors operate entirely inside the loaded page. First-party promoted-placement selectors are part of cosmetic ad filtering and follow the Ads setting. The separate reviewed annoyance setting is disabled by default and currently covers narrowly identified sign-in/promotional prompt containers rather than applying broad modal suppression.

Filter-list URLs are user-configured and empty by default; adding a subscription necessarily contacts that provider when refreshing the list.

Clipboard cleaning reacts to user copy operations and rewrites only standalone HTTP/HTTPS links or links copied from anchor elements. Clipboard contents are not stored.

The extension stores preferences, site overrides, user rules, and the last fetched filter-list text in Firefox extension-local storage.
