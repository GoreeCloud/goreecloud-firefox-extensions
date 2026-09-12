# GoreeCloud Webspaces

**Canonical repository:** `GoreeCloud/goreecloud-firefox-extensions`  
**Component path:** `extensions/webspaces/`  
**Source lifecycle:** Source candidate / Active Development  
**Firefox add-on ID:** `webspaces@goreecloud.com`  
**Source version:** `0.1.8`

GoreeCloud Webspaces is a Firefox extension for isolated browsing environments, deterministic website routing, and multi-account separation. Firefox contextual identities are the browser isolation mechanism; GoreeCloud Webspaces is the product, management surface, routing authority, and user-facing abstraction.

## Implemented source-candidate capabilities

0.1.8 carries the verified 0.1.7 routing-control, lifecycle, explainability, temporary-Webspace, assignment-management, portability, locking, and Glaze UI work forward and adds a keyboard/productivity refinement slice:

- Firefox-registered commands for opening the Webspaces launcher, GoreeCloud, Google, Microsoft, and Meta Webspaces, pausing/resuming routing, and opening the full manager;
- no hard-coded default key combinations, so shortcut assignment remains under explicit Firefox/user control;
- a first-party manager panel that shows current shortcut assignments and opens Firefox's Manage Extension Shortcuts interface;
- a compact Glaze routing-control disclosure in the toolbar popup that stays collapsed while routing is active and automatically expands when a pause is active;
- the same visible pause state, explicit Resume control, and semantic hidden-state protections from 0.1.7.

The broader implemented slice includes deterministic provider/user/exception routing; race-hardened tab migration; timed/site/restart/indefinite routing pauses; selected default Webspace behavior; bulk assignment; explicit local-development routing; first-party Glaze UI popup and manager; **Why this Webspace?**; context-menu actions; persistent and temporary custom Webspaces; Close & Forget; appearance editing; duplicate, lock/unlock, reset, and custom deletion; searchable/editable site assignments; local conflict detection and rule testing; local managed-tab counts; and portable JSON configuration import/export.

## Keyboard-shortcut boundary

Webspaces registers supported commands but does not silently reserve keyboard combinations. Users assign or change shortcuts through Firefox's extension-shortcut settings. The launcher command attempts to open the toolbar popup from the keyboard user gesture and falls back to the full manager if Firefox rejects popup opening in the current window state.

## Routing-control boundaries

A site-only pause applies to the exact hostname selected by the user and does not automatically cover sibling or parent subdomains. A restart-scoped pause is cleared when Firefox emits its extension startup event. Timed pauses expire by their stored deadline and do not require browsing-history telemetry.

The selected-default behavior remains intentionally limited to **Open normally** or **Open in selected Webspace**. Planned modes such as ask every time, inherit the current Webspace, or use temporary isolation are not claimed as implemented.

Bulk assignment is intentionally conservative: existing assignments to another unlocked Webspace are reported as skipped rather than silently overwritten, and rules owned by a locked Webspace cannot be retargeted.

## Close & Forget boundary

Close & Forget is exposed only while the active tab is actually inside a temporary Webspace. It closes tabs associated with that temporary Webspace and asks Firefox to remove that contextual identity. It does not claim verified deletion of every cache entry, browser artifact, network record, or other state outside what Firefox's contextual-identity APIs establish. Webspaces does not request `browsingData` merely to make a broader deletion claim.

## Portability boundary

Normal exports contain configuration rather than authenticated browsing state. Exports exclude Firefox `cookieStoreId` values, temporary Webspaces, temporary/timed routing-pause state, authentication cookies, active login sessions, passwords, credentials, and browsing history. Imports create fresh Firefox identities for imported custom Webspaces.

## Glaze UI boundary

GLAZE UI V1.3 / `1.3.0` remains the shared Stable consumer target. Webspaces maps its Firefox surfaces to that direction through local assets. This source candidate does not claim full downstream Glaze conformance or production acceptance without rendered/accessibility acceptance evidence.

## Firefox contextual-identity boundary

Firefox contextual identities are browser-level primitives and are not private to one extension. Webspaces remains the GoreeCloud product and configuration authority for its Webspace model, but Firefox owns the underlying contextual identities.

## Development validation

```bash
python extensions/webspaces/scripts/validate.py
node --experimental-default-type=module --test extensions/webspaces/tests/*.test.js
```

## Security and privacy boundary

Webspaces does not by itself provide a VPN, separate IP addresses, operating-system process isolation, malware sandboxing, anonymity, fingerprinting resistance, or complete tracking prevention. No Wardveil Security, Privacy Shield, Everkeep, GoreeCloud Mesh, GoreeCloud Identity, or GoreeCloud Manager runtime integration is claimed by this source candidate.

## Authoritative product specification

The broader product requirements remain in the canonical GoreeCloud Drive record **Project Specification — Webspaces.docx**.
