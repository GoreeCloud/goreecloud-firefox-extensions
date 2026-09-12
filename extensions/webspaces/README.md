# GoreeCloud Webspaces

**Canonical repository:** `GoreeCloud/goreecloud-firefox-extensions`  
**Component path:** `extensions/webspaces/`  
**Source lifecycle:** Source candidate / Active Development  
**Firefox add-on ID:** `webspaces@goreecloud.com`  
**Source version:** `0.1.1`

GoreeCloud Webspaces is a Firefox extension for isolated browsing environments, deterministic website routing, and multi-account separation. Firefox contextual identities are the browser isolation mechanism; GoreeCloud Webspaces is the product, management surface, routing authority, and user-facing abstraction.

## Implemented source-candidate capabilities

This source candidate currently provides:

- Manifest V3 Firefox extension foundation.
- Built-in Webspace provisioning for GoreeCloud, Google, Microsoft, and Meta.
- Versioned local configuration storage.
- Deterministic routing with explicit precedence and reason codes.
- Built-in GoreeCloud and provider rules plus explicit user assignments and exceptions.
- Top-level HTTP(S) navigation rerouting into the target Firefox contextual identity.
- Replacement-before-removal tab migration safety.
- Reroute-loop suppression.
- GoreeCloud Webspaces toolbar popup showing the current Webspace and routing reason.
- Webspace launcher actions for opening a new tab in a selected Webspace.
- First-party routing pause control.
- First-party “Always open this site in” assignment control.
- GoreeCloud Webspaces management page.
- Custom Webspace creation with Firefox-supported colors and icons.
- Explicit site-assignment review and removal.
- Routing and management unit tests plus source validation.

## Firefox contextual-identity boundary

Firefox contextual identities are browser-level primitives. Firefox itself and other container-management extensions can therefore enumerate identities created by GoreeCloud Webspaces. Firefox does not provide a private per-extension container namespace.

GoreeCloud Webspaces must not present another extension's UI as its own product surface. Webspaces created by GoreeCloud are tracked by GoreeCloud's local Webspace-to-`cookieStoreId` mapping and are managed through the GoreeCloud Webspaces popup and management page. The Firefox identity is an adapter/runtime mechanism, not the GoreeCloud product identity.

## Development validation

From the repository root:

```bash
python extensions/webspaces/scripts/validate.py
node --experimental-default-type=module --test extensions/webspaces/tests/*.test.js
```

Repository-wide validation and deterministic packaging are handled by the shared Firefox-extension tooling.

## Development loading

Open `about:debugging` in Firefox, choose **This Firefox**, select **Load Temporary Add-on**, and choose `extensions/webspaces/manifest.json` or the generated unsigned XPI candidate.

After loading, use the **GoreeCloud Webspaces** toolbar button to view the current Webspace, open a Webspace tab, change a site assignment, pause routing, or open the management page.

## Security and privacy boundary

Webspaces separates Firefox-supported contextual-identity state. It does not by itself provide a VPN, separate IP addresses, process isolation, malware sandboxing, anonymity, fingerprinting resistance, or complete tracking prevention.

No Wardveil Security, Privacy Shield, Everkeep, GoreeCloud Mesh, GoreeCloud Identity, GoreeCloud Manager, or Glaze UI runtime integration is claimed by this source candidate. Those remain separate implementation and acceptance boundaries.

## Authoritative product specification

The broader product requirements are maintained in the canonical GoreeCloud Drive record **Project Specification — Webspaces.docx**. `SPECIFICATIONS.md` is the version-coupled implementation specification for this component.
