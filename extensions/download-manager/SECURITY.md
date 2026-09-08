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

The accepted 0.2.11 source revision `7a9c33e5e194a05b792c1aa902c72b72f9fdf1fe` passed native-core coverage for binary segmented assembly/publication in addition to metadata-trust, range-integrity, no-overwrite, symlink-safety, protocol, installer, scheduler, lifecycle, retry, permission, syntax, deterministic-package, and archive-verification contracts.

Earlier Firefox 155.0.1 / Flathub Flatpak runtime evidence remains accepted for the previously tested transfer, pause/resume, same-job helper interruption recovery, non-persistent background-context recovery, authenticated-cookie transfer, native concurrency, and initial Firefox queue behavior.

The governed Mozilla-signed 0.2.10 restart diagnostic is retained as evidence of persistent signed installation, full Firefox process survival, same-job recovery dispatch, non-boundary HTTP Range reuse, and recovery of all 67,108,864 source bytes. It was not release acceptance because final segmented publication failed with `TypeError: write() argument must be str, not bytes`.

0.2.11 corrected that binary/text assembly boundary and then passed the fresh signed-runtime gate in GitHub Actions run `34174320808`. The Mozilla-signed XPI installed persistently, survived a new Firefox process without reinstalling, automatically recovered the same native job with preserved partial ranges, published the final file successfully, reproduced source SHA-256 `a4a99d83daaac4823006cd3b14df26d1a256042591ad7d2f83e7ecbb203c342f`, cleaned staging, and reconnected the matching helper. No manual Resume action was required after restart.

## Stable security disposition

The **Mozilla-signed 0.2.11 artifact has passed** the governed persistent-install/full-browser-restart acceptance. Stable runtime provenance is bound to signed XPI SHA-256 `074d901fa18d66ec5d5ee55bcacdfbf066567eec02902f5c6d2c43a361a75830` and signing run `34174320808`.

The product-specific seven-system applicability review is recorded in `PLATFORM_SYSTEM_RELEASE_REVIEW.md`; this security disposition does not claim Wardveil Security platform integration or any other platform integration absent from the implementation. Future runtime changes require a renewed review and versioned acceptance appropriate to their changed scope.
