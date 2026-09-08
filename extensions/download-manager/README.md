# GoreeCloud Download Manager Extension

**Status:** 0.2.11 source candidate — unsigned, not Release Candidate or Stable

GoreeCloud Download Manager Extension is GoreeCloud's first-party Firefox Manifest V3 download manager. It provides managed queueing, pause/resume, retries, batch input, telemetry, and an optional separately installed Linux Native Messaging helper for segmented HTTP range transfers and durable same-job recovery.

Firefox add-on ID: `download-manager@goreecloud.com`  
Native Messaging host: `goreecloud_download_manager`

## Implemented

- Firefox `downloads` API engine for maximum browser compatibility.
- Optional native segmented engine with 1–32 HTTP byte-range workers.
- Shared Firefox/native managed-download concurrency enforcement.
- Pause, resume, cancel, retry, pause-all, resume-all, and clear-completed actions.
- Batch URL queueing and link/media context-menu capture.
- Live bytes, progress, rolling speed, ETA, queue position, engine state, and effective native segment count.
- Persistent native staging under `.goreecloud-downloads/<job-id>/`.
- Same-job native recovery after helper interruption and non-persistent Firefox background-context recreation.
- Fail-closed staged-metadata validation before persisted partial bytes are eligible for reuse.
- URL/size/ETag/Last-Modified source-identity checks before staged partial reuse.
- Strict native HTTP 206 / `Content-Range` validation before resumed or segmented bytes are appended.
- Native staging symlink rejection and no-follow regular-file opens for the Linux helper.
- Collision-safe native destination reservation and no-overwrite final publication from staging.
- Binary-safe segmented assembly before final publication.
- Versioned extension/native protocol negotiation with required capability validation.
- Optional target-site cookie forwarding behind explicit Firefox optional permission.
- Completion/failure notifications.
- Deterministic queue ordering and migration-safe queue-sequence reconciliation.
- Lifecycle-race protection for cancellation, pending Firefox launches, late browser/native events, and removed jobs.
- Ordinary Retry preservation of effective engine/configuration/requested-filename snapshots.
- Cross-platform requested-filename normalization for browser retries.
- GoreeCloud product branding and Glaze-aligned popup, Manager, and Settings interfaces.

## 0.2.11 segmented publication fix

The governed Mozilla-signed 0.2.10 full-browser restart acceptance proved that same-job recovery itself was functioning: the signed extension survived a full Firefox restart, retained the original GoreeCloud job identity, preserved native staging, issued resumed HTTP Range requests inside the existing segment boundaries, and recovered all 67,108,864 source bytes.

The run then exposed a native publication defect. Segmented assembly opened `assembled.part` with text-exclusive mode (`"x"`) and attempted to write binary byte chunks, producing `TypeError: write() argument must be str, not bytes` after transfer completion. 0.2.11 changes that assembly target to binary-exclusive mode (`"xb"`), preserving the existing exclusive-create and no-follow protections while allowing byte-for-byte assembly.

A deterministic native-core regression now prebuilds completed binary segments, runs the actual segmented assembly/publication path without network timing, and verifies the committed output byte-for-byte. The extension-side helper minimum is raised to **0.2.11** so the known-defective 0.2.10 helper is rejected until the matching fixed helper is installed.

0.2.11 still requires a new Mozilla-signed artifact and successful governed persistent-install/full-browser-restart recovery acceptance before any Stable promotion.

## 0.2.10 staging filesystem safety

0.2.10 closed the explicit native-staging symbolic-link gap left open by 0.2.9. The helper validates the `.goreecloud-downloads` staging root and per-job staging path with `lstat` semantics and rejects them if they are symbolic links or non-directories. Reusable metadata, single-part, segment, and assembled staging entries must be regular non-link files.

Supported file opens use `O_NOFOLLOW`, metadata is written through an exclusive job-local temporary regular file with flush/fsync before atomic replacement, invalid-staging cleanup unlinks a link entry instead of following it, segmented reads/writes use the same validated staging helpers, and final no-overwrite publication validates the staging source and calls `os.link(..., follow_symlinks=False)`.

Native protocol 2 requires capability `staging-link-rejection`. 0.2.11 retains this contract while raising the compatible helper minimum from 0.2.10 to 0.2.11 because of the segmented binary-publication defect described above.

Deterministic `test_staging_link_safety.py` coverage verifies staging-root link rejection, job-directory link rejection, metadata and part link rejection without reading/modifying external targets, safe invalid-staging cleanup, final-publication source rejection, and the ordinary regular-file path.

These controls materially reduce symlink-following risk at the Linux staging boundary. They do not claim a universal race-proof filesystem sandbox against a malicious process with unrestricted access to the same user account between every filesystem operation.

## Persisted staging trust

0.2.9 made a valid `metadata.json` record a prerequisite for persisted partial reuse. A reusable record must use metadata schema version `1`, match the exact current GoreeCloud job ID, contain a canonical HTTP/HTTPS URL and valid source-size type, and keep bounded string/null filename/destination/ETag/Last-Modified fields. Missing or invalid metadata causes existing staged transfer parts to be discarded. Structurally valid metadata still passes current URL, known size, ETag, and Last-Modified identity checks before bytes are reused.

0.2.11 retains that trust contract and the filesystem-link checks introduced in 0.2.10. See `docs/STAGING_METADATA_TRUST.md` and `docs/STAGING_LINK_SAFETY.md`.

## Recovery model

Interrupted or errored native jobs that already started are recoverable using the **same GoreeCloud job ID**. Recovery preflights a protocol-compatible native helper, preserves the existing job/configuration, requeues that same native identity, and lets the helper reconstruct missing/dead in-memory state from the existing job-scoped staging directory only after metadata/source/filesystem validation succeeds.

Ordinary **Retry** is different: it creates a fresh GoreeCloud job at the queue tail and does not reuse native partial staging, but it preserves the source job's effective engine/configuration/requested-filename snapshot.

## Cookie forwarding

Cookie forwarding is off by default. Settings requests Firefox's optional Cookies + All Sites permission directly from the explicit **Grant optional cookie permission** user action. When enabled, cookies for the target URL are forwarded in memory to the native helper and are not intentionally written to managed download history or native `metadata.json`.

The accepted Firefox 155.0.1 / Flathub Flatpak controlled test demonstrated authenticated HEAD + eight authenticated HTTP 206 ranges covering the complete 256 MiB source, exact final integrity, staging cleanup, and controlled credential non-persistence in native staging and `browser.storage.local`.

Sites requiring arbitrary request bodies, JavaScript-generated authorization, DRM, anti-bot challenges, service-worker state, or other browser-only request state are not guaranteed to work in the native engine.

## Linux native helper

Install from the repository root:

```bash
./extensions/download-manager/scripts/install-native-host-linux.sh
```

The helper is copied to:

```text
~/.local/lib/goreecloud-download-manager/goreecloud_download_manager_native.py
```

and registered at:

```text
~/.mozilla/native-messaging-hosts/goreecloud_download_manager.json
```

The 0.2.11 installer compiles the helper and requires startup/ping hello frames reporting helper version `0.2.11`, protocol `2`, and all required capabilities, including `staging-link-rejection`.

For Firefox Flatpak, use the WebExtensions XDG portal path. If discovery fails after a successful helper self-test, open `about:config`, set `widget.use-xdg-desktop-portal.native-messaging` to `1`, restart Firefox, and approve the portal authorization prompt.

## Target-runtime evidence carried forward

Mozilla Firefox 155.0.1 from Flathub Flatpak has accepted the earlier tested runtime baseline:

- temporary unsigned XPI load with fixed add-on ID and working Manifest V3 background/UI;
- Flatpak → XDG WebExtensions portal → GoreeCloud native-host launch/handshake;
- controlled 256 MiB native 8-segment transfer, live pause/resume, exact SHA-256/byte-for-byte integrity, and staging cleanup;
- deliberate native-helper interruption with same-job partial reuse and exact recovered integrity;
- non-persistent Firefox background-context recreation with preserved native staging and exact recovered integrity;
- collision-safe recovered naming;
- authenticated target-site cookie forwarding with exact final integrity and controlled credential non-persistence;
- native five-job batch concurrency at `maxConcurrent = 3` with five-file integrity; and
- initial Firefox-engine 3-active / 2-queued ceiling with completion-driven promotion.

The Mozilla-signed 0.2.10 restart run additionally proved persistent installation, extension survival across a full Firefox process restart, same-job recovery dispatch, preserved-range reuse, and complete-byte recovery, but it failed final segmented publication because of the text/binary assembly defect fixed in 0.2.11. That failed run is diagnostic evidence, not Stable acceptance.

0.2.4–0.2.11 scheduler, lifecycle, retry-snapshot, range-integrity, no-overwrite-publication, recovery, protocol, metadata-trust, staging-link, and binary-publication behavior remains deterministic/source evidence until the exact 0.2.11 source candidate passes repository CI. Persistent full-browser restart acceptance remains gated on a Mozilla-signed 0.2.11 artifact.

## Development installation and packaging

Load the unsigned XPI or `manifest.json` temporarily through `about:debugging` → **This Firefox** → **Load Temporary Add-on**. Reinstall the native helper from the same 0.2.11 source checkout and use **Test native helper** before native transfers.

Build the deterministic unsigned candidate:

```bash
python shared/scripts/package_extension.py download-manager
```

Expected output:

```text
dist/goreecloud-download-manager-0.2.11.xpi
```

The XPI excludes the separately installed native helper and source-only scripts/tests/documentation. Packaging is not Mozilla signing.

## Validation

```bash
node --check extensions/download-manager/native_protocol.js
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

0.2.11 does not establish Windows/macOS native-host support, arbitrary POST/body downloads, complete browser authorization-state reproduction, mirror failover, bandwidth limiting, time scheduling, automatic browser-wide interception, or origin/user-supplied cryptographic checksum enforcement. Formal Platform-System applicability/release review and Mozilla signing/persistent signed-install/restart acceptance remain release gates where required.

## Release state

0.2.11 remains an **unsigned Active Development source candidate**. Source tests and unsigned packaging do not independently establish Mozilla signing, persistent signed installation, full signed Firefox restart/native-host acceptance, Release Candidate qualification, or Stable promotion.
