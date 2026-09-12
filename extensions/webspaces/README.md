# GoreeCloud Webspaces

**Canonical repository:** `GoreeCloud/goreecloud-firefox-extensions`  
**Component path:** `extensions/webspaces/`  
**Source lifecycle:** Source candidate / Active Development  
**Firefox add-on ID:** `webspaces@goreecloud.com`  
**Source version:** `0.1.2`

GoreeCloud Webspaces is a Firefox extension for isolated browsing environments, deterministic website routing, and multi-account separation. Firefox contextual identities are the browser isolation mechanism; GoreeCloud Webspaces is the product, management surface, routing authority, and user-facing abstraction.

## Implemented source-candidate capabilities

This source candidate currently provides:

- Built-in Webspace provisioning for GoreeCloud, Google, Microsoft, and Meta.
- Local-first versioned configuration.
- Deterministic provider, user-assignment, and exception routing.
- GoreeCloud Webspaces toolbar and management UI.
- Custom Webspace creation and explicit domain assignment management.
- Routing pause/resume and routing-reason display.
- Race-hardened tab migration that creates the destination Webspace tab at `about:blank`, marks it as an internal transition, then starts the requested website navigation before removing the original tab.
- Failure-safe migration that retains the original tab when destination navigation setup fails.
- Routing, management, and tab-migration unit tests plus source validation.

## Firefox contextual-identity boundary

Firefox contextual identities are browser-level primitives. Firefox itself and other container-management extensions can therefore enumerate identities created by GoreeCloud Webspaces. Firefox does not provide a private per-extension container namespace.

Two extensions that automatically route the same sites can also conflict. GoreeCloud Webspaces cannot safely detect or override another extension's private routing configuration without broader extension-management authority, so overlapping automatic assignments should be disabled during testing and avoided in normal use.

## Development validation

From the repository root:

```bash
python extensions/webspaces/scripts/validate.py
node --experimental-default-type=module --test extensions/webspaces/tests/*.test.js
```

Repository-wide validation and deterministic packaging are handled by the shared Firefox-extension tooling.

## Development loading

Open `about:debugging` in Firefox, choose **This Firefox**, select **Load Temporary Add-on**, and choose `extensions/webspaces/manifest.json` or the generated unsigned XPI candidate.

## Security and privacy boundary

Webspaces separates Firefox-supported contextual-identity state. It does not by itself provide a VPN, separate IP addresses, process isolation, malware sandboxing, anonymity, fingerprinting resistance, or complete tracking prevention.

No Wardveil Security, Privacy Shield, Everkeep, GoreeCloud Mesh, GoreeCloud Identity, GoreeCloud Manager, or Glaze UI runtime integration is claimed by this source candidate.

## Authoritative product specification

The broader product requirements are maintained in the canonical GoreeCloud Drive record **Project Specification — Webspaces.docx**.
