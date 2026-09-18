# Changelog

## 0.2.0 — 2026-08-17

- Preserved the functionally accepted Google Keep → GoreeCloud Memos redirect behavior.
- Added a dedicated GoreeCloud Redirector product icon in local SVG and raster sizes.
- Added manifest application and toolbar icon metadata.
- Aligned the popup and settings interface to Glaze UI 1.0.0 semantic colors, gradients, radii, minimum target sizing, accessibility fallbacks, and local-asset privacy requirements.
- Improved popup destination labeling to identify GoreeCloud Memos as the product while retaining the destination hostname.
- Added runtime version display in settings.
- Added duplicate-source validation for custom redirects.
- Added self-matching destination-loop validation for custom redirects.
- Set the Firefox minimum version to 140 to align with Firefox built-in data-collection consent metadata behavior.
- Added zero-dependency source validation, release documentation, AMO signing guidance, credential-safe signing helper, Git ignore rules, security/privacy records, and GitHub Actions validation.
- Completed Mozilla signing and signed-build acceptance testing in Firefox Release.
- Verified normal installation, persistence after a full Firefox restart, and continued Google Keep → GoreeCloud Memos redirection.
- Promoted GoreeCloud Redirector v0.2.0 from Release Candidate to **Stable**.

## 0.1.0 — 2026-08-17

- Created GoreeCloud Redirector as a Firefox Manifest V3 extension.
- Added built-in Google Keep → GoreeCloud Memos redirect.
- Added toolbar control for enabling or pausing the built-in redirect.
- Added custom redirect management with per-source runtime host-permission requests.
- Added local-only rule metadata storage.
- Added privacy-first Glaze-inspired settings and popup interfaces.
- Declared no data collection in Firefox-specific manifest metadata.
