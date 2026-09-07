# Download Manager test scope

Automated tests under this directory cover native helper core behavior, recovery-controller behavior, optional-permission source contracts, and source-level installer contracts. Target-environment acceptance remains manual where Firefox, Flatpak/XDG portal authorization, real browser download behavior, and runtime optional-permission prompts are involved.

For Firefox 155.0.1 Flatpak acceptance, verify:

1. The unsigned XPI loads through `about:debugging` with add-on ID `download-manager@goreecloud.com`.
2. Popup, Manager, Settings, and background startup work.
3. The Linux native-host installer reports protocol self-test success.
4. A Firefox WebExtensions portal authorization prompt appears when required and the Settings page reports `Native helper connection opened.` after approval.
5. Native mode completes a real range-capable download with multiple effective segments.
6. Pause/resume, native-helper interruption recovery, non-persistent background-context recovery, collision-safe destination handling, and final file integrity are demonstrated before release promotion.
7. Cookie forwarding remains disabled by default; Firefox's Cookies + All Sites permission remains optional and is acquired only through the explicit Settings-page user action.
8. A representative protected target rejects unauthenticated native access, then accepts an authenticated segmented transfer after the optional permission is granted.
9. The authenticated assembled output matches the source byte-for-byte, and the controlled credential is absent from extension download-state storage and native staging metadata.
10. Full-browser restart recovery is tested only with a persistent signed installation; temporary-XPI behavior is not sufficient for that gate.

Passing source CI does not replace target-environment acceptance or Mozilla signing.
