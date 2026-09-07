# GoreeCloud Download Manager Extension

**Status:** 0.2.0 source candidate — unsigned, not Stable

GoreeCloud Download Manager Extension is a Firefox Manifest V3 download-management extension with queueing, pause/resume, retries, batch URL input, download telemetry, and an optional Linux native helper for segmented HTTP range downloads and durable partial-file resume.

## Implemented in 0.2.0

- Firefox download-engine mode.
- Optional segmented native-engine mode with 1–32 HTTP byte-range workers.
- Global concurrent-download queue that enforces the configured limit.
- Pause, resume, cancel, retry, pause-all, resume-all, and clear-completed actions.
- Batch URL queueing and link/media context-menu capture.
- Live progress, rolling speed estimates, ETA, queue position, engine state, and effective segment count.
- Persistent native staging under `.goreecloud-downloads/<job-id>/` with source-validator checks.
- Collision-safe final filenames for native downloads.
- Optional cookie forwarding for authenticated native downloads. This capability is disabled by default and requires an explicit Firefox optional permission grant.
- Completion/failure notifications.
- GoreeCloud product icon and updated Glaze-aligned Firefox UI.
- Firefox add-on ID: `download-manager@goreecloud.com`.
- Native messaging host: `goreecloud_download_manager`.

## Architecture

The extension uses two download engines:

1. **Firefox engine** — uses Firefox's `downloads` API for normal downloads and maximum browser compatibility.
2. **Native segmented engine** — uses Firefox Native Messaging to control a local Python helper. The helper probes HTTP range support, downloads byte ranges concurrently, preserves partial files for resume, validates source changes with ETag/Last-Modified/size information, and assembles the final file.

The native helper is not packaged inside the XPI. It is installed separately on the local Linux system.

## Install for development

Load the unsigned XPI or `extensions/download-manager/manifest.json` from `about:debugging` → **This Firefox** → **Load Temporary Add-on**.

For native acceleration on Linux:

```bash
./extensions/download-manager/scripts/install-native-host-linux.sh
```

Then open extension settings, select **Native segmented helper**, and use **Test native helper**.

## Cookie forwarding

Cookie forwarding is off by default. If enabled, Firefox asks for the optional Cookies + All Sites permission. The extension reads cookies only for the target download URL at launch/resume time and forwards them to the native helper through Native Messaging. Cookie values are not written to the extension's download-history records or native staging metadata.

This improves compatibility with cookie-authenticated downloads but does not guarantee support for sites that require request bodies, anti-bot challenges, expiring signed headers, DRM, JavaScript-generated tokens, or other browser-only request state.

## Packaging

From the canonical `GoreeCloud/goreecloud-firefox-extensions` repository root:

```bash
python shared/scripts/package_extension.py download-manager
```

The resulting `dist/goreecloud-download-manager-0.2.0.xpi` is deterministic and unsigned. Packaging success is not Mozilla signing and does not make the version Stable.

## Validation

```bash
node --check extensions/download-manager/background.js
node --check extensions/download-manager/ui/popup.js
node --check extensions/download-manager/ui/manager.js
node --check extensions/download-manager/ui/options.js
python -m py_compile extensions/download-manager/native-host/goreecloud_download_manager_native.py
python -m unittest discover -s extensions/download-manager/tests -p 'test_*.py'
python shared/scripts/validate_repository.py
python shared/scripts/package_extension.py download-manager
```

## Release state

0.2.0 remains a source candidate until the canonical Firefox repository accepts the source, target-environment runtime tests pass, Mozilla signing completes, the signed artifact installs persistently in the target Firefox build, restart behavior is verified, native-host integration is revalidated against the signed add-on ID, and the release is explicitly promoted.
