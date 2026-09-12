# GoreeCloud Webspaces

**Canonical repository:** `GoreeCloud/goreecloud-firefox-extensions`  
**Component path:** `extensions/webspaces/`  
**Source lifecycle:** Source candidate / Active Development  
**Firefox add-on ID:** `webspaces@goreecloud.com`  
**Source version:** `0.1.5`

GoreeCloud Webspaces is a Firefox extension for isolated browsing environments, deterministic website routing, and multi-account separation. Firefox contextual identities are the browser isolation mechanism; GoreeCloud Webspaces is the product, management surface, routing authority, and user-facing abstraction.

## Implemented source-candidate capabilities

0.1.5 provides built-in GoreeCloud, Google, Microsoft, and Meta Webspaces; deterministic provider/user/exception routing; race-hardened tab migration; first-party Glaze UI popup and manager; explainable routing; context-menu Open Link, Move Tab, Always Open This Site In, and Remove Assignment actions; persistent and temporary custom Webspaces; temporary Close & Forget; appearance/description editing; duplicate, lock/unlock, reset, and custom deletion; searchable/editable site assignments; local conflict detection and rule testing; local managed-tab counts; and portable JSON configuration import/export.

Duplicating a Webspace creates a fresh isolated identity. Copied explicit assignments are disabled by default so duplication does not silently create competing active routes. Reset creates a replacement Firefox contextual identity before retiring the old identity.

## Close & Forget boundary

Close & Forget closes tabs associated with a temporary Webspace and asks Firefox to remove that contextual identity. It does not claim verified deletion of every cache entry, browser artifact, network record, or other state outside what Firefox's contextual-identity APIs establish. Webspaces does not request `browsingData` merely to make a broader deletion claim.

## Portability boundary

Normal exports contain configuration rather than authenticated browsing state. Exports exclude Firefox `cookieStoreId` values, temporary Webspaces, authentication cookies, active login sessions, passwords, credentials, and browsing history. Imports create fresh Firefox identities for imported custom Webspaces.

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
