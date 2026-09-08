# GoreeCloud Download Manager Extension

**Status:** **Stable 0.2.12** — Mozilla-signed for unlisted/self-distribution and accepted through persistent-install/full-browser-restart native recovery

GoreeCloud Download Manager Extension is GoreeCloud's first-party Firefox Manifest V3 download manager. It provides managed queueing, pause/resume, retries, batch input, telemetry, and an optional separately installed Linux Native Messaging helper for segmented HTTP range transfers and durable same-job recovery.

Firefox add-on ID: `download-manager@goreecloud.com`  
Native Messaging host: `goreecloud_download_manager`  
Stable extension version: `0.2.12`  
Accepted native helper: `0.2.11` / protocol `2`

## Stable 0.2.12 release evidence

GoreeCloud Download Manager Extension 0.2.12 is the accepted Stable Firefox release for Mozilla unlisted/self-distribution.

Governed signing/restart run `34176105690` validated exact source revision `2cc6d3bbe6ec2c63d49bec338bd68f154747be70`, built the deterministic 0.2.12 candidate, submitted a new unlisted version to Mozilla, verified the returned signed XPI against the candidate, installed the signed extension persistently, and exercised the full browser restart/native recovery gate on Firefox 155.0.1.

Release hashes and retained evidence:

- deterministic candidate SHA-256: `779425b150921c1969462066a3e79cb345d976d11369a6891b5611c63a3d5537`;
- Mozilla-signed XPI SHA-256: `4c02a152a258c4f8e76581ece2cb2a41f088463a4464354da0c374dfb2957f25`;
- signing source: `new-submission`;
- retained artifact: `goreecloud-download-manager-0.2.12-mozilla-signed`, artifact ID `10037385022`;
- artifact ZIP SHA-256: `17ba5f469b04979f5405f618abae5fc461e4e5c583f10e2d6484fe9706b6e747`.

The signed non-manifest runtime payload matched the candidate byte-for-byte. Mozilla's manifest change was accepted only as governed JSON-serialization normalization.

The full restart test started a native eight-segment transfer, captured the exact GoreeCloud job identity, confirmed validated partial staging, exited the complete Firefox process, and reopened the same profile without reinstalling the add-on. The signed extension survived restart and automatically resumed the same job through HTTP Range requests beginning inside preserved segments. The transfer completed at 67,108,864 bytes, required **zero manual Resume actions**, removed the original staging directory, and reconnected to the native helper. Source and recovered output SHA-256 both equaled `a4a99d83daaac4823006cd3b14df26d1a256042591ad7d2f83e7ecbb203c342f`.

## Why 0.2.12 followed 0.2.11

Mozilla-signed 0.2.11 had already passed the same full restart/recovery gate after fixing the binary segmented-publication defect found in 0.2.10. A final packaged-runtime audit then found that the 0.2.11 Settings page still displayed `GoreeCloud Download Manager Extension 0.2.11 source candidate`.

That self-description contradicted an eventual Stable lifecycle even though the runtime behavior had passed. GoreeCloud therefore withheld 0.2.11 Stable promotion rather than mutating an already-signed version.

0.2.12 changes the Firefox manifest version and makes the packaged Settings heading lifecycle-neutral: `GoreeCloud Download Manager Extension 0.2.12`. A regression prevents packaged Settings UI from embedding `source candidate`, `not Stable`, or a hard-coded Stable status. Lifecycle authority belongs to the canonical extension inventory and retained release evidence.

No native-helper behavior changed in 0.2.12. The accepted helper remains **0.2.11**, which includes the binary segmented-assembly correction and protocol-2 security/recovery contracts.

## Implemented

- Firefox `downloads` API engine for maximum browser compatibility.
- Optional native segmented engine with 1–32 HTTP byte-range workers.
- Shared Firefox/native managed-download concurrency enforcement.
- Pause, resume, cancel, retry, pause-all, resume-all, and clear-completed actions.
- Batch URL queueing and link/media context-menu capture.
- Live bytes, progress, rolling speed, ETA, queue position, engine state, and effective native segment count.
- Persistent native staging under `.goreecloud-downloads/<job-id>/`.
- Same-job native recovery after helper interruption, Firefox background-context recreation, and accepted full Firefox process restart.
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

## Native publication and staging safety

The 0.2.11 helper fixed a native publication defect exposed by the signed 0.2.10 restart diagnostic. Segmented assembly had opened `assembled.part` with text-exclusive mode (`"x"`) and attempted to write binary byte chunks, causing `TypeError: write() argument must be str, not bytes` after all source bytes had recovered. The helper now uses binary-exclusive mode (`"xb"`), preserving exclusive-create and no-follow protections while allowing exact binary assembly.

The helper validates the `.goreecloud-downloads` staging root and per-job staging path with `lstat` semantics and rejects symbolic links or unexpected non-directories. Reusable metadata, single-part, segment, and assembled staging entries must be regular non-link files. Supported file opens use `O_NOFOLLOW`; metadata replacement is staged through an exclusive job-local temporary file with flush/fsync; invalid link entries are removed as entries rather than followed; and final no-overwrite publication validates the staging source before `os.link(..., follow_symlinks=False)`.

These controls materially reduce link-following and accidental overwrite risk. They do not claim a universal filesystem sandbox against another unrestricted process running as the same OS user.

## Persisted staging trust and recovery

A valid `metadata.json` record is required before persisted partial bytes can be reused. The record must use the supported schema, belong to the exact GoreeCloud job ID, contain a valid canonical HTTP/HTTPS URL and supported source-size representation, and keep bounded filename/destination/ETag/Last-Modified values. Structurally valid metadata must still pass URL, known size, ETag, and Last-Modified identity checks.

Interrupted or errored native jobs that already started are recovered using the **same GoreeCloud job ID**. Recovery preflights a protocol-compatible native helper, preserves the existing job/configuration, and reconstructs missing helper state from validated job-scoped staging.

Ordinary **Retry** is intentionally different: it creates a fresh GoreeCloud job at the queue tail and does not reuse native partial staging, while preserving the source job's effective engine/configuration/requested-filename snapshot.

## Cookie forwarding

Cookie forwarding is off by default. Settings requests Firefox's optional Cookies + All Sites permission directly from the explicit **Grant optional cookie permission** user action. When enabled, cookies for the target URL are forwarded in memory to the local native helper and are not intentionally written to managed download history or native recovery metadata.

Accepted Firefox 155.0.1 / Flathub Flatpak testing previously demonstrated authenticated HEAD plus eight authenticated HTTP 206 ranges across a controlled 256 MiB source, exact final integrity, staging cleanup, and controlled credential non-persistence in native staging and `browser.storage.local`.

Sites requiring arbitrary request bodies, JavaScript-generated authorization, DRM, anti-bot challenges, service-worker state, or other browser-only request state are not guaranteed to work through the native engine.

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

For Stable extension 0.2.12, the accepted helper remains version `0.2.11`, protocol `2`. The installer compiles the helper and requires startup/ping hello frames with the required protocol capabilities, including `staging-link-rejection`.

For Firefox Flatpak, use the WebExtensions XDG portal path. If discovery fails after a successful helper self-test, open `about:config`, set `widget.use-xdg-desktop-portal.native-messaging` to `1`, restart Firefox, and approve the portal authorization prompt.

## Development packaging

Unsigned development builds can still be loaded temporarily through `about:debugging` → **This Firefox** → **Load Temporary Add-on**. Temporary loading does not replace or supersede Stable release evidence.

Build the deterministic unsigned package with:

```bash
python shared/scripts/package_extension.py download-manager
```

For the Stable source line this produces:

```text
dist/goreecloud-download-manager-0.2.12.xpi
```

The XPI excludes the separately installed native helper and source-only scripts/tests/documentation. An unsigned package is not the accepted Mozilla-signed Stable artifact.

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

Stable 0.2.12 does not establish Windows/macOS native-host support, arbitrary POST/body downloads, complete browser authorization-state reproduction, mirror failover, bandwidth limiting, time scheduling, automatic browser-wide interception, or origin/user-supplied cryptographic checksum enforcement. The supported Stable scope is the Firefox extension plus the separately installed Linux native helper and the behaviors actually covered by the accepted evidence.

## Release state

**GoreeCloud Download Manager Extension 0.2.12 is Stable.** The canonical inventory records `source_state: stable` and `accepted_stable_version: 0.2.12`. Any later runtime version is a new lifecycle candidate and must independently repeat its applicable validation, Mozilla signing, signed-install/restart/native-recovery, integrity, review, and promotion gates before replacing 0.2.12 as Stable.
