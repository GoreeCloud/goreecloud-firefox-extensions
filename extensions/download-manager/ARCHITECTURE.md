# Architecture — GoreeCloud Download Manager Extension

## Status

Version **0.2.11 Stable**. The accepted Firefox artifact is Mozilla-signed and passed persistent-install/full-browser-restart/native-recovery acceptance in GitHub Actions run `34174320808`.

## Firefox extension

The Manifest V3 extension owns user interaction, queue state, Firefox-download integration, settings, optional-permission acquisition, notifications, Native Messaging coordination, scheduler-state hardening, native protocol compatibility validation, and recovery orchestration.

Managed jobs are stored in `browser.storage.local` with stable GoreeCloud job IDs independent of Firefox numeric download IDs. A persistent monotonic `queueOrder` provides deterministic FIFO tie-breaking when creation timestamps are equal and is reconciled against persisted history before new order values are allocated.

### Firefox download engine

The browser engine uses Firefox's `downloads` API. A queued browser job does not call `downloads.download()` until a managed scheduler slot exists. A paused Firefox download can remain `queued` in GoreeCloud while waiting for a resume slot, and scheduler hardening prevents underlying paused snapshots from overwriting that managed state.

Firefox download-ID allocation is asynchronous. `starting`/`launchPending` state retains pause/cancel requests that occur before a numeric ID exists and reconciles them once Firefox returns the ID.

### Scheduler and lifecycle hardening

`scheduler_hardening.js` preserves managed queue semantics across Firefox/native events. It covers resume-while-full queue retention, intentional `USER_CANCELED` suppression, terminal-state finality, removed-job resurrection protection, launch-pending pause/cancel reconciliation, deterministic queue ordering, retry snapshot preservation, requested-filename normalization, and failure-notification de-duplication.

Ordinary Retry creates a new GoreeCloud job at the queue tail while preserving the source engine/configuration/requested-filename snapshot. Native recovery is a separate identity-preserving operation that retains the existing GoreeCloud job ID and staging directory.

## Native protocol compatibility

`native_protocol.js` loads before `background.js` and validates each Native Messaging `hello` before a helper can become ready.

The Stable 0.2.11 extension requires:

- native protocol version `2`;
- helper version `0.2.11` or newer while protocol 2 remains compatible; and
- capabilities `segmented-range-integrity`, `same-job-recovery`, `no-overwrite-publish`, `ephemeral-request-headers`, and `staging-link-rejection`.

0.2.10 is deliberately below the minimum even though it speaks protocol 2 because governed signed-restart testing exposed a final segmented-publication defect in that helper line. Legacy, protocol-mismatched, too-old, or capability-incomplete helpers fail closed with reinstall guidance.

Fresh native jobs retain Firefox compatibility fallback when native startup is unavailable. Already-started same-job native recovery does not silently become a fresh Firefox transfer.

## Native segmented helper

The Python helper supports HTTP/HTTPS GET-style transfers. Range-capable sources can use up to 32 workers. Partial state is persisted under:

```text
<download-directory>/.goreecloud-downloads/<job-id>/
├── metadata.json
├── single.part
├── assembled.part
└── segment-000.part ...
```

`metadata.json` stores source/destination identity metadata but not forwarded request credentials.

### Metadata and source trust boundary

Persisted bytes are reusable only when `metadata.json` passes the supported schema contract: schema version 1, exact job ID, canonical HTTP/HTTPS URL, valid source-size type, and bounded string/null filename/destination/ETag/Last-Modified fields. Missing or invalid metadata invalidates transfer parts.

A structurally valid record then passes URL, known source size, ETag, and Last-Modified checks before reuse.

### Staging filesystem boundary

The Linux helper rejects symbolic-link substitution at the persistent staging boundary. The staging root and per-job directory must be real directories, metadata/part/assembled entries must be regular non-link files before reuse, supported file opens use `O_NOFOLLOW`, metadata replacement uses an exclusive temporary regular file plus flush/fsync and atomic replacement, invalid link entries are removed without following targets, and final publication validates the staging source before using `os.link(..., follow_symlinks=False)`.

These controls materially reduce link-following risk but do not claim protection from every possible same-user filesystem race between all individual system calls.

### Range integrity and final publication

Resumed and segmented requests require valid HTTP 206 `Content-Range` responses matching the requested start, planned end where applicable, and known total source size. Bytes are not appended before those checks pass.

Native jobs reserve destination paths to prevent simultaneous name selection. Segmented content assembles to job-local `assembled.part` using a binary-exclusive (`xb`) no-follow stream, then final publication uses a no-overwrite same-filesystem link. Destination collision after reservation selects another collision-safe name instead of truncating or replacing an external file.

The binary-exclusive assembly mode is the 0.2.11 correction for the defect found by the signed 0.2.10 restart diagnostic, where all recovered bytes reached staging but text-mode assembly rejected byte writes before final publication.

### Native recovery

For an interrupted or errored native job that already started, recovery verifies a compatible helper, preserves the same managed job record and ID, requeues that identity with its configuration/progress metadata, sends `resume` when the global scheduler grants a slot, and permits helper reconstruction only through validated job-scoped staging state.

A live same-ID native worker is reused. A dead recoverable error worker can be reconstructed. Completed and cancelled jobs are not restarted. Duplicate `start` is idempotent.

## Optional authenticated native downloads

Cookie forwarding is disabled by default. Firefox's `cookies` and `<all_urls>` permissions remain optional and are requested only from the explicit Settings user action. Target cookies are read at launch/resume time and forwarded in memory. The native helper allows only bounded `Cookie` and `Referer` headers and rejects CR/LF-bearing values.

Earlier Firefox 155.0.1 / Flathub Flatpak controlled testing accepted the authenticated native path with exact final integrity and controlled credential non-persistence.

## Stable release evidence

The accepted runtime source is revision `7a9c33e5e194a05b792c1aa902c72b72f9fdf1fe`. It passed the 71-test/source-contract suite plus browser and mixed schedulers, lifecycle faults, retry snapshots, syntax checks, deterministic packaging, and archive verification.

Mozilla signing run `34174320808` produced candidate SHA-256 `8dab36b259a2837b8218ef2b45af57f0698870a8e15424e66df54db528e34f7d` and signed XPI SHA-256 `074d901fa18d66ec5d5ee55bcacdfbf066567eec02902f5c6d2c43a361a75830`.

The Mozilla-signed extension survived a complete Firefox 155.0.1 process restart without reinstalling, automatically recovered the same native job through preserved non-boundary HTTP Range offsets, completed 67,108,864 bytes with zero manual Resume actions, reproduced SHA-256 `a4a99d83daaac4823006cd3b14df26d1a256042591ad7d2f83e7ecbb203c342f`, cleaned original staging, and reconnected the matching 0.2.11 helper.

## Current boundaries

The native helper does not reproduce arbitrary request bodies, JavaScript execution, DRM, anti-bot challenge state, service-worker authorization, or every browser-only credential mechanism. Windows and macOS native-helper support are not implemented.

Stable status applies to 0.2.11 and the accepted evidence above. Any later runtime change must repeat the appropriate source validation, Platform-System review, Mozilla signing, runtime acceptance, integrity, and lifecycle-documentation gates.
