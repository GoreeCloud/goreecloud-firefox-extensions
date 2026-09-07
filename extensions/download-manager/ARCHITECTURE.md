# Architecture — GoreeCloud Download Manager Extension

## Status

Version 0.2.1 source candidate.

## Components

### Firefox extension

The Manifest V3 extension owns user interaction, queue state, Firefox-download integration, settings, optional permission acquisition, notification behavior, and Native Messaging coordination.

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
