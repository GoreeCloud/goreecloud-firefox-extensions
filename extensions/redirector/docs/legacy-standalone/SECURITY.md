# Security

## Scope

GoreeCloud Redirector has no server component, no remote execution path, no authentication secrets, and no network API dependency beyond the browser navigation the user already requests.

## Security boundaries

- Redirects are implemented with Firefox `declarativeNetRequest`.
- The extension has no content scripts and does not inspect page contents.
- Built-in host access is limited to Google Keep.
- Additional host access is optional and requested per custom source site.
- Only `http://` and `https://` custom source and destination URLs are accepted.
- Duplicate custom source rules are rejected.
- Destinations that match their own source rule are rejected to reduce redirect-loop risk.
- No reusable credential may be committed.

## Reporting

Do not publish credentials, browser profiles, private GoreeCloud URLs beyond already public product hostnames, or sensitive user data in a security report. Use a private GoreeCloud administrative channel for sensitive reports.
