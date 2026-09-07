# Download Manager test scope

Automated tests under this directory cover native helper core behavior and source-level installer contracts. Target-environment acceptance remains manual where Firefox, Flatpak/XDG portal authorization, and real browser download behavior are involved.

For Firefox 155.0.1 Flatpak acceptance, verify:

1. The unsigned XPI loads through `about:debugging` with add-on ID `download-manager@goreecloud.com`.
2. Popup, Manager, Settings, and background startup work.
3. The Linux native-host installer reports protocol self-test success.
4. A Firefox WebExtensions portal authorization prompt appears when required and the Settings page reports `Native helper connection opened.` after approval.
5. Native mode completes a real range-capable download with multiple effective segments.
6. Pause/resume, restart recovery, collision-safe destination handling, and final file integrity are demonstrated before release promotion.

Passing source CI does not replace target-environment acceptance or Mozilla signing.
