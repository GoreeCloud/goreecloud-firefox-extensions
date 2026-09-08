# Architecture — GoreeCloud Download Manager Extension

## Status

Version 0.2.11 source candidate. Unsigned; not Release Candidate or Stable.

## Firefox extension

The Manifest V3 extension owns user interaction, queue state, Firefox-download integration, settings, optional-permission acquisition, notifications, Native Messaging coordination, scheduler-state hardening, native protocol compatibility validation, and recovery orchestration.

Managed jobs are stored in `browser.storage.local` with stable GoreeCloud job IDs independent of Firefox numeric download IDs. A persistent monotonic `queueOrder` provides deterministic FIFO tie-breaking when creation timestamps are equal; the allocator reconciles persisted history before issuing new order values.

### Firefox download engine

The browser engine uses Firefox's `downloads` API. A queued browser job does not call `downloads.download()` until a managed scheduler slot exists. A paused Firefox download can remain `queued` in GoreeCloud while waiting for a resume slot, and scheduler hardening prevents underlying paused snapshots from overwriting that managed state.

Firefox download-ID allocation is asynchronous. `starting`/`launchPending` state retains pause/cancel requests that occur before a numeric ID exists and reconciles them once Firefox returns the ID.

### Scheduler/lifecycle adapter

`scheduler_hardening.js` preserves managed queue semantics across Firefox/native events. It covers resume-while-full queue retention, intentional `USER_CANCELED` suppression, terminal-state finality, removed-job resurrection protection, launch-pending pause/cancel reconciliation, deterministic queue ordering, retry snapshot preservation, requested-filename normalization, and failure-notification de-duplication.

Ordinary Retry creates a new GoreeCloud job at the queue tail while preserving the source engine/configuration/requested-filename snapshot. Native recovery is a separate identity-preserving operation that retains the existing GoreeCloud job ID and staging directory.

## Native protocol compatibility

`native_protocol.js` loads before `background.js` and validates each Native Messaging `hello` before a helper can become ready.

The 0.2.11 extension requires:

- native protocol version `2`;
- helper version `0.2.11` or newer while protocol 2 remains compatible; and
- capabilities `segmented-range-integrity`, `same-job-recovery`, `no-overwrite-publish`, `ephemeral-request-headers`, and `staging-link-rejection`.

0.2.10 is deliberately below the minimum even though it speaks protocol 2, because governed signed-restart testing exposed a final segmented-publication defect in that helper line. Legacy, protocol-mismatched, too-old, or capability-incomplete helpers fail closed with reinstall guidance. Fresh native jobs retain Firefox compatibility fallback when native startup is unavailable; already-started same-job native recovery does not silently become a fresh Firefox transfer.

## Native segmented helper

The Python helper supports HTTP/HTTPS GET-style transfers. Range-capable sources can use up to 32 workers. Partial state is persisted under:

```text
<download-directory>/.goreecloud-downloads/<job-id>/
├── metadata.json
├── single.part
├── assembled.part
└── segment-000.part ...
```

`metadata.json` stores source/destination identity metadata but never forwarded request credentials.

### Metadata/source trust boundary

Persisted bytes are reusable only when `metadata.json` passes the supported schema contract: schema version 1, exact job ID, canonical HTTP/HTTPS URL, valid source-size type, and bounded string/null filename/destination/ETag/Last-Modified fields. Missing/invalid metadata invalidates transfer parts.

A structurally valid record then passes URL, known source size, ETag, and Last-Modified checks. Structural validity is necessary but not sufficient for byte reuse.

### 0.2.10 staging filesystem boundary retained by 0.2.11

The Linux helper rejects symbolic-link substitution at the persistent staging boundary:

1. `.goreecloud-downloads` must be a real directory, not a link;
2. `<job-id>` staging must be a real directory, not a link;
3. metadata, single-part, segment, and assembled entries must be regular files before reuse;
4. final-path inspection uses `lstat` semantics;
5. file opens use `O_NOFOLLOW` where supported;
6. metadata writes use an exclusive job-local temporary regular file, flush/fsync, destination-link rejection, and atomic replacement;
7. invalid-staging cleanup removes link entries without following their targets;
8. segmented assembly reads/writes use the same validated no-follow helpers; and
9. final publication validates a regular non-link staging source and calls `os.link(..., follow_symlinks=False)`.

The helper advertises `staging-link-rejection`, making this behavior part of the extension/helper compatibility contract rather than an implicit implementation detail.

These controls materially reduce link-following risk but do not claim protection from every possible same-user filesystem race between all individual system calls.

### Range integrity and final publication

Resumed and segmented requests require valid HTTP 206 `Content-Range` responses matching the requested start, planned end where applicable, and known total source size. Bytes are not appended before these checks pass.

Native jobs reserve destination paths to prevent simultaneous name selection. Segmented content assembles to job-local `assembled.part` using a binary-exclusive (`xb`) no-follow stream, then final publication uses a no-overwrite same-filesystem link. Destination collision after reservation selects another collision-safe name instead of truncating/replacing an external file.

0.2.11's binary-exclusive assembly mode fixes the defect found in the signed 0.2.10 restart diagnostic, where all recovered bytes reached staging but text-mode assembly rejected byte writes before final publication.

### Native recovery

For an interrupted/errored native job that already started, recovery:

1. verifies a protocol-compatible helper;
2. preserves the same GoreeCloud job record and ID;
3. requeues the same native identity with its configuration/progress metadata;
4. sends `resume` when the global scheduler grants a slot; and
5. permits helper reconstruction only through validated job-scoped staging state.

A live same-ID native worker is reused. A dead recoverable error worker can be reconstructed. Completed/cancelled jobs are not restarted. Duplicate `start` is idempotent.

## Optional authenticated native downloads

Cookie forwarding is disabled by default. Firefox's `cookies` and `<all_urls>` permissions remain optional and are requested only from the explicit Settings user action. Target cookies are read at launch/resume time and forwarded in memory. The native helper allows only bounded `Cookie` and `Referer` headers and rejects CR/LF-bearing values.

The earlier Firefox 155.0.1 / Flathub Flatpak controlled test accepted the authenticated native path with exact final integrity and controlled credential non-persistence.

## Native host installation

Linux installs the helper to:

```text
~/.local/lib/goreecloud-download-manager/goreecloud_download_manager_native.py
```

and the manifest to:

```text
~/.mozilla/native-messaging-hosts/goreecloud_download_manager.json
```

The installer performs compile plus startup/ping protocol validation and requires helper version 0.2.11/protocol 2/all required capabilities. Firefox Flatpak can use the XDG `org.freedesktop.portal.WebExtensions` path.

## Validation model

Deterministic Python/Node regressions exercise native core behavior, binary segmented assembly/publication, staging metadata trust, staging-link rejection, recovery behavior, browser scheduler, mixed scheduler, lifecycle faults, retry snapshots, permission contracts, installer/protocol contracts, source syntax, deterministic XPI packaging, and archive exclusion.

Earlier target Firefox 155.0.1 / Flatpak evidence remains accepted only for the actually tested runtime baseline. The signed 0.2.10 restart diagnostic additionally established persistent install/restart and same-job range recovery up to complete staging bytes, but its publication failure prevents treating that run as release acceptance. 0.2.11's fix remains source-level until exact-head CI and the new signed restart gate pass.

## Current boundaries

The native helper does not reproduce arbitrary request bodies, JavaScript execution, DRM, anti-bot challenge state, service-worker authorization, or every browser-only credential mechanism. Windows and macOS native helper support are not implemented.

Mozilla signing is outside the engine implementation. A temporary unsigned candidate is not a persistent Stable Firefox release. Stable promotion requires successful source validation, required Platform-System release review, Mozilla signing, persistent signed-install/restart recovery with exact final integrity, retained provenance, and explicit lifecycle/documentation promotion.
