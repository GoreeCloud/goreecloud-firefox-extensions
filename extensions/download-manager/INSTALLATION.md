# Installation — GoreeCloud Download Manager Extension

## Firefox extension

Unsigned Development builds may be loaded temporarily from `about:debugging` → **This Firefox** → **Load Temporary Add-on**. Persistent installation requires Mozilla signing and remains a separate release gate.

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

The 0.2.9 installer compiles the installed helper and performs a Native Messaging startup/ping self-test before reporting success. The self-test requires helper version `0.2.9`, protocol `2`, and the capabilities `segmented-range-integrity`, `same-job-recovery`, `no-overwrite-publish`, and `ephemeral-request-headers`. A stale or mismatched helper therefore fails installation validation instead of being silently treated as compatible.

The 0.2.9 helper also tightens the persisted staging trust boundary. Existing `.goreecloud-downloads/<job-id>/` partial data is reusable only when its `metadata.json` parses as the supported schema, belongs to the same GoreeCloud job ID and canonical HTTP/HTTPS URL, and contains valid bounded field types. Missing, malformed, foreign-job, unsupported-version, invalid-URL, or otherwise structurally invalid metadata causes staged partial files to be discarded before the source is restarted.

To remove the user-scoped native helper:

```bash
./extensions/download-manager/scripts/install-native-host-linux.sh --uninstall
```

## Firefox Flatpak

For Firefox distributed as `org.mozilla.firefox` through Flatpak, native messaging can use the `org.freedesktop.portal.WebExtensions` XDG portal. The installer reports whether that portal interface is visible.

If the helper is installed and self-tests successfully but Firefox still reports it unavailable, open `about:config`, set `widget.use-xdg-desktop-portal.native-messaging` to `1`, restart Firefox, and approve the WebExtensions portal prompt for `goreecloud_download_manager` when it appears.

Do not grant the Firefox sandbox arbitrary host command execution merely to work around native messaging. Use the WebExtensions portal path when available.

## Verification

In the extension Settings page, click **Test native helper**. A successful 0.2.9 connection reports the validated helper version and protocol, for example:

```text
Native helper 0.2.9 · protocol 2 ready.
```

A legacy helper, protocol mismatch, minimum-version failure, or missing required capability is rejected with an actionable reinstall message. The handshake remains necessary but not sufficient for release acceptance. Real segmented transfer, pause/resume, recovery, integrity, Mozilla signing, and persistent-install/restart behavior remain independent gates.
