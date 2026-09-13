# GoreeCloud Webspaces — Features

## Implemented in Stable 0.1.14

- Built-in **Standard, GoreeCloud, Google, Microsoft, Meta, and Proton** Webspaces.
- **Provider logos:** built-in Webspaces use local packaged visual marks in the popup and manager instead of letter/symbol placeholders; fallback glyphs remain available if an asset cannot render.
- **Dedicated Proton Webspace:** `proton.me`, `protonmail.com`, and `protonvpn.com` route to Proton by default, covering Proton Mail, Drive, Calendar, Pass, VPN, account surfaces, and related Proton services on those domains.
- **Standard fallback:** ordinary external HTTP(S) websites with no more-specific routing rule open in the isolated Standard Webspace while automatic routing is active.
- **Current Webspace reconciliation:** the popup resolves the active Firefox contextual identity from the tab's `cookieStoreId` and falls back to Firefox cookie-store tab membership when the tab object does not expose the managed store reliably. This prevents a managed Standard/Proton/provider tab from being mislabeled as Normal Firefox.
- **Per-Webspace storage isolation:** every managed Webspace owns a distinct Firefox contextual identity and unique `cookieStoreId`; duplicate or missing mappings fail the isolation invariant instead of silently sharing authenticated state.
- **Isolation Health:** the manager verifies the GoreeCloud-managed identity map against Firefox contextual identities without reading cookie contents. Live Firefox acceptance confirmed six managed Webspaces, six unique cookie stores, six Firefox identities present, and every built-in identity marked isolated.
- Deterministic provider routing, explicit assignments, exceptions, reason codes, and rule priority.
- `localhost`, loopback addresses, and local-development hosts remain explicit-only instead of automatically falling back to Standard.
- **Why this Webspace?** candidate/priority explanation and local routing-rule tester.
- Firefox context menus for Open Link in Webspace, Move Tab to Webspace, Always Open This Site In, and Remove Webspace Assignment.
- Persistent and temporary custom Webspaces plus temporary **Close & Forget**.
- Custom description/color/icon editing, duplicate, lock/unlock, reset, and custom persistent deletion.
- Locked Webspaces protect explicit rules against popup/context-menu retargeting.
- Searchable assignment manager with exact/domain scope, add/edit/remove, enable/disable, destination changes, duplicate validation, and conflict reporting.
- Timed routing pauses, site-only pause, restart-scoped pause, indefinite pause, and explicit Resume.
- Bulk assignment for hostnames and HTTP(S) URLs with deduplication and conservative conflict handling.
- Firefox keyboard commands for the launcher, all six built-in Webspaces, routing pause/resume, and manager; shortcut assignment remains Firefox/user controlled.
- Per-Webspace and total managed-tab counts without persistent browsing history.
- Portable local JSON import/export excluding authenticated session state and transient routing-pause state.
- Race-hardened tab handoff and source-preserving failure behavior.
- GLAZE UI V1.3 local visual layer with first-party Webspaces identity, provider marks, system dark appearance, visible focus, Reduced Motion, Reduced Transparency, missing-blur, Forced Colors fallbacks, and preserved semantic hidden states.
- **Release-quality lifecycle labeling:** packaged UI identifies the exact version without embedding lifecycle claims into signed runtime bytes.
- **Governed Mozilla signing:** exact candidate digest binding, AMO secret isolation, Mozilla signature verification, signed-XPI artifact retention, persistent signed Firefox installation, and full same-profile restart acceptance.

## Stable acceptance evidence

The functional behavior has direct Firefox 155.0.1 evidence: Standard fallback and current-Webspace identity reconciliation, six distinct built-in cookie stores/identities, provider-logo rendering, Proton presence, and Proton Drive routing were all observed in the live browser.

Stable 0.1.14 additionally passed governed signing/restart run `34735370919`. The exact unsigned candidate SHA-256 is `ac605e4781a6dcc605d6c7474989e5f125cee12448580786cfefc4ffd81f3e00`; the Mozilla-signed XPI SHA-256 is `37a42b44e779b0a5585b622ae5040ffe1b51e15a72099e2c13182ca3c5a18479`. The gate verified signed package identity and Mozilla signature metadata, persistent installation, a full Firefox restart without reinstalling Webspaces, active registration after restart, and persistence of all six distinct built-in contextual identities.

## Stable release boundary

0.1.14 is the accepted Stable release for Mozilla unlisted/self-distribution. A later source version does not inherit that status automatically; it must independently complete the applicable signing, persistent-install, restart, and release-critical runtime gates before replacing 0.1.14.

## Boundaries

Provider marks are local presentation assets only and do not alter routing authority, contextual-identity ownership, or isolation semantics. Third-party marks remain the property of their respective owners and their inclusion does not imply affiliation or endorsement.

Standard is the fixed V1 fallback for otherwise-unassigned external HTTP(S) websites, not a universal container for browser-internal or unsupported pages. Each Webspace's isolation is bounded by Firefox contextual identities. Webspaces does not claim independent browser history, bookmarks, password stores, IP addresses, browser profiles, or operating-system sandboxes. Close & Forget does not claim complete erasure beyond what Firefox confirms. Import/export is configuration-only and excludes cookies, login sessions, credentials, browsing history, and temporary/timed pause state.

## Planned

Ask-every-time, inherit-current-Webspace, temporary-default behavior, richer wildcard/domain-group routing, bounded local routing history/statistics, managed enterprise policy, synchronization/recovery adapters, broader GoreeCloud platform integrations, Firefox Android acceptance, and broader full-product Glaze acceptance remain planned.
