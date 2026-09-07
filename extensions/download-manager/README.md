# GoreeCloud Download Manager Extension

**Status:** 0.2.7 source candidate — unsigned, not Release Candidate or Stable

GoreeCloud Download Manager Extension is GoreeCloud's first-party Firefox Manifest V3 download manager. It provides managed queueing, pause/resume, retries, batch input, download telemetry, and an optional separately installed Linux Native Messaging helper for segmented HTTP range transfers and durable same-job partial-file recovery.

## Implemented

- Firefox `downloads` API engine for maximum browser compatibility.
- Optional native segmented engine with 1–32 HTTP byte-range workers.
- Global managed-download concurrency enforcement shared by Firefox and native jobs.
- Pause, resume, cancel, retry, pause-all, resume-all, and clear-completed actions.
- Batch URL queueing and link/media context-menu capture.
- Live bytes, progress, rolling speed, ETA, queue position, engine state, and effective native segment count.
- Persistent native staging under `.goreecloud-downloads/<job-id>/`.
- Same-job native recovery after helper interruption and non-persistent Firefox background-context recreation.
- Source-identity validation using URL, ETag, Last-Modified, and known source length before staged partial reuse.
- Strict native HTTP 206 / `Content-Range` validation before resumed or segmented bytes are appended.
- Collision-safe native destination reservation and no-overwrite final publication from staging.
- Optional target-site cookie forwarding, disabled by default and guarded by explicit Firefox optional permission.
- Completion/failure notifications.
- Deterministic managed queue ordering, including migration-safe queue-sequence reconciliation.
- Lifecycle-race protection for cancellation, pending Firefox launches, late browser/native events, and removed jobs.
- Ordinary Retry preservation of the source job's effective engine, segment-count, retry-count, native destination, and requested-filename snapshots.
- Cross-platform requested-filename normalization for browser retries.
- GoreeCloud product branding and Glaze-aligned popup, Manager, and Settings interfaces.

Firefox add-on ID: `download-manager@goreecloud.com`  
Native Messaging host: `goreecloud_download_manager`

## 0.2.7 native recovery and integrity hardening

0.2.7 strengthens the separately installed native helper and the extension/native recovery boundary.

The native helper now performs its own HTTP/HTTPS transport validation, in addition to extension-side validation. Persisted staging metadata belonging to a different URL is treated as stale source identity rather than reusable partial state. Allowlisted forwarded `Cookie` and `Referer` values continue to reject CR/LF injection and are now individually bounded to 64 KiB.

Resumed single-file requests and segmented workers validate the server's partial response before writing response bytes. HTTP 206 alone is insufficient: `Content-Range` must be syntactically valid, begin at the exact requested byte, end at the planned segment boundary when one exists, and report the expected total source size when that size is known.

Same-helper recovery is also hardened. A `resume` for an active native job reuses the existing worker instead of spawning a duplicate. A same-ID resume for a worker that ended in a recoverable error may reconstruct a replacement in-memory job while retaining the existing job-scoped staging identity. Completed and explicitly cancelled native jobs are not restarted by a later same-ID resume.

The extension recovery controller protects a separate race between native-helper preflight and actual scheduler launch. Already-started native recovery jobs are not eligible for the normal new-job Firefox compatibility fallback. If the helper disappears after preflight, native launch fails as a recoverable native problem rather than silently converting the same recovery attempt into a fresh Firefox download. Fresh native jobs that have never started retain the normal Firefox fallback when the helper is unavailable.

Native destination publication is now two-phase. Jobs reserve their intended destination before worker execution; segmented downloads assemble to `assembled.part` under the job-scoped staging directory; and final publication uses a no-overwrite same-filesystem commit. If another process creates the chosen destination after reservation, GoreeCloud selects another collision-safe filename rather than truncating or replacing the external file.

Deterministic native-core and recovery-controller regressions cover transport validation, stale-source staging invalidation, exact partial-response semantics, same-ID live/dead/terminal recovery behavior, duplicate-start handling, destination reservation, no-overwrite finalization, and the recovery/no-fallback boundary.

## Recovery model

Interrupted or errored native jobs that already started are recoverable using the **same GoreeCloud job ID**. Native staging is keyed by that ID, so recovery preserves the job record and staging directory rather than creating a new retry identity.

Recovery preflights the native host, requeues the existing job as native with `nativeStarted` preserved, then sends a native `resume` request when the global scheduler grants a slot. If the helper process no longer has that job in memory, the helper can reconstruct it from the URL/configuration sent by the extension and the existing `.goreecloud-downloads/<job-id>/` state.

Ordinary **Retry** is different: it creates a fresh GoreeCloud job at the queue tail and does not reuse native partial staging, but it preserves the source job's effective engine/configuration snapshot rather than silently inheriting later Settings changes.

## Cookie forwarding

Cookie forwarding is off by default. The Settings page requests Firefox's optional Cookies + All Sites permission directly from the explicit **Grant optional cookie permission** user action. After permission is granted and forwarding is enabled, the extension reads cookies for the target download URL only at launch/resume time and forwards them in memory to the native helper. Cookie values are not intentionally written to managed download history or native `metadata.json`.

The accepted controlled Firefox 155.0.1 / Flathub Flatpak test demonstrated one authenticated HEAD request followed by eight authenticated HTTP 206 ranges covering the complete 256 MiB source. Final integrity matched the source exactly, staging was cleaned after completion, and controlled credential scans of native staging and `browser.storage.local` passed.

Sites requiring request bodies, JavaScript-generated tokens, DRM, anti-bot challenges, short-lived signed headers, service-worker state, or other browser-only request state are not guaranteed to work in the native engine.

## Linux native helper

The Linux installer copies the helper to the durable user-owned location:

```text
~/.local/lib/goreecloud-download-manager/goreecloud_download_manager_native.py
```

and registers:

```text
~/.mozilla/native-messaging-hosts/goreecloud_download_manager.json
```

Install from the repository root with:

```bash
./extensions/download-manager/scripts/install-native-host-linux.sh
```

Remove it with:

```bash
./extensions/download-manager/scripts/install-native-host-linux.sh --uninstall
```

The installer compiles the installed Python helper, runs a Native Messaging hello/ping framing check, and reports Firefox Flatpak/WebExtensions portal diagnostics when applicable.

For Firefox distributed as a Flatpak, if the helper remains undiscoverable, open `about:config`, set `widget.use-xdg-desktop-portal.native-messaging` to `1`, restart Firefox, reload a temporary unsigned candidate if necessary, and approve the WebExtensions portal authorization prompt.

## Target-runtime evidence carried forward

Mozilla Firefox 155.0.1 from Flathub Flatpak has accepted the earlier tested runtime baseline:

- temporary unsigned XPI load with fixed add-on ID and working Manifest V3 background/UI;
- Firefox Flatpak → XDG WebExtensions portal → GoreeCloud native-host launch and handshake;
- controlled 256 MiB native transfer at eight segments, live pause/resume, exact SHA-256 and byte-for-byte integrity, and post-completion staging cleanup;
- deliberate native-helper interruption with same-job staged partial reuse and exact recovered-file integrity;
- non-persistent Firefox background-context recreation with preserved native staging and exact recovered-file integrity;
- collision-safe recovered naming;
- authenticated target-site cookie forwarding with exact final integrity and controlled credential non-persistence;
- native five-job batch concurrency at configured `maxConcurrent = 3`, with five-file integrity acceptance; and
- initial Firefox-engine 3-active / 2-queued ceiling with completion-driven slot promotion.

0.2.4–0.2.7 scheduler, lifecycle, retry-snapshot, native-range-integrity, no-overwrite-publication, and additional recovery-fault behavior is accepted through deterministic source-level testing unless separately identified as target-runtime evidence. Full-browser restart recovery remains gated on persistent signed installation.

## Development installation

Load the unsigned XPI or `extensions/download-manager/manifest.json` from `about:debugging` → **This Firefox** → **Load Temporary Add-on**.

To exercise native behavior, install/reinstall the native helper from the same 0.2.7 source checkout, select **Native segmented helper** in Settings, save, and use **Test native helper** before starting a native transfer.

## Packaging

From the canonical `GoreeCloud/goreecloud-firefox-extensions` repository root:

```bash
python shared/scripts/package_extension.py download-manager
```

The resulting `dist/goreecloud-download-manager-0.2.7.xpi` is deterministic and unsigned. Packaging excludes the separately installed native helper and source-only scripts/tests/documentation. Packaging success is not Mozilla signing and does not make the version Stable.

## Validation

```bash
node --check extensions/download-manager/background.js
node --check extensions/download-manager/recovery.js
node --check extensions/download-manager/scheduler_hardening.js
node extensions/download-manager/tests/test_browser_scheduler.js
node extensions/download-manager/tests/test_mixed_scheduler.js
node extensions/download-manager/tests/test_lifecycle_faults.js
node extensions/download-manager/tests/test_retry_snapshots.js
node --check extensions/download-manager/ui/popup.js
node --check extensions/download-manager/ui/manager.js
node --check extensions/download-manager/ui/options.js
python -m py_compile extensions/download-manager/scripts/native-host/goreecloud_download_manager_native.py
python -m unittest discover -s extensions/download-manager/tests -p 'test_*.py'
python shared/scripts/validate_repository.py
python shared/scripts/package_extension.py download-manager
```

## Current boundaries

0.2.7 does not establish Windows or macOS native-host support, arbitrary POST/body downloads, complete browser authorization-state reproduction, mirror failover, bandwidth limiting, time-based scheduling, automatic browser-wide interception, origin/user-supplied cryptographic checksum enforcement, or formal completion of GoreeCloud Manager, Privacy Shield, Wardveil Security, Everkeep, GoreeCloud Mesh, GoreeCloud Identity, or governed Glaze UI integration.

## Release state

0.2.7 remains an **unsigned Active Development source candidate**. Mozilla signing, persistent signed installation, full Firefox restart/native-host acceptance against the signed add-on, applicable governed Platform-System reviews, Release Candidate qualification, and explicit Stable promotion remain required.