# GoreeCloud Webspaces

**Canonical repository:** `GoreeCloud/goreecloud-firefox-extensions`  
**Component path:** `extensions/webspaces/`  
**Source lifecycle:** Source candidate / Active Development  
**Firefox add-on ID:** `webspaces@goreecloud.com`  
**Source version:** `0.1.12`

GoreeCloud Webspaces is a Firefox extension for isolated browsing environments, deterministic website routing, and multi-account separation. Firefox contextual identities are the browser isolation mechanism; GoreeCloud Webspaces is the product, management surface, routing authority, and user-facing abstraction.

## Implemented source-candidate capabilities

0.1.12 carries the verified Standard fallback, per-Webspace isolation, Isolation Health, lifecycle, routing, explainability, assignment-management, portability, keyboard, and Glaze UI work forward while adding local provider branding and a dedicated Proton Webspace.

- Built-in Webspaces are **Standard, GoreeCloud, Google, Microsoft, Meta, and Proton**.
- Standard has its own Firefox contextual identity and is the default destination for otherwise-unassigned external HTTP(S) websites while automatic routing is active.
- Proton has its own Firefox contextual identity and routes the Proton ecosystem through the same deterministic provider-routing layer. Initial built-in Proton domains are `proton.me`, `protonmail.com`, and `protonvpn.com`, covering Proton Mail, Drive, Calendar, Pass, VPN, account surfaces, and related Proton services hosted under those domains.
- Built-in identities use local packaged visual marks in the toolbar popup and manager instead of letter/symbol placeholders. Standard and GoreeCloud use existing first-party GoreeCloud assets; Google, Microsoft, Meta, and Proton use locally packaged provider marks with attribution/licensing recorded in `vendor/THIRD_PARTY_NOTICES.md`.
- The logo layer is presentation-only. Text names, deterministic Webspace IDs, Firefox contextual identities, and fallback glyphs remain the functional/accessibility identity sources if an image cannot render.
- Every GoreeCloud-managed Webspace is required to own a distinct Firefox contextual identity and unique `cookieStoreId`; the source fails closed if two managed Webspaces are mapped to the same Firefox cookie store or if a managed Webspace lacks one.
- The manager verifies the current Webspace-to-Firefox-identity map without reading or exposing authentication-cookie contents. It reports managed Webspace count, unique cookie-store count, Firefox identities present, and per-Webspace isolation status.
- Isolation Health uses a dedicated `webspaces-health:*` runtime-message namespace so its background handler does not collide with the main `webspaces:*` message router.
- Explicit user assignments, user exceptions, provider mappings, and higher-priority routing rules supersede Standard according to deterministic precedence.
- `localhost`, loopback addresses, and local-development hosts remain explicit-only and are not automatically swept into Standard.
- Configuration schema 2 remains current; adding Proton does not change the stored configuration shape. Startup reconciliation creates the newly required built-in Proton contextual identity when it is absent without reusing another Webspace's cookie store.
- Firefox-registered commands cover the launcher, Standard, GoreeCloud, Google, Microsoft, Meta, Proton, routing pause/resume, and the manager; shortcut assignment remains under explicit Firefox/user control.

The broader implemented slice includes race-hardened tab migration; 5/30-minute, site, restart-scoped, and indefinite routing pauses; bulk assignment; **Why this Webspace?**; context-menu actions; persistent and temporary custom Webspaces; Close & Forget; appearance editing; duplicate, lock/unlock, reset, and custom deletion; searchable/editable site assignments; local conflict detection and rule testing; managed-tab counts; and portable JSON configuration import/export.

## Standard fallback boundary

Standard is the V1 fallback for ordinary external HTTP(S) websites that do not match a more specific destination. Browser-internal pages, unsupported schemes, explicit exceptions, active routing pauses, and explicit-only local-development hosts may remain outside Standard.

A more specific assignment or recognized provider destination always wins. Google, Microsoft, Meta, Proton, GoreeCloud, and user-defined routes therefore supersede Standard when they match.

## Per-Webspace isolation invariant

Each managed Webspace maps one-to-one to a distinct Firefox contextual identity. A `cookieStoreId` may belong to only one GoreeCloud Webspace at a time. Standard, GoreeCloud, Google, Microsoft, Meta, Proton, every custom persistent Webspace, every duplicated Webspace, every imported custom Webspace, and every temporary Webspace therefore use separate Firefox cookie stores.

Firefox contextual identities separate cookies by design and partition supported site state through contextual identity/origin attributes where Firefox supports that behavior. Webspaces does not claim that browser-global history, bookmarks, saved passwords, IP addresses, or operating-system state are independently isolated merely because a tab is in a Webspace.

## Isolation Health boundary

Isolation Health validates the GoreeCloud-managed identity map against Firefox's current contextual identities. Live Firefox 155.0.1 acceptance evidence for 0.1.11 confirmed a healthy five-Webspace state with five managed Webspaces, five unique cookie stores, five Firefox identities present, and every listed Webspace marked isolated. 0.1.12 must be re-accepted after Proton creates the sixth built-in identity.

## Provider-logo boundary

Provider logos are bundled local assets; Webspaces does not fetch remote artwork at runtime. Provider marks are used only to identify Webspace destinations and do not imply affiliation, sponsorship, or endorsement. Third-party marks remain the property of their respective owners. The provider logo layer never changes routing authority or Firefox cookie-store ownership.

## Keyboard-shortcut boundary

Webspaces registers supported commands but does not silently reserve keyboard combinations. Users assign or change shortcuts through Firefox's extension-shortcut settings.

## Close & Forget and portability boundaries

Close & Forget is exposed only for a temporary Webspace and requests removal of its Firefox contextual identity after closing its managed tabs. It does not claim deletion of browser-global state beyond Firefox evidence.

Portable exports contain configuration, not authenticated browsing state. Exports exclude `cookieStoreId` values, temporary Webspaces, authentication cookies, active login sessions, credentials, browsing history, and transient routing-pause state. Imports create fresh Firefox identities for imported custom Webspaces.

## Glaze UI boundary

GLAZE UI V1.3 / `1.3.0` remains the shared Stable consumer target. Webspaces maps its Firefox surfaces to that direction through local assets and now uses recognizable built-in provider marks while retaining non-color fallback identity cues.

## Development validation

```bash
python extensions/webspaces/scripts/validate.py
node --experimental-default-type=module --test extensions/webspaces/tests/*.test.js
```

## Security and privacy boundary

Webspaces does not by itself provide a VPN, separate IP addresses, operating-system process isolation, malware sandboxing, anonymity, fingerprinting resistance, or complete tracking prevention. No Wardveil Security, Privacy Shield, Everkeep, GoreeCloud Mesh, GoreeCloud Identity, or GoreeCloud Manager runtime integration is claimed by this source candidate.

## Authoritative product specification

The broader product requirements remain in the canonical GoreeCloud Drive record **Project Specification — Webspaces.docx**.
