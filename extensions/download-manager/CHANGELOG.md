# Change Log — GoreeCloud Download Manager Extension

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
