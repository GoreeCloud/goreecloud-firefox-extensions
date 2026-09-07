# Architecture — GoreeCloud Download Manager Extension

## Status

Version 0.2.9 source candidate. Unsigned; not Release Candidate or Stable.

## Components

### Firefox extension

The Manifest V3 extension owns user interaction, queue state, Firefox-download integration, settings, optional permission acquisition, notification behavior, Native Messaging coordination, scheduler-state hardening, native protocol compatibility validation, and recovery orchestration.

The queue is stored in `browser.storage.local`. Download jobs have a stable GoreeCloud job ID independent of Firefox's numeric `downloadId`, allowing queued and native jobs to share one managed state model. Jobs also receive a persistent monotonic `queueOrder` tie breaker. `createdAt` remains the primary ordering signal, while `queueOrder` preserves FIFO order for jobs whose timestamps are equal. Queue-sequence allocation reconciles against the highest persisted `queueOrder` before issuing a new position so an absent or stale sequence key cannot place a new/retried job behind already-persisted queue history.

### Firefox download engine

The browser engine starts and controls downloads with the Firefox `downloads` API. A queued browser job does not call `downloads.download()` until a concurrency slot becomes available. Paused browser downloads can re-enter the queue and resume when a slot is available.

GoreeCloud's managed job state and Firefox's underlying download state are related but not identical. A paused Firefox download can legitimately remain `queued` in GoreeCloud while it waits for a managed scheduler slot. The scheduler state adapter protects this distinction so an underlying Firefox paused snapshot does not overwrite the managed queue state.

Firefox launch allocation is also treated as an asynchronous lifecycle boundary. Before a new browser download has a numeric `downloadId`, the managed job enters `starting` with `launchPending`. Pause or cancel requests that occur during this interval are persisted and reconciled after Firefox returns the ID. If cancellation won the race, the newly allocated Firefox download is cancelled rather than becoming an unmanaged active transfer. If pause won, the allocated download is immediately paused and the managed job remains paused.

### Scheduler and lifecycle state adapter

`scheduler_hardening.js` is loaded after the primary background controller and recovery controller. It is a state-boundary adapter, not a third download engine.

Its current responsibilities include:

1. preserving GoreeCloud `queued` state for an existing paused Firefox download waiting for a resume slot;
2. suppressing intentional Firefox `USER_CANCELED` noise during pause and cancellation workflows;
3. treating managed `complete` and explicit `cancelled` states as immutable against late browser/native progress or terminal-state regression;
4. preventing stale Firefox or Native Messaging events from recreating removed managed jobs;
5. reconciling pause/cancel requests that arrive during Firefox download-ID allocation;
6. assigning durable same-timestamp FIFO queue-order tie breakers and reconciling the sequence allocator against persisted queue history;
7. preserving ordinary-retry engine, segment-count, retry-count, native-directory, and requested-filename snapshots from the source managed job;
8. normalizing requested filenames so clean relative subdirectories remain valid while absolute, traversal, UNC/Windows-style, control-character, reserved-character, trailing-space/dot, and reserved-device-name inputs cannot be replayed unsafely; and
9. suppressing duplicate `error`/`interrupted` notifications for the same unresolved problem incident.

The adapter does not reinterpret genuine remote or browser failures as successful operations. Real `error` and `interrupted` states remain problem states and continue to support notification and retry/recovery behavior.

Ordinary Retry and native same-job recovery remain distinct lifecycle operations. Ordinary Retry creates a fresh GoreeCloud job ID and fresh queue-tail position but carries forward the source job's effective transport/configuration snapshot. Native recovery retains the existing GoreeCloud job ID and job-scoped staging directory so partially downloaded segments can be reused after native validation succeeds.

Deterministic Node regressions load the real background scripts into a VM with mocked Firefox and Native Messaging APIs. Browser-only, mixed-engine, lifecycle-fault, and retry-snapshot harnesses verify scheduler ceilings, cross-engine slot promotion, same-download-ID resume, hostile cancellation event ordering, late-event finality, removed-job protection, queue ordering, settings-drift resistance, retry filename normalization, legacy absolute-destination compatibility, native protocol status, and notification behavior. These tests are source-level evidence and are distinct from target-device runtime acceptance.

### Native protocol compatibility contract

`native_protocol.js` is loaded **before** `background.js`. It defines the compatibility contract used before any Native Messaging `hello` frame can mark the native host ready. The protocol validator is therefore part of the initial background state machine rather than a post-start monkeypatch.

The 0.2.9 extension requires:

- native protocol version `2`;
- helper version `0.2.9` or newer while protocol 2 remains compatible; and
- the capabilities `segmented-range-integrity`, `same-job-recovery`, `no-overwrite-publish`, and `ephemeral-request-headers`.

A legacy helper without `protocolVersion`, an explicitly mismatched protocol, a helper below the minimum compatible version, or a protocol-2 helper missing any required capability is not marked ready. The handshake promise is rejected with an actionable reinstall message and the incompatible Native Messaging port is disconnected so the next connection attempt can discover a repaired helper.

For a valid handshake, the primary background controller records the helper version, protocol version, and advertised capabilities for status reporting. Settings exposes the validated helper version/protocol through **Test native helper**. The version/protocol gate applies to both initial startup `hello` and later reconnects because every newly created native port registers the same validated message handler.

Fresh native jobs retain the existing compatibility fallback to Firefox when the native helper cannot be used. Already-started native recovery remains different: the recovery controller protects the original native identity/staging boundary and does not silently convert a recovery attempt into a new Firefox download.

### Native segmented helper

The Python native host communicates over Firefox Native Messaging framing. The 0.2.9 helper emits a versioned `hello` record at startup and in response to `ping`, advertising protocol 2 and the capability set required by the extension.

The native helper independently validates that requested download transports are HTTP or HTTPS. For range-capable sources it divides a file into up to 32 bounded ranges and runs concurrent workers. Each worker persists its partial range under a job-scoped staging directory.

Native staging layout:

```text
<download-directory>/.goreecloud-downloads/<job-id>/
├── metadata.json
├── single.part
├── assembled.part
└── segment-000.part ...
```

`assembled.part` is transient and is used when segmented downloads are complete enough to assemble but have not yet been safely published to the final destination. `metadata.json` stores source and destination metadata but never cookies or other request credentials.

### Persisted staging trust boundary

0.2.9 makes a valid `metadata.json` record a prerequisite for reusing any persisted `single.part` or `segment-XXX.part` data. The helper no longer treats the mere presence of partial files as sufficient evidence that they belong to the current source/job identity.

The metadata loader accepts only a JSON object using metadata schema version `1`. The record must contain the exact current GoreeCloud `job_id`; its persisted `url` must be a canonical valid HTTP/HTTPS URL; `size` must be a non-boolean integer no smaller than `-1`; and `filename`, `destination`, `etag`, and `last_modified` must be strings or absent. Each accepted string value is bounded to 64 KiB.

Missing metadata, malformed JSON, non-object JSON, an unsupported metadata version, a different job ID, an invalid or non-canonical persisted URL, an invalid source-size type, or an invalid bounded-string field causes existing staged partial files to be discarded. The helper then writes a fresh valid metadata record before the replacement transfer proceeds.

If metadata passes structural validation, the existing source-identity checks still compare persisted/current URL, known source size, ETag, and Last-Modified before partial bytes are reused. Therefore structural validity is necessary but not sufficient for reuse. A changed source still invalidates the old partials.

This 0.2.9 boundary does **not** yet claim symlink/no-follow protection for staging directories or part files. Filesystem link substitution remains a separate hardening target and release boundary.

Resumed single downloads and segmented workers do not trust HTTP 206 status alone. The helper validates `Content-Range` syntax and requires the response start to match the exact requested resume offset. Segmented requests additionally require the response end to match the planned segment boundary, and any known total source size must match the probed source size. Bytes are appended only after these checks pass.

The native in-memory job registry is lock-protected. Repeated `start` messages for an already-known job do not create a second worker. A `resume` for a still-running job reuses that job. If the worker previously ended in a recoverable error, a same-ID `resume` can create a replacement in-memory job that reuses the existing job-scoped staging directory only after the persisted staging trust checks succeed. Completed and explicitly cancelled native jobs are not restarted by a later same-ID resume.

### Native destination publication

Native jobs reserve their selected destination paths before transfer workers begin so simultaneous jobs cannot both select the same not-yet-created filename merely because neither final file exists yet.

Downloaded content remains in the job-scoped staging directory until it has passed the applicable size/range checks. Final publication uses a no-overwrite same-filesystem link from staging into the destination directory. If another process creates the reserved destination between selection and publication, the commit receives a collision signal and GoreeCloud selects another collision-safe destination rather than opening the existing file with truncation semantics. The staging source is removed only after the no-overwrite destination publication succeeds.

Because staging is a child of the configured download directory, the current Linux implementation keeps staging and final publication on the same filesystem. Additional operating systems require their own validated publication strategy before native-host support is claimed there.

### Native recovery controller

The extension loads `recovery.js` after the primary background controller. Native staging is keyed by the GoreeCloud job ID, so recovery must preserve that ID to reuse partial segments.

For an interrupted or errored native job that previously started, the recovery controller:

1. verifies that the Native Messaging helper can complete its protocol-compatible handshake;
2. keeps the existing GoreeCloud job record and job ID;
3. requeues that same job as native without resetting transferred-byte metadata or segment configuration;
4. lets the primary queue controller issue a native `resume` message because `nativeStarted` remains true; and
5. allows the helper to reconstruct missing/dead in-memory state from the existing job-scoped staging directory, subject to the 0.2.9 metadata/source validation boundary before partial reuse.

0.2.7 closed a second recovery availability race. The initial helper preflight remains necessary, but the helper can still disappear between that preflight and the scheduler's actual launch. For an already-started native job, recovery therefore bypasses the normal new-job Firefox compatibility fallback: native launch failure propagates as a recoverable error and leaves the job's native identity/staging semantics intact. Fresh native jobs that have never started continue to use the existing compatibility fallback when the helper is unavailable.

0.2.8 made that preflight compatibility-aware. An old or capability-incomplete helper is treated as unavailable for native recovery instead of being allowed to resume staged data under a protocol contract it does not satisfy. 0.2.9 raises the same protocol-2 helper minimum to 0.2.9 because the persisted-staging trust correction lives in the helper.

When a non-persistent Firefox background context is recreated, native jobs persisted in stale active states (`starting`, `in_progress`, or `downloading`) are reconciled through the same same-ID recovery path. Explicitly paused jobs are not automatically resumed. Jobs already marked `interrupted` or `error` remain user-controlled until **Resume** is selected.

Target Firefox 155.0.1 / Flathub Flatpak testing has accepted the deliberate native-helper interruption path for an earlier candidate. During a controlled 256 MiB eight-segment transfer, terminating the native helper left the original job-scoped staging directory intact with `metadata.json` and all eight partial segment files. Resume completed successfully; the original staging directory was removed after assembly; the recovered file reproduced source SHA-256 `a6d72ac7690f53be6ae46ba88506bd97302a093f7108472bd9efc3cefda06484` exactly; and the collision-safe destination policy produced `goreecloud-range-test (1).bin` because the original filename already existed.

The same target environment has also accepted non-persistent background-context recreation recovery for the earlier candidate. During another controlled eight-segment transfer, job ID `4e877c53-cf58-40ff-a9d1-f632f1f72165` retained `metadata.json` and all eight segment files at 6,815,744 bytes each before background termination. Terminating the Firefox extension background script did not remove the job-scoped staging directory or partial segments; the native helper process remained present. Reopening the extension recreated the background context and the transfer subsequently completed to `goreecloud-range-test (2).bin`. The output reproduced the source SHA-256 exactly, byte-for-byte comparison passed, and staging was empty after successful completion.

These runtime tests accept helper-process interruption recovery and non-persistent background-context recovery for the earlier tested target baseline. The additional 0.2.7–0.2.9 recovery, protocol, and staging-trust behavior is deterministic source-level evidence until separately reproduced on the target runtime. Full-browser restart recovery remains a separate acceptance gate.

### Native host installation

The Linux installer copies the helper out of the source checkout into the durable user path:

```text
~/.local/lib/goreecloud-download-manager/goreecloud_download_manager_native.py
```

Firefox native-host registration is written to:

```text
~/.mozilla/native-messaging-hosts/goreecloud_download_manager.json
```

The installer replaces the manifest atomically, compiles the installed helper, and performs startup/ping Native Messaging frame validation. For the 0.2.9 source candidate, installation succeeds only if both hello records report helper version `0.2.9`, protocol `2`, and all required compatibility capabilities. The installed manifest authorizes only `download-manager@goreecloud.com`.

When Firefox is distributed as a Flatpak, native-host startup can traverse `org.freedesktop.portal.WebExtensions`. The installer reports whether that portal interface is visible and gives explicit Firefox portal-preference guidance rather than granting the confined browser arbitrary host command execution.

### Optional authenticated native downloads

Cookie forwarding is disabled by default. Firefox's `cookies` permission and `<all_urls>` host permission remain optional.

Permission acquisition occurs directly from the Settings page's **Grant optional cookie permission** click handler so `browser.permissions.request()` executes in Firefox's required user-action context. Save does not attempt to request this permission indirectly or after unrelated asynchronous work.

After explicit permission has been granted and cookie forwarding is enabled, the extension reads cookies matching only the target download URL at launch or resume time. It constructs a `Cookie` header in memory and sends that header through Native Messaging for the active request. The helper accepts only allowlisted `Cookie` and `Referer` headers, rejects CR/LF-bearing values, bounds each accepted value to 64 KiB, and does not persist request credentials in `metadata.json`.

Target Firefox 155.0.1 / Flathub Flatpak testing has accepted this path using a controlled cookie-protected range server. Before permission-backed forwarding, the server returned HTTP 401. After the explicit grant, it accepted one authenticated HEAD probe and eight authenticated HTTP 206 requests spanning the complete 256 MiB source. The final output matched source SHA-256 `a6d72ac7690f53be6ae46ba88506bd97302a093f7108472bd9efc3cefda06484` exactly. Native staging and extension `browser.storage.local` scans both passed the controlled test-credential non-persistence checks.

Detailed evidence is maintained in `docs/AUTHENTICATED_COOKIE_ACCEPTANCE.md`.

## Current boundaries

The native helper currently supports HTTP/HTTPS GET-style downloads. It does not reproduce arbitrary browser request bodies, JavaScript execution, DRM, service-worker state, anti-bot challenge flows, or every form of authorization header generation.

Ordinary retry preserves the source managed job's effective engine and relevant configuration snapshot but creates a fresh GoreeCloud job ID and does not reuse partial segment staging. Native same-job recovery is the separate identity-preserving path for interrupted/errored native transfers with reusable staged partial data.

The 0.2.4–0.2.9 browser, mixed-engine, lifecycle-race, retry-snapshot, native-range-integrity, no-overwrite-publication, recovery-fault, protocol-compatibility, and staging-metadata regressions are deterministic source-level validation. They do not replace a real target-device gate when a behavior materially depends on Firefox/Flatpak/native-host runtime state.

The current native staging code does not yet establish formal no-follow/symlink-hardening semantics for staging paths. That filesystem edge remains open.

Mozilla signing is outside the download engine. An unsigned candidate may be loaded temporarily for development but is not a persistent Stable Firefox release.
