# Privacy

GoreeCloud Privacy Shield is local-first.

The extension processes page URLs, request URLs, request/response headers needed for filtering, and DOM links locally in Firefox. It does not send browsing history, clipboard contents, logger contents, page content, or filter decisions to GoreeCloud or another telemetry service.

The request logger is ephemeral and memory-only. Allowed-request logging is off by default. Filter-list URLs are user-configured and empty by default; adding a subscription necessarily contacts that provider when refreshing the list.

Clipboard cleaning reacts to user copy operations and rewrites only standalone HTTP/HTTPS links or links copied from anchor elements. Clipboard contents are not stored.

The extension stores preferences, site overrides, user rules, and the last fetched filter-list text in Firefox extension-local storage.
