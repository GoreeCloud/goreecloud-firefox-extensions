# GoreeCloud Webspaces

**Canonical repository:** `GoreeCloud/goreecloud-firefox-extensions`  
**Component path:** `extensions/webspaces/`  
**Source lifecycle:** Source candidate / Active Development  
**Firefox add-on ID:** `webspaces@goreecloud.com`  
**Source version:** `0.1.0`

GoreeCloud Webspaces is a Firefox extension for isolated browsing environments, deterministic website routing, and multi-account separation. It uses Firefox contextual identities as the browser execution mechanism while keeping GoreeCloud-owned Webspace identities, routing rules, and configuration separate from Firefox's internal container terminology.

## Implemented development foundation

This source candidate currently provides:

- Manifest V3 Firefox extension foundation.
- Built-in Webspace provisioning for GoreeCloud, Google, Microsoft, and Meta.
- Versioned local configuration storage.
- Deterministic routing with explicit precedence and reason codes.
- Built-in GoreeCloud and provider rules plus user assignment and exception hooks.
- Top-level HTTP(S) navigation rerouting into the target Firefox contextual identity.
- Replacement-before-removal tab migration safety.
- Reroute-loop suppression.
- Routing-engine unit tests and source validation.

It does **not** yet provide the full planned management UI, toolbar launcher, context menus, temporary Webspaces, Close & Forget, synchronization, managed policy, or GoreeCloud platform-system integrations.

## Development validation

From the repository root:

```bash
python extensions/webspaces/scripts/validate.py
node --experimental-default-type=module --test extensions/webspaces/tests/routing.test.js
```

Repository-wide validation and deterministic packaging are handled by the shared Firefox-extension tooling.

## Development loading

Open `about:debugging` in Firefox, choose **This Firefox**, select **Load Temporary Add-on**, and choose `extensions/webspaces/manifest.json`.

## Security and privacy boundary

Webspaces separates Firefox-supported contextual-identity state. It does not by itself provide a VPN, separate IP addresses, process isolation, malware sandboxing, anonymity, fingerprinting resistance, or complete tracking prevention.

No Wardveil Security, Privacy Shield, Everkeep, GoreeCloud Mesh, GoreeCloud Identity, GoreeCloud Manager, or Glaze UI runtime integration is claimed by this source candidate. Those remain separate implementation and acceptance boundaries.

## Authoritative product specification

The broader product requirements are maintained in the canonical GoreeCloud Drive record **Project Specification — Webspaces.docx**. `SPECIFICATIONS.md` is the version-coupled implementation specification for this component.
