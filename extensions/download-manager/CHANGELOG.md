# Change Log — GoreeCloud Download Manager Extension

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
- Accepted native batch scheduler concurrency at `maxConcurrent = 3` on Firefox 155.0.1 / Flathub Flatpak. The controlled concurrency server reported exactly three active native download paths at the captured sample, each with eight HTTP Range workers, for `activeRequests = 24` and `peakRequests = 24`; controlled jobs 04 and 05 had not yet issued requests. The Manager later showed controlled jobs 01 through 05 complete at 64 MiB each with `native · 8 segments` badges. This accepts the three-managed-job native scheduler ceiling and confirms segment workers do not each consume a global managed-job slot. Independent hashes of those five 64 MiB outputs, Firefox-engine queue/pause/resume/notification behavior, and mixed-engine concurrency remain separate gates.

## 0.2.2 — Source candidate

- Added same-job recovery for interrupted or errored native downloads so the existing GoreeCloud job ID and `.goreecloud-downloads/<job-id>/` staging data are preserved.
- Added a recovery controller that verifies the native helper can be reached before requeueing a recoverable native job, preventing an unavailable helper from silently converting a recovery attempt into a Firefox fallback.
- Added background-context/startup reconciliation for native jobs persisted in stale active states. Paused and already-interrupted jobs remain user-controlled.
- Added explicit **Resume** treatment for recoverable native jobs in the popup and Manager while keeping ordinary Retry behavior for non-recoverable jobs.
- Added recovery-state UI messaging and suppressed misleading ETA output for paused/interrupted/error/cancelled/completed jobs in the Manager.
- Added Node-backed recovery controller tests covering same-ID progress preservation, browser-job exclusion, host-unavailable behavior, and stale-active startup recovery.
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

- Initial Firefox/native dual-engine prototype.
- Added pause/resume/cancel/retry and segmented HTTP range downloading.
