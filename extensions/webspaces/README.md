# GoreeCloud Webspaces

**Canonical repository:** `GoreeCloud/goreecloud-firefox-extensions`  
**Component path:** `extensions/webspaces/`  
**Source lifecycle:** Source candidate / Active Development  
**Firefox add-on ID:** `webspaces@goreecloud.com`  
**Source version:** `0.1.7`

GoreeCloud Webspaces is a Firefox extension for isolated browsing environments, deterministic website routing, and multi-account separation. Firefox contextual identities are the browser isolation mechanism; GoreeCloud Webspaces is the product, management surface, routing authority, and user-facing abstraction.

## Implemented source-candidate capabilities

0.1.7 carries the verified 0.1.6 routing, lifecycle, explainability, temporary-Webspace, assignment-management, portability, locking, and Glaze UI work forward and adds the next routing-control/productivity slice:

- timed routing pauses for 5 or 30 minutes;
- routing pause until Firefox restarts;
- site-only routing pause for the current hostname;
- indefinite pause/resume with a visible pause state;
- configurable behavior for unassigned websites: open normally or open in a selected persistent Webspace;
- bulk assignment of newline/comma/semicolon-separated hostnames or HTTP(S) URLs;
- explicit user routing for local-development hosts such as `localhost`, `127.0.0.1`, and `[::1]` without automatically assigning them;
- conflict-safe bulk assignment that will not silently retarget an existing rule owned by another Webspace;
- locked-Webspace protections preserved for default-behavior changes and bulk assignment.

The broader implemented slice also includes built-in GoreeCloud, Google, Microsoft, and Meta Webspaces; provider/user/exception routing; race-hardened tab migration; first-party Glaze UI popup and manager; **Why this Webspace?**; context-menu actions; persistent and temporary custom Webspaces; Close & Forget; appearance editing; duplicate, lock/unlock, reset, and custom deletion; searchable/editable site assignments; local conflict detection and rule testing; local managed-tab counts; and portable JSON configuration import/export.

## Routing-control boundaries

A site-only pause applies to the exact hostname selected by the user and does not automatically cover sibling or parent subdomains. A restart-scoped pause is cleared when Firefox emits its extension startup event. Timed pauses expire by their stored deadline and do not require browsing-history telemetry.

The selected-default behavior implemented in this slice is intentionally limited to **Open normally** or **Open in selected Webspace**. Planned modes such as ask every time, inherit the current Webspace, or use temporary isolation are not claimed as implemented.

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
