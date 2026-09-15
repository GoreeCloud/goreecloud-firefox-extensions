# GoreeCloud Advanced Tab Manager

GoreeCloud Advanced Tab Manager is a local-first Firefox WebExtension for high-scale tab organization. Firefox remains authoritative for live tabs, windows, and native tab groups; the extension reconstructs live state on demand and augments it with extension-owned organization metadata.

## Current source state

- Version: `0.1.0`
- Lifecycle: `source-candidate`
- Firefox add-on ID: `advanced-tab-manager@goreecloud.com`
- Minimum Firefox version: `139.0`
- Stable release: none
- Host permissions: none
- Content scripts: none
- Private browsing: explicitly not allowed by manifest

This foundation implements live window/tab/native-group synchronization, a persistent sidebar surface, a lightweight popup, exact duplicate counting in the popup, safe tab activation/close/discard actions, and extension-owned logical tab identifiers stored with Firefox session tab values.

It does **not** yet implement trees, persistent Tab Sets, stashing, snoozing, automatic organization rules, hidden-tab Focus Mode, Webspaces integration, Mozilla signing, or Stable release acceptance.

## Development validation

```bash
python extensions/advanced-tab-manager/scripts/validate.py
node --test extensions/advanced-tab-manager/tests/*.test.mjs
python shared/scripts/validate_repository.py
python shared/scripts/package_extension.py advanced-tab-manager
```

Packaging produces a deterministic unsigned XPI under `dist/`. An unsigned package is not a Stable release.
