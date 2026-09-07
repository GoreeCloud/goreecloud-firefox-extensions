# Security — GoreeCloud Download Manager Extension

## Trust boundaries

The Firefox extension has access to privileged download APIs, local extension storage, notifications, context menus, and Native Messaging. Cookie access and broad host access are optional rather than required.

The native helper can write files to the configured local destination and make outbound HTTP/HTTPS requests for user-requested downloads. Its native messaging manifest allows only the fixed Firefox add-on ID `download-manager@goreecloud.com`.

The native helper is a same-user local process, not a security sandbox. 0.2.10 materially hardens staging against link substitution but does not claim to defeat an unrestricted malicious process running as the same operating-system user between every filesystem operation.

## Implemented 0.2.10 safeguards

- Download URLs are restricted to HTTP/HTTPS before queueing and independently validated by the native helper.
- Native filenames and job identifiers are sanitized before filesystem use.
- Forwarded native request headers are allowlisted to the implemented Cookie/Referer boundary; CR/LF-bearing and over-64-KiB values are rejected.
- Cookie forwarding is disabled by default, requires explicit optional Firefox permission, and request credentials are not intentionally persisted in extension history or native recovery metadata.
- Persisted native partial reuse requires structurally valid same-job `metadata.json` plus source URL/size/ETag/Last-Modified validation.
- Resumed and segmented HTTP 206 responses require exact `Content-Range` semantics before bytes are appended.
- Expected segment sizes and assembled total size are validated when source size is known.
- The native job registry is lock-protected; duplicate active starts are idempotent; completed/cancelled jobs are not restarted through same-ID recovery.
- Concurrent native downloads reserve collision-safe destinations before publication.
- Final native publication uses a no-overwrite staging-to-destination commit rather than truncating an existing destination.
- The `.goreecloud-downloads` staging root and per-job staging directory reject symbolic-link or unexpected non-directory substitutions.
- `metadata.json`, single-part, assembled, and segmented staging entries must be regular non-link files before reuse.
- Supported staging file opens use no-follow semantics, invalid link entries are cleaned without traversing external targets, and publication rejects a symbolic-link staging source.
- Native protocol 2 requires helper version 0.2.10+ plus the integrity/recovery capabilities, including `staging-link-rejection`, before the helper is treated as compatible.

## Deterministic evidence

The accepted 0.2.10 exact source candidate passed 54 discovered Download Manager Python tests plus Firefox-only and mixed-engine scheduler regressions, lifecycle-fault injection, retry-snapshot coverage, JavaScript syntax checks, deterministic packaging, and archive verification. The filesystem-safety suite covers staging-root and job-directory symbolic links, metadata/part links, external-target preservation, cleanup behavior, publication-source rejection, and ordinary regular-file behavior.

Earlier Firefox 155.0.1 / Flathub Flatpak runtime evidence remains accepted for the previously tested transfer, pause/resume, same-job helper interruption recovery, non-persistent background-context recovery, authenticated-cookie transfer, native concurrency, and initial Firefox queue behavior. Later 0.2.4–0.2.10 modeled edge behavior is not reclassified as target-device evidence merely because deterministic tests pass.

## Signed-release gate

Before Stable promotion, the **Mozilla-signed 0.2.10 artifact** must pass the governed persistent-install/full-browser-restart acceptance. That test must prove non-temporary installation, survival across a new Firefox process without reinstalling, post-restart native-helper compatibility, preservation/reuse of partial native staging through the process exit, exact final-file SHA-256 integrity, and post-completion staging cleanup.

The product-specific seven-system applicability review is recorded in `PLATFORM_SYSTEM_RELEASE_REVIEW.md`; it does not claim Wardveil Security platform integration or any other platform integration that is absent from the implementation.
