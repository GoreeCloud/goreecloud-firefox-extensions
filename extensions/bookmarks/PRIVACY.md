# Privacy

GoreeCloud Bookmarks is a first-party Firefox extension for saving the current page to a user-controlled GoreeCloud Bookmarks deployment.

It contains no analytics, advertising, telemetry, remote executable code, or third-party tracking. The only application host permission is `https://bookmarks.goreecloud.com/*`.

The extension may store one user-provided, revocable GoreeCloud Bookmarks access token in Firefox extension local storage. The token is not included in source control, is not sent to third parties, and is transmitted only to the canonical GoreeCloud Bookmarks application as an Authorization bearer token. The user can remove the locally stored token from Connection settings at any time and can separately revoke it in GoreeCloud Bookmarks.

Current-page title and URL plus the selected collection ID and user-entered tags and note text are transmitted only after the user explicitly chooses Save bookmark. Collection metadata is requested from GoreeCloud Bookmarks only to populate the capture interface.
