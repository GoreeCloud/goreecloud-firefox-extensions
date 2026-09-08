# Security — GoreeCloud Download Manager Extension

## Trust boundaries

The Firefox extension has access to privileged download APIs, local extension storage, notifications, context menus, and Native Messaging. Cookie access and broad host access are optional rather than required.

The native helper can write files to the configured local destination and make outbound HTTP/HTTPS requests for user-requested downloads. Its native messaging manifest allows only the fixed Firefox add-on ID `download-manager@goreecloud.com`.

The native helper is a same-user local process, not a security sandbox. The staging protections introduced in 0.2.10 and retained by 0.2.11 materially harden against link substitution but do not claim to defeat an unrestricted malicious process running as the same operating-system user between every filesystem operation.

## Implemented 0.2.11 safeguards

- Download URLs are restricted to HTTP/HTTPS before queueing and independently validated by the native helper.
- Native filenames and job identifiers are sanitized before filesystem use.
- Forwarded native request headers are allowlisted to the implemented Cookie/Referer boundary; CR/LF-bearing and over-64-KiB values are rejected.
- Cookie forwarding is disabled by default, requires explicit optional Firefox permission, and request credentials are not intentionally persisted in extension history or native recovery metadata.
- Persisted native partial reuse requires structurally valid same-job `metadata.json` plus source URL/size/ETag/Last-Modified validation.
- Resumed and segmented HTTP 206 responses require exact `Content-Range` semantics before bytes are appended.
- Expected segment sizes and assembled total size are validated when source size is known.
- The native job registry is lock-protected; duplicate active starts are idempotent; completed/cancelled jobs are not restarted through same-ID recovery.
- Concurrent native downloads reserve collision-safe destinations before publication.
- Segmented final assembly uses binary-exclusive (`xb`) creation under the validated job staging directory so binary chunks are written without weakening exclusive-create semantics.
- Final native publication uses a no-overwrite staging-to-destination commit rather than truncating an existing destination.
- The `.goreecloud-downloads` staging root and per-job staging directory reject symbolic-link or unexpected non-directory substitutions.
- `metadata.json`, single-part, assembled, and segmented staging entries must be regular non-link files before reuse.
- Supported staging file opens use no-follow semantics, invalid link entries are cleaned without traversing external targets, and publication rejects a symbolic-link staging source.
- Native protocol 2 requires helper version 0.2.11+ plus the integrity/recovery capabilities, including `staging-link-rejection`, before the helper is treated as compatible. The known-defective 0.2.10 helper is therefore rejected.

## Deterministic and runtime evidence

The current source suite includes native-core coverage for binary segmented assembly/publication in addition to the existing metadata-trust, range-integrity, no-overwrite, symlink-safety, protocol, installer, scheduler, lifecycle, retry, permission, syntax, deterministic-package, and archive-verification contracts.

Earlier Firefox 155.0.1 / Flathub Flatpak runtime evidence remains accepted for the previously tested transfer, pause/resume, same-job helper interruption recovery, non-persistent background-context recovery, authenticated-cookie transfer, native concurrency, and initial Firefox queue behavior. Later modeled edge behavior is not reclassified as target-device evidence merely because deterministic tests pass.

The governed Mozilla-signed 0.2.10 restart diagnostic is also retained as evidence of persistent signed installation, full Firefox process survival, same-job recovery dispatch, non-boundary HTTP Range reuse, and recovery of all 67,108,864 source bytes. It is not release acceptance because final segmented publication failed with `TypeError: write() argument must be str, not bytes`. 0.2.11 directly fixes that defect and must pass a new signed-runtime gate.

## Signed-release gate

Before Stable promotion, the **Mozilla-signed 0.2.11 artifact** must pass the governed persistent-install/full-browser-restart acceptance. That test must prove non-temporary installation, survival across a new Firefox process without reinstalling, post-restart native-helper compatibility, preservation/reuse of partial native staging through the process exit, same-job recovery, binary-safe final publication, exact final-file SHA-256 integrity, and post-completion staging cleanup.

The product-specific seven-system applicability review is recorded in `PLATFORM_SYSTEM_RELEASE_REVIEW.md`; it does not claim Wardveil Security platform integration or any other platform integration that is absent from the implementation.
