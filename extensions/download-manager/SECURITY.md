# Security — GoreeCloud Download Manager Extension

## Trust boundaries

The Firefox extension has access to privileged download APIs, local extension storage, notifications, context menus, and Native Messaging. Cookie access and broad host access are optional rather than required.

The native helper can write files to the configured local destination and make outbound HTTP/HTTPS requests for user-requested downloads. Its native messaging manifest allows only the fixed Firefox add-on ID `download-manager@goreecloud.com`.

## Implemented safeguards

- Download URLs are restricted to HTTP/HTTPS before queueing.
- Native filenames are sanitized before filesystem use.
- Native staging directories are scoped by a sanitized GoreeCloud job ID.
- Forwarded native headers are allowlisted; newline-containing header values are rejected.
- Cookies are not persisted in extension history or native metadata.
- Native partial files use source-size/ETag/Last-Modified checks before resume.
- Final native file assembly validates expected segment sizes and final total size when known.
- Concurrent native downloads use job-isolated staging paths to avoid partial-file collisions.

## Remaining release work

Before Stable promotion, the signed artifact must be tested with malformed URLs, server range inconsistencies, disconnect/restart scenarios, file-permission failures, very large files, cookie-authenticated sources, and destination collisions on the target Firefox/Linux environment.
