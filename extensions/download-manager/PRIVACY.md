# Privacy — GoreeCloud Download Manager Extension

## Stable release boundary

GoreeCloud Download Manager Extension **0.2.12 is Stable** for Mozilla unlisted/self-distribution. The accepted release uses native helper **0.2.11 / protocol 2**. The 0.2.12 extension change does not add new data collection, telemetry, synchronization, remote management, or account-scoped behavior.

## Default behavior

The extension stores download-management state locally in Firefox, including URL, filename, engine, progress, queue state, configured segment count, destination metadata returned by the native helper, and timestamps needed to manage the download.

No GoreeCloud server, analytics service, advertising service, or third-party telemetry endpoint is used by Stable 0.2.12.

## Optional cookie permission

Cookie access is optional and disabled by default. If the user enables cookie forwarding, Firefox requests the optional `cookies` permission together with optional `<all_urls>` host access.

When granted, the extension reads cookies only for the target download URL at download launch/resume time. Those cookies are passed to the local native helper through Firefox Native Messaging and are not intentionally written into `browser.storage.local`, native `metadata.json`, logs, or package files by the implemented code.

Disabling cookie forwarding stops future cookie forwarding. Firefox permission state remains under Firefox's permission controls.

## Native helper

The native helper writes partial download data and non-secret resume metadata to the selected local download directory. Completed files remain in that directory. Cancelled native jobs delete their job staging directory; accepted successful recovery also cleans the original staging directory after final publication.

## Data minimization

The extension does not intentionally collect browsing history. Context-menu downloads receive only the selected link/media URL needed to start the requested download. Optional cookies are limited to the requested target URL.

## Accepted runtime evidence

Governed Mozilla-signed run `34176105690` exercised persistent installation and full Firefox process restart/native same-job recovery without introducing any remote GoreeCloud service. The release completed its recovered file locally, cleaned staging, and reconnected to the local native helper.

The privacy disposition for Stable 0.2.12 therefore remains the same local-first boundary reviewed for the earlier implementation. Future synchronization, remote operation, analytics, account-scoped state, or new data flows require renewed privacy review before release.
