# GoreeCloud Download Manager Extension

**Status:** 0.2.4 source candidate — unsigned, not Stable

GoreeCloud Download Manager Extension is a Firefox Manifest V3 download-management extension with queueing, pause/resume, retries, batch URL input, download telemetry, and an optional Linux native helper for segmented HTTP range downloads and durable partial-file resume.

## Implemented

- Firefox download-engine mode.
- Optional segmented native-engine mode with 1–32 HTTP byte-range workers.
- Global concurrent-download queue that enforces the configured limit.
- Pause, resume, cancel, retry, pause-all, resume-all, and clear-completed actions.
- Batch URL queueing and link/media context-menu capture.
- Live progress, rolling speed estimates, ETA, queue position, engine state, and effective segment count.
- Persistent native staging under `.goreecloud-downloads/<job-id>/` with source-validator checks.
- Same-job native recovery after helper or non-persistent background-context interruption.
- Collision-safe final filenames for native downloads.
- Optional cookie forwarding for authenticated native downloads. This capability is disabled by default and requires an explicit Firefox optional permission grant.
- Completion/failure notifications.
- GoreeCloud product icon and updated Glaze-aligned Firefox UI.
- Firefox add-on ID: `download-manager@goreecloud.com`.
- Native messaging host: `goreecloud_download_manager`.

## 0.2.4 Firefox scheduler hardening

Runtime Firefox-engine concurrency testing exposed a managed-state race during resume-while-full behavior. GoreeCloud correctly requeued a paused Firefox download when all managed slots were occupied, but Firefox necessarily kept the underlying browser download paused until `browser.downloads.resume()` was called. The normal browser snapshot refresh then treated Firefox's paused flag as the managed source of truth and could rewrite the GoreeCloud job from `queued` back to `paused`. Firefox also surfaced `USER_CANCELED` during intentional pause behavior, producing misleading failure text.

0.2.4 adds a post-background scheduler state adapter that keeps these two layers distinct. An existing Firefox download may now remain **queued in GoreeCloud while still paused in Firefox** until the scheduler grants a slot. Firefox paused snapshots and paused/error deltas cannot overwrite that managed queue state, and `USER_CANCELED` noise is suppressed while the job is intentionally paused or waiting for a resume slot. When a slot opens, GoreeCloud resumes the existing Firefox download ID instead of creating a replacement download.

A deterministic Node regression harness evaluates the real background scripts against a mocked Firefox WebExtensions API. It verifies the 3-active / 2-queued ceiling, pause-driven promotion, resume-while-full queue retention, paused snapshot/delta reconciliation, same-download-ID resume when a slot opens, and completion notification emission. The regression runs in repository CI.

Detailed source-level evidence is recorded in `docs/FIREFOX_SCHEDULER_HARDENING.md`.

## 0.2.3 cookie-permission correction and acceptance

Firefox requires `browser.permissions.request()` to execute directly inside a user-action handler. The 0.2.2 Settings implementation delegated that request through `browser.runtime.sendMessage()` to the background script, so Firefox 155.0.1 / Flathub Flatpak did not present the optional Cookies + All Sites permission prompt during authenticated-download acceptance testing.

0.2.3 moved the request directly into the **Grant optional cookie permission** button's click handler. The Save action no longer attempts to request permission after an asynchronous permission check; when cookie forwarding is selected without permission, Save stops and instructs the user to run the explicit Grant flow first. Source-contract tests verify that `cookies` and `<all_urls>` remain optional and that the request stays bound directly to the Settings-page user gesture.

The corrected path is accepted on Firefox 155.0.1 / Flathub Flatpak. A controlled protected endpoint rejected unauthenticated access with HTTP 401, then accepted an authenticated HEAD probe and eight authenticated HTTP 206 range requests after the optional permission was explicitly granted. The eight ranges covered the full 256 MiB source. The resulting `goreecloud-auth-range-test.bin` matched source SHA-256 `a6d72ac7690f53be6ae46ba88506bd97302a093f7108472bd9efc3cefda06484` exactly and byte-for-byte comparison reported `AUTHENTICATED FILE INTEGRITY: PASS`. Native staging was empty afterward. Searches of native staging and extension `browser.storage.local` for the controlled test credential reported `NATIVE COOKIE PERSISTENCE: PASS` and `BROWSER COOKIE PERSISTENCE: PASS` respectively.

Detailed evidence is recorded in `docs/AUTHENTICATED_COOKIE_ACCEPTANCE.md`.

## Recovery hardening carried forward from 0.2.2

Interrupted or errored native jobs that already started are recoverable using the **same GoreeCloud job ID**. The extension verifies that the native helper can be reached, requeues the existing job without discarding its progress metadata, and sends a native `resume` request. The helper can then reconstruct the job from the existing `.goreecloud-downloads/<job-id>/` staging directory and segment files.

If a non-persistent Firefox background context is recreated while a native job is still persisted as active, the recovery controller reconciles that stale state and attempts same-ID native recovery. Explicitly paused jobs remain paused, and already-interrupted jobs remain under user control until **Resume** is selected.

The target Firefox 155.0.1 Flatpak environment has accepted both deliberate native-helper interruption recovery and non-persistent background-context recreation recovery. Full-browser restart recovery remains a separate gate.

## Linux native-host hardening

The Linux installer copies the Python helper to a durable user-owned location at `~/.local/lib/goreecloud-download-manager/goreecloud_download_manager_native.py`, writes the Firefox native-messaging manifest under `~/.mozilla/native-messaging-hosts/`, validates Python compilation, runs a Native Messaging hello/ping protocol self-test, and detects Firefox Flatpak/WebExtensions portal environments.

The installer supports removal with:

```bash
./extensions/download-manager/scripts/install-native-host-linux.sh --uninstall
```

## Architecture

The extension uses two download engines:

1. **Firefox engine** — uses Firefox's `downloads` API for normal downloads and maximum browser compatibility.
2. **Native segmented engine** — uses Firefox Native Messaging to control a local Python helper. The helper probes HTTP range support, downloads byte ranges concurrently, preserves partial files for resume, validates source changes with ETag/Last-Modified/size information, and assembles the final file.

The native helper is maintained under `scripts/native-host/` so it is source-controlled with the extension but excluded from the XPI payload. It is installed separately on the local Linux system.

## Install for development

Load the unsigned XPI or `extensions/download-manager/manifest.json` from `about:debugging` → **This Firefox** → **Load Temporary Add-on**.

For native acceleration on Linux:

```bash
./extensions/download-manager/scripts/install-native-host-linux.sh
```

Then open extension settings, select **Native segmented helper**, save settings, and use **Test native helper**.

For Firefox distributed as a Flatpak, the installer checks whether the `org.freedesktop.portal.WebExtensions` portal interface is exposed. If Firefox still cannot discover the installed helper, open `about:config`, set `widget.use-xdg-desktop-portal.native-messaging` to `1`, restart Firefox, reload an unsigned temporary XPI if necessary, and approve the WebExtensions portal authorization prompt.

## Target runtime evidence

The extension has been exercised on Mozilla Firefox 155.0.1 from Flathub Flatpak. The unsigned XPI loaded temporarily with the fixed add-on ID, the background script started, popup/Manager/Settings pages rendered, the installed native helper passed direct hello/ping framing, Firefox presented the WebExtensions portal authorization prompt, and the extension reported **Native helper connection opened** after approval.

A controlled 256 MiB HTTP range download ran as **native · 8 segments**. Exactly eight segment files existed while the job was paused at 108 MiB / 42%, resume completed the transfer, the assembled file matched source SHA-256 `a6d72ac7690f53be6ae46ba88506bd97302a093f7108472bd9efc3cefda06484`, byte-for-byte comparison passed, and native staging was empty after successful completion.

The recovery path was exercised by deliberately terminating the installed native helper during another eight-segment transfer. Job-scoped staging survived under job ID `4273f6a6-5372-4c85-a57f-cfea1953c247` with `metadata.json` plus all eight partial segment files. Selecting **Resume** completed the transfer, the original staging directory was removed after successful assembly, and the recovered output matched the source SHA-256 exactly. Collision-safe naming produced `goreecloud-range-test (1).bin` because the original filename already existed.

Non-persistent Firefox background-context recovery was then exercised during another eight-segment transfer. Job ID `4e877c53-cf58-40ff-a9d1-f632f1f72165` retained `metadata.json` plus eight segment files after background termination. Reopening the extension recreated the background context and the transfer completed to `goreecloud-range-test (2).bin`; byte-for-byte integrity passed and staging was empty afterward.

The authenticated-cookie path was exercised against a controlled cookie-protected range server. Before cookie forwarding, the endpoint returned HTTP 401. After explicit optional permission acquisition, the server logged one authenticated HEAD request followed by eight authenticated HTTP 206 range requests spanning the full 256 MiB source. The final authenticated output reproduced the source SHA-256 exactly. Extension storage and native staging scans both passed the controlled credential non-persistence checks.

A controlled Firefox-engine five-job batch then accepted the initial scheduler ceiling: the Manager showed 3 Active and 2 Queued with Firefox engine badges while the server independently reported three active requests and a peak of three. Completion-driven promotion moved the remaining queued jobs into the freed slots. Later pause/resume timing attempts exposed the queued-resume state race corrected in 0.2.4; the corrected behavior is now covered by deterministic CI rather than repeated manual timing races.

This evidence accepts the tested native segmented transfer, live pause/resume, helper-interruption recovery, non-persistent background-context recovery, existing-segment reuse, collision-safe naming, authenticated cookie forwarding, assembly, integrity, credential non-persistence for the controlled test, staging cleanup, initial Firefox-engine queue ceiling, and completion-driven queue promotion for the tested Firefox 155.0.1 Flatpak environment. It does not yet establish full-browser restart recovery, Mozilla signing, persistent signed-install/restart acceptance, or final mixed-engine stress acceptance.

## Cookie forwarding

Cookie forwarding is off by default. The Settings page requests Firefox's optional Cookies + All Sites permission directly from the explicit **Grant optional cookie permission** button click. After permission is granted and the setting is saved, the extension reads cookies only for the target download URL at launch/resume time and forwards them to the native helper through Native Messaging. Cookie values are not written to the extension's download-history records or native staging metadata.

This improves compatibility with cookie-authenticated downloads but does not guarantee support for sites that require request bodies, anti-bot challenges, expiring signed headers, DRM, JavaScript-generated tokens, or other browser-only request state.

## Packaging

From the canonical `GoreeCloud/goreecloud-firefox-extensions` repository root:

```bash
python shared/scripts/package_extension.py download-manager
```

The resulting `dist/goreecloud-download-manager-0.2.4.xpi` is deterministic and unsigned. Packaging excludes the native helper and source-only test scripts. Packaging success is not Mozilla signing and does not make the version Stable.

## Validation

```bash
node --check extensions/download-manager/background.js
node --check extensions/download-manager/recovery.js
node --check extensions/download-manager/scheduler_hardening.js
node extensions/download-manager/tests/test_browser_scheduler.js
node --check extensions/download-manager/ui/popup.js
node --check extensions/download-manager/ui/manager.js
node --check extensions/download-manager/ui/options.js
python -m py_compile extensions/download-manager/scripts/native-host/goreecloud_download_manager_native.py
python -m unittest discover -s extensions/download-manager/tests -p 'test_*.py'
python shared/scripts/validate_repository.py
python shared/scripts/package_extension.py download-manager
```

## Release state

0.2.4 remains a source candidate until remaining automated and runtime tests pass, Mozilla signing completes, the signed artifact installs persistently in the target Firefox build, restart behavior is verified, native-host integration is revalidated against the signed add-on ID, and the release is explicitly promoted.
