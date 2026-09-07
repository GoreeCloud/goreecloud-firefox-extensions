# Change Log — GoreeCloud Download Manager Extension

## 0.2.2 — Source candidate

- Added same-job recovery for interrupted or errored native downloads so the existing GoreeCloud job ID and `.goreecloud-downloads/<job-id>/` staging data are preserved.
- Added a recovery controller that verifies the native helper is reachable before requeueing a recoverable native job, preventing an unavailable helper from silently converting a recovery attempt into a Firefox fallback.
- Added background-context/startup reconciliation for native jobs persisted in stale active states. Paused and already-interrupted jobs remain user-controlled.
- Added explicit **Resume** treatment for recoverable native jobs in the popup and Manager while keeping ordinary Retry behavior for non-recoverable jobs.
- Added recovery-state UI messaging and suppressed misleading ETA output for paused/interrupted/error/cancelled/completed jobs in the Manager.
- Added Node-backed recovery controller tests covering same-ID progress preservation, browser-job exclusion, host-unavailable behavior, and stale-active startup recovery.
- Carried forward the accepted Firefox 155.0.1 8-segment transfer evidence from 0.2.1. Runtime restart-recovery acceptance remains pending until the 0.2.2 candidate is exercised on the target browser.

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
