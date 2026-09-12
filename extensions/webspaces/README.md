# GoreeCloud Webspaces

**Canonical repository:** `GoreeCloud/goreecloud-firefox-extensions`  
**Component path:** `extensions/webspaces/`  
**Source lifecycle:** Source candidate / Active Development  
**Firefox add-on ID:** `webspaces@goreecloud.com`  
**Source version:** `0.1.9`

GoreeCloud Webspaces is a Firefox extension for isolated browsing environments, deterministic website routing, and multi-account separation. Firefox contextual identities are the browser isolation mechanism; GoreeCloud Webspaces is the product, management surface, routing authority, and user-facing abstraction.

## Implemented source-candidate capabilities

0.1.9 carries the 0.1.8 keyboard/productivity, routing-control, lifecycle, explainability, temporary-Webspace, assignment-management, portability, locking, and Glaze UI work forward and establishes **Standard** as the built-in fallback Webspace for ordinary unassigned browsing.

- Built-in Webspaces are Standard, GoreeCloud, Google, Microsoft, and Meta.
- Standard has its own Firefox contextual identity and is the default destination for otherwise-unassigned external HTTP(S) websites while automatic routing is active.
- Explicit user assignments, user exceptions, provider mappings, and higher-priority routing rules continue to supersede Standard according to deterministic precedence.
- Deliberate routing pauses and explicit exceptions may keep a site outside Standard when their higher-priority semantics apply.
- `localhost`, loopback addresses, and local-development hosts remain explicit-only and are not automatically swept into Standard.
- Configuration schema 2 migrates previous schema-1/default-browsing settings to the fixed Standard fallback without discarding existing Webspace definitions, assignments, or exceptions.
- Portable configuration normalizes the fallback to Standard rather than importing an obsolete Normal-Firefox or arbitrary-global-default mode.
- Standard appears in the Webspace launcher, management UI, identity treatment, Firefox context-menu destinations, and keyboard-command model like the other persistent built-ins.
- Firefox-registered commands cover the Webspaces launcher, Standard, GoreeCloud, Google, Microsoft, Meta, routing pause/resume, and the full manager; shortcut assignment remains under explicit Firefox/user control.
- The compact Glaze routing-control disclosure remains collapsed while routing is active and expands when routing is paused.

The broader implemented slice includes deterministic provider/user/exception routing; race-hardened tab migration; timed/site/restart/indefinite routing pauses; bulk assignment; explicit local-development routing; first-party Glaze UI popup and manager; **Why this Webspace?**; context-menu actions; persistent and temporary custom Webspaces; Close & Forget; appearance editing; duplicate, lock/unlock, reset, and custom deletion; searchable/editable site assignments; local conflict detection and rule testing; local managed-tab counts; and portable JSON configuration import/export.

## Standard fallback boundary

Standard is the V1 fallback for ordinary external HTTP(S) websites that do not match a more specific destination. It is not a claim that every browser page can or should be containerized. Browser-internal pages, unsupported schemes, explicit exceptions, active routing pauses, and explicit-only local-development hosts may remain outside Standard.

Standard does not replace the routing priority system. If a site is assigned to Work or recognized as Google, Microsoft, Meta, GoreeCloud, or another higher-priority destination, that specific rule wins. The goal is to eliminate routine unassigned browsing in Normal Firefox while preserving deliberate escape and development cases.

## Keyboard-shortcut boundary

Webspaces registers supported commands but does not silently reserve keyboard combinations. Users assign or change shortcuts through Firefox's extension-shortcut settings. The launcher command attempts to open the toolbar popup from the keyboard user gesture and falls back to the full manager if Firefox rejects popup opening in the current window state.

## Routing-control boundaries

A site-only pause applies to the exact hostname selected by the user and does not automatically cover sibling or parent subdomains. A restart-scoped pause is cleared when Firefox emits its extension startup event. Timed pauses expire by their stored deadline and do not require browsing-history telemetry.

Bulk assignment is intentionally conservative: existing assignments to another unlocked Webspace are reported as skipped rather than silently overwritten, and rules owned by a locked Webspace cannot be retargeted.

## Close & Forget boundary

Close & Forget is exposed only while the active tab is actually inside a temporary Webspace. It closes tabs associated with that temporary Webspace and asks Firefox to remove that contextual identity. It does not claim verified deletion of every cache entry, browser artifact, network record, or other state outside what Firefox's contextual-identity APIs establish. Webspaces does not request `browsingData` merely to make a broader deletion claim.

## Portability boundary

Normal exports contain configuration rather than authenticated browsing state. Exports exclude Firefox `cookieStoreId` values, temporary Webspaces, temporary/timed routing-pause state, authentication cookies, active login sessions, passwords, credentials, and browsing history. Imports create fresh Firefox identities for imported custom Webspaces and normalize fallback behavior to Standard.

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

The broader product requirements remain in the canonical GoreeCloud Drive record **Project Specification — Webspaces.docx**, which now defines Standard as the V1 fallback for otherwise-unassigned external HTTP(S) websites.
