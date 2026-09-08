# Security — GoreeCloud Download Manager Extension

## Stable release status

GoreeCloud Download Manager Extension **0.2.12 is Stable** for Mozilla unlisted/self-distribution. Its accepted Firefox runtime uses native helper **0.2.11 / protocol 2**; the helper version is intentionally unchanged because 0.2.12 changes only the extension version and packaged lifecycle-neutral Settings label.

## Trust boundaries

The Firefox extension has access to privileged download APIs, local extension storage, notifications, context menus, and Native Messaging. Cookie access and broad host access are optional rather than required.

The native helper can write files to the configured local destination and make outbound HTTP/HTTPS requests for user-requested downloads. Its native messaging manifest allows only the fixed Firefox add-on ID `download-manager@goreecloud.com`.

The native helper is a same-user local process, not a security sandbox. The staging protections introduced in 0.2.10 and retained by helper 0.2.11 materially harden against link substitution but do not claim to defeat an unrestricted malicious process running as the same OS user between every filesystem operation.

## Implemented safeguards

- Download URLs are restricted to HTTP/HTTPS before queueing and independently validated by the native helper.
- Native filenames and job identifiers are sanitized before filesystem use.
- Forwarded native request headers are allowlisted to the implemented Cookie/Referer boundary; CR/LF-bearing and over-64-KiB values are rejected.
- Cookie forwarding is disabled by default, requires explicit optional Firefox permission, and request credentials are not intentionally persisted in extension history or native recovery metadata.
- Persisted native partial reuse requires structurally valid same-job `metadata.json` plus source URL/size/ETag/Last-Modified validation.
- Resumed and segmented HTTP 206 responses require exact `Content-Range` semantics before bytes are appended.
- Expected segment sizes and assembled total size are validated when source size is known.
- The native job registry is lock-protected; duplicate active starts are idempotent; completed/cancelled jobs are not restarted through same-ID recovery.
- Concurrent native downloads reserve collision-safe destinations before publication.
- Segmented final assembly uses binary-exclusive (`xb`) creation under the validated job staging directory.
- Final native publication uses a no-overwrite staging-to-destination commit rather than truncating an existing destination.
- The `.goreecloud-downloads` staging root and per-job staging directory reject symbolic-link or unexpected non-directory substitutions.
- `metadata.json`, single-part, assembled, and segmented staging entries must be regular non-link files before reuse.
- Supported staging file opens use no-follow semantics, invalid link entries are cleaned without traversing external targets, and publication rejects a symbolic-link staging source.
- Native protocol 2 requires helper version 0.2.11+ plus the required integrity/recovery capabilities, including `staging-link-rejection`; the known-defective 0.2.10 helper is rejected.

## Deterministic and signed-runtime evidence

The source suite covers binary segmented assembly/publication, metadata trust, range integrity, no-overwrite publication, symlink safety, protocol compatibility, installer behavior, browser/native schedulers, lifecycle faults, retry snapshots, permission contracts, syntax, deterministic packaging, archive verification, and lifecycle-neutral packaged release labeling.

Governed Mozilla-signed 0.2.12 run `34176105690` validated exact source revision `2cc6d3bbe6ec2c63d49bec338bd68f154747be70`. Candidate SHA-256 was `779425b150921c1969462066a3e79cb345d976d11369a6891b5611c63a3d5537`; Mozilla-signed XPI SHA-256 was `4c02a152a258c4f8e76581ece2cb2a41f088463a4464354da0c374dfb2957f25`.

The signed XPI installed persistently in Firefox 155.0.1, survived a full browser process restart without reinstalling, reconnected to helper 0.2.11, automatically recovered the exact same native job through HTTP Range offsets inside preserved segments, completed binary publication at 67,108,864 bytes, matched source SHA-256 `a4a99d83daaac4823006cd3b14df26d1a256042591ad7d2f83e7ecbb203c342f`, cleaned original staging, and required zero manual Resume actions after restart.

## Release disposition

The signed-runtime security gate is satisfied for Stable 0.2.12. The product-specific seven-system applicability review is recorded in `PLATFORM_SYSTEM_RELEASE_REVIEW.md`; it does not claim Wardveil Security platform integration or other platform integration that is absent from the implementation.

Any later version that changes privileged browser surfaces, helper transport, filesystem behavior, permissions, authentication forwarding, or remote/control capabilities requires renewed security review and release evidence before replacing 0.2.12 as Stable.
