# Change Log — GoreeCloud Download Manager Extension

## 0.2.7 — Source candidate

- Hardened the native helper so its own transport boundary accepts only HTTP and HTTPS URLs with a network host, independently of the extension-side URL validator.
- Treats persisted native staging metadata for a different URL as stale source identity and discards old partial files before starting the replacement source.
- Added strict `Content-Range` validation for resumed single transfers and segmented HTTP 206 workers: requested start, requested end, and known total source size must agree before response bytes are appended.
- Added same-helper same-ID recovery for native jobs whose earlier worker thread ended in `error`, while keeping duplicate active `start` requests idempotent and refusing to restart completed or explicitly cancelled native jobs.
- Hardened the extension recovery boundary so an already-started native recovery cannot silently fall back to a new Firefox download if the helper becomes unavailable between recovery preflight and queue launch. Fresh native jobs retain the existing compatibility fallback behavior.
- Serialized access to the native in-memory job registry and added destination reservations so parallel native jobs cannot choose the same not-yet-created destination path.
- Changed final native publication to a no-overwrite commit from a staging file. If another process creates the selected destination after reservation, GoreeCloud selects a collision-safe alternate instead of truncating or replacing the external file.
- Segmented assembly now completes under the job-scoped staging directory before the final no-overwrite destination commit.
- Added a 64 KiB bound for each allowlisted forwarded native request-header value in addition to the existing Cookie/Referer allowlist and CR/LF rejection.
- Advanced the separately installed native helper protocol/version presentation to 0.2.7.
- Expanded deterministic native-core tests for transport validation, stale-source staging invalidation, exact partial-response semantics, destination reservation, no-overwrite finalization, live/dead/terminal same-ID recovery behavior, and duplicate-start handling.
- Expanded deterministic recovery-controller tests to prove that recovery launch failure propagates without compatibility fallback while fresh native jobs retain compatibility fallback.
- This is deterministic source-level hardening. It does not independently establish target-device 0.2.7 native-helper acceptance, full-browser restart recovery, Mozilla signing, persistent signed installation, Release Candidate status, or Stable status.

## 0.2.6 — Source candidate

- Preserved ordinary retry configuration snapshots so a retried job keeps the original effective browser/native engine assignment instead of silently inheriting a later Settings engine change.
- Preserved the source job's native segment count, retry count, and destination directory across Settings drift.
- Made Retry prefer the original `requestedFilename` over a later absolute destination reported through Firefox/native telemetry; legacy jobs without `requestedFilename` remain compatible through safe basename fallback.
- Hardened requested-filename normalization across Unix absolute paths, Windows drive paths, UNC/backslash paths, home-relative paths, traversal inputs, control characters, cross-platform reserved filename characters, trailing spaces/dots, and Windows reserved device names while preserving clean relative subdirectories.
- Made queue-sequence allocation migration-safe by reconciling the sequence key against the highest persisted `queueOrder` before allocating a new queue-tail position.
- Added deterministic Node retry-snapshot regression coverage for requested-filename normalization, traversal/absolute/UNC reduction, clean relative-subdirectory preservation, Settings drift, engine/native-configuration snapshot preservation, legacy absolute Firefox destination compatibility, and retry queue-tail sequencing.
- Added the retry-snapshot regression to Firefox Repository CI and advanced manifest, inventory, Settings presentation, README, and changelog to 0.2.6 source-candidate state.
- This is deterministic source hardening. It does not independently claim target-device retry-race acceptance, Mozilla signing, persistent signed installation, full-browser restart/native-host acceptance, Release Candidate status, or Stable status.

## 0.2.5 — Source candidate

- Hardened explicit cancellation so the managed `cancelled` state remains authoritative when Firefox emits synchronous or delayed `USER_CANCELED` / `interrupted` events as part of the underlying browser cancellation.
- Made completed and explicitly cancelled managed jobs resistant to late Firefox/native progress or terminal-state regressions.
- Prevented late Firefox or Native Messaging events from recreating jobs that the user has already removed from managed history.
- Added durable monotonic `queueOrder` sequencing so jobs created in the same millisecond retain deterministic FIFO ordering instead of relying on storage enumeration order.
- Added requested-filename normalization for ordinary retries. If Firefox previously reported an absolute completed destination path, retry reduces it to a safe relative basename before calling `browser.downloads.download()`.
- Added explicit launch-pending handling so pause/cancel requests that arrive while Firefox is still allocating a numeric download ID are reconciled after the ID is returned rather than being lost.
- Added failure-notification de-duplication across `error` and `interrupted` transitions belonging to the same unresolved problem incident. Native recovery already clears the terminal notification marker before a new recovery attempt.
- Added deterministic Node lifecycle-fault coverage using the real extension background scripts with mocked Firefox and Native Messaging APIs, including deliberately hostile synchronous cancellation-event ordering.
- Added the lifecycle-fault regression to repository CI alongside the existing Firefox scheduler, mixed-engine scheduler, native-core, syntax, deterministic packaging, and archive-verification checks.
- This is assistant-performed deterministic source validation. It does not claim target-device cancellation-race acceptance, Mozilla signing, persistent signed installation, full-browser restart/native-host acceptance, Release Candidate status, or Stable status.

## 0.2.4 — Source candidate

- Hardened Firefox-engine resume scheduling so a paused Firefox download that is requeued while all managed slots are occupied remains in GoreeCloud's `queued` state instead of being overwritten back to `paused` by Firefox's underlying paused snapshot.
- Added suppression of Firefox `USER_CANCELED` noise while a managed Firefox job is intentionally paused or waiting in the queue for a resume slot, preventing misleading failure text during normal pause/resume operation.
- Added `scheduler_hardening.js` as a post-background state adapter so the scheduler can preserve its managed queue semantics without changing Firefox's underlying paused download until a slot is actually available.
- Added an automated Node regression harness with a mocked Firefox `downloads` API. It validates the initial 3-active / 2-queued ceiling, single-job pause-driven promotion, resume-while-full queue retention, resistance to paused Firefox snapshots/deltas, existing-download resume when a slot opens, no replacement download creation, and completion notification emission.
- Added the Firefox scheduler regression harness to repository CI and advanced manifest, inventory, and Settings version presentation to 0.2.4 source-candidate state.
- 0.2.4 remains unsigned Active Development. Runtime signing, persistent signed installation, full-browser restart acceptance, and remaining mixed-engine stress gates remain separate release requirements.

## 0.2.3 — Source candidate

- Fixed Firefox optional cookie-permission acquisition so `browser.permissions.request()` is invoked directly from the Settings-page **Grant optional cookie permission** click handler, preserving Firefox's required user-action context.
- Removed the Save-path attempt to request permission after an asynchronous permission-status check; Save now refuses to enable cookie forwarding until the explicit Grant flow succeeds.
- Added Settings status messaging for granted, refused, and failed optional-permission requests.
- Added permission-change listeners so the Settings status refreshes when Firefox grants or removes the optional permission.
- Added source-contract tests that keep `cookies` and `<all_urls>` optional and verify the request stays directly bound to the user click handler.
- This change was triggered by Firefox 155.0.1 / Flathub Flatpak runtime testing in which the 0.2.2 Settings button produced no permission prompt because the request was delegated through the background message handler.
- Accepted the corrected 0.2.3 authenticated-cookie path on Firefox 155.0.1 / Flathub Flatpak. A protected controlled endpoint first rejected unauthenticated access with HTTP 401; after the explicit optional permission grant, the native helper completed an authenticated HEAD probe and eight authenticated HTTP 206 byte-range requests covering the entire 256 MiB source.
- Accepted authenticated output integrity: `goreecloud-auth-range-test.bin` matched source SHA-256 `a6d72ac7690f53be6ae46ba88506bd97302a093f7108472bd9efc3cefda06484` exactly and byte-for-byte comparison reported `AUTHENTICATED FILE INTEGRITY: PASS`.
- Accepted credential non-persistence for the controlled test credential: native staging scan reported `NATIVE COOKIE PERSISTENCE: PASS`, extension `browser.storage.local` scan reported `BROWSER COOKIE PERSISTENCE: PASS`, and native staging was empty after successful completion.
- Accepted native batch scheduler concurrency at `maxConcurrent = 3` on Firefox 155.0.1 / Flathub Flatpak. The controlled concurrency server reported exactly three active native download paths at the captured sample, each with eight HTTP Range workers, for `activeRequests = 24` and `peakRequests = 24`; controlled jobs 04 and 05 had not yet issued requests. The Manager later showed controlled jobs 01 through 05 complete at 64 MiB each with `native · 8 segments` badges. This accepts the three-managed-job native scheduler ceiling and confirms segment workers do not each consume a global managed-job slot.
- Accepted independent integrity for all five controlled 64 MiB native-concurrency outputs. The deterministic source SHA-256 was `3b6a07d0d404fab4e23b6d34bc6696a6a312dd92821332385e5af7c01c421351`; files `goreecloud-concurrency-01.bin` through `goreecloud-concurrency-05.bin` each reproduced that SHA-256 exactly, every byte-for-byte `cmp` check reported `INTEGRITY: PASS`, and the aggregate result was `ALL FIVE CONCURRENCY FILES: PASS`.
- Accepted the initial Firefox downloads-engine concurrency gate at `maxConcurrent = 3` on Firefox 155.0.1 / Flathub Flatpak. A five-URL controlled batch presented `3 Active`, `2 Queued`, and `0 Completed` with Firefox engine badges; the server independently reported exactly three active paths, `activeRequests = 3`, and `peakRequests = 3`. After jobs 01–03 completed, queued jobs 04–05 were promoted and became the only two active requests while `peakRequests` remained 3. Browser-engine pause/resume slot behavior, notifications, and mixed-engine concurrency remain separate gates.

## 0.2.2 — Source candidate

- Added same-job recovery for interrupted or errored native downloads so the existing GoreeCloud job ID and `.goreecloud-downloads/<job-id>/` staging data are preserved.
- Added a recovery controller that verifies the native helper is reachable before requeueing a recoverable native job, preventing an unavailable-helper recovery attempt from being silently converted into a Firefox fallback.
- Added background-context/startup reconciliation for native jobs persisted in stale active states. Paused and already-interrupted jobs remain user-controlled.
- Added explicit **Resume** treatment for recoverable native jobs in the popup and Manager while keeping ordinary Retry behavior for non-recoverable jobs.
- Added recovery-state UI messaging and suppressed misleading ETA output for paused/interrupted/error/cancelled/completed jobs in the Manager.
- Added Node-backed recovery controller tests covering same-ID progress preservation, browser-job exclusion, unavailable-helper behavior, and stale-active startup recovery.
- Carried forward the accepted Firefox 155.0.1 8-segment transfer evidence from 0.2.1.
- Accepted deliberate native-helper interruption recovery on Firefox 155.0.1 / Flathub Flatpak: the helper was terminated during an active eight-segment transfer, the original job-scoped staging directory retained `metadata.json` plus eight partial segments, **Resume** completed successfully, the original staging directory was cleaned after assembly, and the recovered output matched source SHA-256 `a6d72ac7690f53be6ae46ba88506bd97302a093f7108472bd9efc3cefda06484` byte-for-byte.
- Accepted collision-safe native naming in the same recovery run: because `goreecloud-range-test.bin` already existed, completion produced `goreecloud-range-test (1).bin` without overwriting the earlier file.
- Accepted non-persistent Firefox background-context recovery on Firefox 155.0.1 / Flathub Flatpak. Before background termination, job ID `4e877c53-cf58-40ff-a9d1-f632f1f72165` retained `metadata.json` plus eight segment files, each at 6,815,744 bytes. After terminating the extension background script, the native helper process remained present and the same staging directory and segment files remained intact. Reopening the extension recreated the background context and the transfer completed to collision-safe output `goreecloud-range-test (2).bin`; its SHA-256 matched the source exactly, byte-for-byte comparison reported `BACKGROUND RECOVERY INTEGRITY: PASS`, and native staging was empty after completion.
- Full-browser restart recovery remains a separate runtime acceptance gate.

## 0.2.1 — Source candidate

- Hardened the Linux native-host installer around the validated durable user install path `~/.local/lib/goreecloud-download-manager/` instead of pointing Firefox at a source-checkout path.
- Added atomic native-messaging manifest replacement and an installer-side Python compile + Native Messaging hello/ping self-test.
- Added `--uninstall` support for the user-scoped Linux helper and manifest.
- Added Firefox Flatpak detection and WebExtensions XDG portal diagnostics, including guidance for `widget.use-xdg-desktop-portal.native-messaging` when a confined Firefox build cannot discover the helper.
- Added installer contract tests to repository CI.
- Recorded successful target Firefox 155.0.1 temporary-load, UI-render, native-host protocol, Flatpak portal authorization, and extension-to-native-host handshake evidence for the accepted 0.2.0 baseline.
- Added explicit popup engine/segment visibility and native-to-Firefox fallback diagnostics so live acceptance testing can distinguish Firefox downloads from true segmented native jobs.
- Suppressed misleading paused-state ETA presentation in the popup.

## 0.2.0 — Source candidate

- Adopted fixed Firefox add-on ID `download-manager@goreecloud.com`.
- Added canonical GoreeCloud product icon and manifest/action icons.
- Implemented real global concurrent-download queueing.
- Added batch queueing, pause-all, resume-all, clear-completed, search, and state filtering.
- Added rolling speed and ETA presentation.
- Added job-scoped native staging and collision-safe native destinations.
- Added source-change checks before native partial resume.
- Added optional cookie forwarding with explicit optional Firefox permission.
- Added native request-header filtering and newline rejection.
- Added completion/failure notifications and richer native telemetry.
- Reworked popup, manager, and settings UI.
- Expanded native-core tests and deterministic XPI packaging.

## 0.1.0 — Prototype