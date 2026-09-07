# Privacy — GoreeCloud Download Manager Extension

## Default behavior

The extension stores download-management state locally in Firefox, including URL, filename, engine, progress, queue state, configured segment count, destination metadata returned by the native helper, and timestamps needed to manage the download.

No GoreeCloud server, analytics service, advertising service, or third-party telemetry endpoint is used by this source candidate.

## Optional cookie permission

Cookie access is optional and disabled by default. If the user enables cookie forwarding, Firefox requests the optional `cookies` permission together with optional `<all_urls>` host access.

When granted, the extension reads cookies only for the target download URL at download launch/resume time. Those cookies are passed to the local native helper through Firefox Native Messaging and are not written into `browser.storage.local`, native `metadata.json`, logs, or package files by the implemented code.

Disabling cookie forwarding stops future cookie forwarding. Firefox permission state remains under Firefox's permission controls.

## Native helper

The native helper writes partial download data and non-secret resume metadata to the selected local download directory. Completed files remain in that directory. Cancelled native jobs delete their job staging directory.

## Data minimization

The extension does not intentionally collect browsing history. Context-menu downloads receive only the selected link/media URL needed to start that requested download. Optional cookies are limited to the requested target URL.
