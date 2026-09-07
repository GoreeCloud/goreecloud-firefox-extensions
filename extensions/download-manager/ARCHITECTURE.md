# Architecture — GoreeCloud Download Manager Extension

## Status

Version 0.2.2 source candidate.

## Components

### Firefox extension

The Manifest V3 extension owns user interaction, queue state, Firefox-download integration, settings, optional permission acquisition, notification behavior, Native Messaging coordination, and recovery orchestration.

The queue is stored in `browser.storage.local`. Download jobs have a stable GoreeCloud job ID independent of Firefox's numeric `downloadId`, allowing queued and native jobs to share one state model.

### Firefox download engine

The browser engine starts and controls downloads with the Firefox `downloads` API. A queued browser job does not call `downloads.download()` until a concurrency slot becomes available. Paused browser downloads can re-enter the queue and resume when a slot is available.

### Native segmented helper

The Python native host communicates over Firefox Native Messaging framing. For range-capable HTTP/HTTPS sources it divides a file into up to 32 bounded ranges and runs concurrent workers. Each worker persists its partial range under a job-scoped staging directory.

Native staging layout:

```text
<download-directory>/.goreecloud-downloads/<job-id>/
├── metadata.json
├── single.part
└── segment-000.part ...
```

`metadata.json` stores source and destination metadata but never cookies or other request credentials.

Before resuming existing parts, the helper compares available ETag, Last-Modified, and source-size information. If the source identity changed, old partial data is discarded before the new transfer begins.

### Native recovery controller

The extension loads `recovery.js` after the primary background controller. Native staging is keyed by the GoreeCloud job ID, so recovery must preserve that ID to reuse partial segments.

For an interrupted or errored native job that previously started, the recovery controller:

1. verifies that the Native Messaging helper can complete its handshake;
2. keeps the existing GoreeCloud job record and job ID;
3. requeues that same job as native without resetting transferred-byte metadata or segment configuration;
4. lets the primary queue controller issue a native `resume` message because `nativeStarted` remains true; and
5. allows the helper to reconstruct the missing in-memory job from the existing job-scoped staging directory.

The controller checks helper availability before requeueing so a temporarily unavailable helper does not silently turn a recovery attempt into a Firefox-engine fallback.

When a non-persistent Firefox background context is recreated, native jobs persisted in stale active states (`starting`, `in_progress`, or `downloading`) are reconciled through the same same-ID recovery path. Explicitly paused jobs are not automatically resumed. Jobs already marked `interrupted` or `error` remain user-controlled until **Resume** is selected.

Target Firefox 155.0.1 / Flathub Flatpak testing has accepted the deliberate native-helper interruption path. During a controlled 256 MiB eight-segment transfer, terminating the native helper left the original job-scoped staging directory intact with `metadata.json` and all eight partial segment files. Resume completed successfully; the original staging directory was removed after assembly; the recovered file reproduced source SHA-256 `a6d72ac7690f53be6ae46ba88506bd97302a093f7108472bd9efc3cefda06484` exactly; and the collision-safe destination policy produced `goreecloud-range-test (1).bin` because the original filename already existed.

This accepts helper-process interruption recovery for the tested target environment. Non-persistent background-context recreation and full-browser restart recovery remain separate acceptance gates.

### Native host installation

The Linux installer copies the helper out of the source checkout into the durable user path:

```text
~/.local/lib/goreecloud-download-manager/goreecloud_download_manager_native.py
```

Firefox native-host registration is written to:

```text
~/.mozilla/native-messaging-hosts/goreecloud_download_manager.json
```

The installer replaces the manifest atomically and runs Python compilation plus a Native Messaging hello/ping protocol self-test before reporting success. The installed manifest authorizes only `download-manager@goreecloud.com`.

When Firefox is distributed as a Flatpak, native-host startup can traverse `org.freedesktop.portal.WebExtensions`. The installer reports whether that portal interface is visible and gives explicit Firefox portal-preference guidance rather than granting the confined browser arbitrary host command execution.

### Optional authenticated native downloads

When the user explicitly enables cookie forwarding and grants Firefox's optional Cookies + All Sites permission, the extension constructs a `Cookie` header from cookies matching the target URL and sends it to the native host only for the active request. The helper filters accepted forwarded headers and never writes them to staging metadata.

## Current boundaries

The native helper currently supports HTTP/HTTPS GET-style downloads. It does not reproduce arbitrary browser request bodies, JavaScript execution, DRM, service-worker state, anti-bot challenge flows, or every form of authorization header generation.

Mozilla signing is outside the download engine. An unsigned candidate may be loaded temporarily for development but is not a persistent Stable Firefox release.
