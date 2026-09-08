# Installation — GoreeCloud Download Manager Extension

## Firefox extension

GoreeCloud Download Manager Extension **0.2.12 is the accepted Stable Mozilla-signed release** for unlisted/self-distribution. Governed run `34176105690` installed the signed XPI non-temporarily, restarted the complete Firefox 155.0.1 process using the same profile without reinstalling, and passed same-job native recovery plus exact output-integrity acceptance.

Unsigned Development builds may still be loaded temporarily through `about:debugging` → **This Firefox** → **Load Temporary Add-on**. Temporary loading is development-only and does not replace the accepted signed artifact or establish Stable status for later versions.

## Linux native helper

Stable extension 0.2.12 uses accepted native helper **0.2.11 / protocol 2**. The helper version intentionally remains 0.2.11 because 0.2.12 changes only the Firefox extension version and packaged lifecycle-neutral Settings label.

From the canonical repository root:

```bash
./extensions/download-manager/scripts/install-native-host-linux.sh
```

The installer copies the helper to:

```text
~/.local/lib/goreecloud-download-manager/goreecloud_download_manager_native.py
```

and writes the Firefox native-messaging manifest to:

```text
~/.mozilla/native-messaging-hosts/goreecloud_download_manager.json
```

The installer compiles the installed helper and performs a Native Messaging startup/ping self-test. It requires helper version `0.2.11`, protocol `2`, and capabilities `segmented-range-integrity`, `same-job-recovery`, `no-overwrite-publish`, `ephemeral-request-headers`, and `staging-link-rejection`. A stale, mismatched, or capability-incomplete helper fails closed.

Helper 0.2.11 is required because the Mozilla-signed 0.2.10 restart diagnostic exposed a segmented-publication defect in 0.2.10: binary recovered segments were written through a text-mode assembled stream. Helper 0.2.11 fixes final assembly while retaining metadata, range-integrity, no-overwrite, and staging-link protections.

To remove the user-scoped native helper:

```bash
./extensions/download-manager/scripts/install-native-host-linux.sh --uninstall
```

## Firefox Flatpak

For Firefox distributed as `org.mozilla.firefox` through Flatpak, native messaging can use the `org.freedesktop.portal.WebExtensions` XDG portal. The installer reports whether that portal interface is visible.

If the helper self-tests successfully but Firefox still reports it unavailable, open `about:config`, set `widget.use-xdg-desktop-portal.native-messaging` to `1`, restart Firefox, and approve the WebExtensions portal prompt for `goreecloud_download_manager` when it appears.

Do not grant the Firefox sandbox arbitrary host command execution merely to work around native messaging. Use the WebExtensions portal path when available.

## Verification

In the extension Settings page, click **Test native helper**. A successful Stable 0.2.12 installation using the accepted helper reports:

```text
Native helper 0.2.11 · protocol 2 ready.
```

A legacy helper, protocol mismatch, minimum-version failure, or missing required capability is rejected with reinstall guidance.

The accepted Stable signed artifact is backed by:

- source revision `2cc6d3bbe6ec2c63d49bec338bd68f154747be70`;
- signing/restart run `34176105690`;
- candidate SHA-256 `779425b150921c1969462066a3e79cb345d976d11369a6891b5611c63a3d5537`;
- Mozilla-signed XPI SHA-256 `4c02a152a258c4f8e76581ece2cb2a41f088463a4464354da0c374dfb2957f25`.

Any later extension or helper version must repeat the applicable validation, signing, installation, restart/recovery, integrity, and lifecycle-promotion gates before replacing this Stable combination.
