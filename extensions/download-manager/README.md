# GoreeCloud Download Manager Extension

**Status:** 0.2.9 source candidate — unsigned, not Release Candidate or Stable

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
- Fail-closed staged-metadata validation before persisted partial bytes are eligible for reuse.
- Source-identity validation using URL, ETag, Last-Modified, and known source length before staged partial reuse.
- Strict native HTTP 206 / `Content-Range` validation before resumed or segmented bytes are appended.
- Collision-safe native destination reservation and no-overwrite final publication from staging.
- Versioned extension/native protocol negotiation with required capability validation.
- Optional target-site cookie forwarding, disabled by default and guarded by explicit Firefox optional permission.
- Completion/failure notifications.
- Deterministic managed queue ordering, including migration-safe queue-sequence reconciliation.
- Lifecycle-race protection for cancellation, pending Firefox launches, late browser/native events, and removed jobs.
- Ordinary Retry preservation of the source job's effective engine, segment-count, retry-count, native destination, and requested-filename snapshots.
- Cross-platform requested-filename normalization for browser retries.
- GoreeCloud product branding and Glaze-aligned popup, Manager, and Settings interfaces.

Firefox add-on ID: `download-manager@goreecloud.com`  
Native Messaging host: `goreecloud_download_manager`

## 0.2.9 staged metadata trust hardening

0.2.9 tightens the native recovery trust boundary around persisted `.goreecloud-downloads/<job-id>/metadata.json` state. Native partial bytes are no longer eligible for same-job reuse merely because segment or single-part files exist.

Before reusing staged partials, the helper requires a supported metadata object whose schema version is `1`, whose `job_id` exactly matches the current GoreeCloud job, whose persisted URL is a canonical HTTP/HTTPS URL, whose source size is a valid integer, and whose filename, destination, ETag, and Last-Modified values are either strings or absent. Persisted string fields are individually bounded to 64 KiB.

If metadata is missing, malformed JSON, not an object, from an unsupported metadata schema, belongs to another job ID, contains an invalid URL, contains an invalid source-size type, or otherwise fails the structural checks, the helper discards staged partial files before continuing as a fresh transfer. Valid same-job metadata still proceeds through the existing URL/ETag/Last-Modified/size source-identity checks and may preserve reusable partial bytes.

This correction prevents orphaned or malformed staging state from bypassing the source-identity record that is supposed to authorize partial reuse. It does not yet establish symlink/no-follow hardening for staging files or directories; filesystem-link edge cases remain a separate hardening target.

Because the trust correction is implemented in the separately installed helper, the 0.2.9 extension raises the compatible helper minimum to **0.2.9** while retaining Native Messaging protocol **2** and the existing required capability set. An installed 0.2.8 helper is therefore treated as stale by a 0.2.9 extension until it is reinstalled from the matching source candidate.

Deterministic native-core tests cover missing metadata, malformed JSON, non-object metadata, unsupported schema version, wrong job identity, invalid persisted URL, invalid size type, invalid destination type, valid same-job partial preservation, and the previously accepted source/range/publication/recovery behaviors.

## 0.2.8 native protocol compatibility hardening

0.2.8 added an explicit compatibility contract between the Firefox extension and the separately installed native helper so a newly updated extension cannot silently treat an older helper as equivalent to the code it was validated against.

The extension loads `native_protocol.js` before the primary background controller and validates every native `hello` handshake before marking the host ready. Protocol **2** originally established the helper-version/capability boundary and requires the capabilities `segmented-range-integrity`, `same-job-recovery`, `no-overwrite-publish`, and `ephemeral-request-headers`. Legacy helpers without a protocol version, helpers on another protocol, helpers below the current minimum compatible helper version, and protocol-2 helpers missing required capabilities are rejected with an actionable reinstall message.

The helper advertises its version, protocol version, and capability set on both startup and ping responses. The Linux installer independently validates those fields after copying the helper, and Settings reports the connected helper version and protocol when the compatibility gate succeeds. A rejected helper is disconnected so a repaired/reinstalled helper can be discovered on the next connection attempt.

Fresh native jobs retain the normal Firefox compatibility fallback if the helper cannot be used. Identity-preserving recovery of a native job that already started remains governed by the stricter recovery no-fallback rule introduced in 0.2.7, so recovery does not silently become a new Firefox transfer.

## 0.2.7 native recovery and integrity hardening

0.2.7 strengthened the separately installed native helper and the extension/native recovery boundary.

The native helper performs its own HTTP/HTTPS transport validation in addition to extension-side validation. Persisted staging metadata belonging to a different URL is treated as stale source identity rather than reusable partial state. Allowlisted forwarded `Cookie` and `Referer` values reject CR/LF injection and are individually bounded to 64 KiB.

Resumed single-file requests and segmented workers validate the server's partial response before writing response bytes. HTTP 206 alone is insufficient: `Content-Range` must be syntactically valid, begin at the exact requested byte, end at the planned segment boundary when one exists, and report the expected total source size when that size is known.

Same-helper recovery is hardened. A `resume` for an active native job reuses the existing worker instead of spawning a duplicate. A same-ID resume for a worker that ended in a recoverable error may reconstruct a replacement in-memory job while retaining the existing job-scoped staging identity. Completed and explicitly cancelled native jobs are not restarted by a later same-ID resume.

The extension recovery controller protects a separate race between native-helper preflight and actual scheduler launch. Already-started native recovery jobs are not eligible for the normal new-job Firefox compatibility fallback. If the helper disappears after preflight, native launch fails as a recoverable native problem rather than silently converting the same recovery attempt into a fresh Firefox download. Fresh native jobs that have never started retain the normal Firefox fallback when the helper is unavailable.

Native destination publication is two-phase. Jobs reserve their intended destination before worker execution; segmented downloads assemble to `assembled.part` under the job-scoped staging directory; and final publication uses a no-overwrite same-filesystem commit. If another process creates the chosen destination after reservation, GoreeCloud selects another collision-safe filename rather than truncating or replacing the external file.

## Recovery model

Interrupted or errored native jobs that already started are recoverable using the **same GoreeCloud job ID**. Native staging is keyed by that ID, so recovery preserves the job record and staging directory rather than creating a new retry identity.

Recovery preflights the native host, requeues the existing job as native with `nativeStarted` preserved, then sends a native `resume` request when the global scheduler grants a slot. If the helper process no longer has that job in memory, the helper can reconstruct it from the URL/configuration sent by the extension and the existing `.goreecloud-downloads/<job-id>/` state. 0.2.9 additionally requires the persisted metadata trust check to succeed before staged partial bytes can be reused.

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

The installer compiles the installed Python helper and runs a Native Messaging startup/ping self-test that requires helper version 0.2.9, protocol 2, and the capabilities used by the current integrity/recovery boundary. It also reports Firefox Flatpak/WebExtensions portal diagnostics when applicable.

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

0.2.4–0.2.9 scheduler, lifecycle, retry-snapshot, native-range-integrity, no-overwrite-publication, additional recovery-fault, native-protocol, and staged-metadata behavior is accepted only at deterministic source-test level when the corresponding exact source candidate passes repository CI. Full-browser restart recovery remains gated on persistent signed installation.

## Development installation

Load the unsigned XPI or `extensions/download-manager/manifest.json` from `about:debugging` → **This Firefox** → **Load Temporary Add-on**.

To exercise native behavior, install/reinstall the native helper from the same 0.2.9 source checkout, select **Native segmented helper** in Settings, save, and use **Test native helper** before starting a native transfer. A successful test reports the helper version and protocol.

## Packaging

From the canonical `GoreeCloud/goreecloud-firefox-extensions` repository root:

```bash
python shared/scripts/package_extension.py download-manager
```

The resulting `dist/goreecloud-download-manager-0.2.9.xpi` is deterministic and unsigned. Packaging excludes the separately installed native helper and source-only scripts/tests/documentation. Packaging success is not Mozilla signing and does not make the version Stable.

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

0.2.9 does not establish symlink/no-follow hardening for native staging files/directories, Windows or macOS native-host support, arbitrary POST/body downloads, complete browser authorization-state reproduction, mirror failover, bandwidth limiting, time-based scheduling, automatic browser-wide interception, origin/user-supplied cryptographic checksum enforcement, or formal completion of GoreeCloud Manager, Privacy Shield, Wardveil Security, Everkeep, GoreeCloud Mesh, GoreeCloud Identity, or governed Glaze UI integration.

## Release state

0.2.9 remains an **unsigned Active Development source candidate**. Deterministic protocol/staging/source tests and unsigned packaging do not independently establish target-device 0.2.9 helper acceptance, Mozilla signing, persistent signed installation, full Firefox restart/native-host acceptance against the signed add-on, applicable governed Platform-System reviews, Release Candidate qualification, or explicit Stable promotion.
