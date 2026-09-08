# Installation — GoreeCloud Download Manager Extension

## Firefox extension

GoreeCloud Download Manager Extension **0.2.11 is the accepted Stable Mozilla-signed release** for unlisted/self-distribution. Its governed release run installed the signed XPI non-temporarily, restarted the full Firefox process using the same profile without reinstalling, and completed the required native same-job recovery/integrity acceptance.

Unsigned Development builds may still be loaded temporarily from `about:debugging` → **This Firefox** → **Load Temporary Add-on**. Temporary loading is development-only and does not replace the accepted signed artifact or establish Stable status for any later version.

## Linux native helper

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

The 0.2.11 installer compiles the installed helper and performs a Native Messaging startup/ping self-test before reporting success. The self-test requires helper version `0.2.11`, protocol `2`, and the capabilities `segmented-range-integrity`, `same-job-recovery`, `no-overwrite-publish`, `ephemeral-request-headers`, and `staging-link-rejection`. A stale, mismatched, or capability-incomplete helper fails closed instead of being silently treated as compatible.

0.2.11 is required because the Mozilla-signed 0.2.10 full-browser restart diagnostic exposed a segmented-publication defect in the 0.2.10 helper: it attempted to write binary recovered segment data through a text-mode assembled staging stream. The 0.2.11 helper fixes that final assembly path while retaining the existing metadata, range-integrity, no-overwrite, and staging-link protections.

The helper requires trusted metadata and source identity before persisted partial reuse. It also rejects symbolic-link substitution at the native staging root, per-job staging directory, metadata/part/assembled files, and final staging-source publication boundary. File opens use no-follow semantics where supported by the host OS. These controls are defense in depth for the Linux native helper; they do not claim a universal filesystem sandbox against another process with unrestricted access to the same user account.

To remove the user-scoped native helper:

```bash
./extensions/download-manager/scripts/install-native-host-linux.sh --uninstall
```

## Firefox Flatpak

For Firefox distributed as `org.mozilla.firefox` through Flatpak, native messaging can use the `org.freedesktop.portal.WebExtensions` XDG portal. The installer reports whether that portal interface is visible.

If the helper is installed and self-tests successfully but Firefox still reports it unavailable, open `about:config`, set `widget.use-xdg-desktop-portal.native-messaging` to `1`, restart Firefox, and approve the WebExtensions portal prompt for `goreecloud_download_manager` when it appears.

Do not grant the Firefox sandbox arbitrary host command execution merely to work around native messaging. Use the WebExtensions portal path when available.

## Verification

In the extension Settings page, click **Test native helper**. A successful 0.2.11 connection reports the validated helper version and protocol, for example:

```text
Native helper 0.2.11 · protocol 2 ready.
```

A legacy helper, protocol mismatch, minimum-version failure, or missing required capability is rejected with reinstall guidance. The handshake alone is not release acceptance; for Stable 0.2.11 the separate Mozilla signing and persistent-install/full-browser-restart acceptance was completed in governed GitHub Actions run `34174320808`.

Any later runtime version must repeat the applicable signing, installation, restart, recovery, integrity, and lifecycle-promotion gates before it can replace 0.2.11 as Stable.
