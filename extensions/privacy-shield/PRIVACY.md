# Privacy

GoreeCloud Privacy Shield is local-first.

The extension processes page URLs, request URLs, request/response headers needed for filtering, and DOM links locally in Firefox. It does not send browsing history, clipboard contents, logger contents, page content, or filter decisions to GoreeCloud or another telemetry service.

The request logger is ephemeral and memory-only. Allowed-request logging is off by default. Logger UI receives redacted request URLs by default: authentication, token, API-key, session, credential, signature, cookie, CSRF/XSRF, JWT-like, long high-entropy query values, credential-bearing URL authority, and URL fragments are suppressed. Raw request URLs remain only in the background process's in-memory logger and are returned to the logger UI only for one selected entry after the user explicitly chooses **Reveal full URL**. Revealed values are not persisted by the logger page and disappear when that page is refreshed or closed. **Copy safe URL** always copies the redacted representation.

Filter-list URLs are user-configured and empty by default; adding a subscription necessarily contacts that provider when refreshing the list.

Clipboard cleaning reacts to user copy operations and rewrites only standalone HTTP/HTTPS links or links copied from anchor elements. Clipboard contents are not stored.

The extension stores preferences, site overrides, user rules, and the last fetched filter-list text in Firefox extension-local storage.
