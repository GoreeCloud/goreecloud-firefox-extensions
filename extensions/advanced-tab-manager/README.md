# GoreeCloud Advanced Tab Manager

GoreeCloud Advanced Tab Manager is a local-first Firefox WebExtension for high-scale tab organization. Firefox remains authoritative for live tabs, windows, and native tab groups; the extension reconstructs live state on demand and augments it with extension-owned organization and recovery metadata.

## Current source state

- Version: `0.1.8`
- Source state: `source-candidate`
- Product lifecycle: In Development
- Component class: Browser extension
- Firefox add-on ID: `advanced-tab-manager@goreecloud.com`
- Minimum Firefox version: `139.0`
- Stable release: none
- Permissions: `alarms`, `sessions`, `storage`, `tabGroups`, `tabs`
- Host permissions: none
- Content scripts: none
- Private browsing: explicitly not allowed by manifest

The current source implements live Firefox tab/window/native-group reconstruction, durable logical-ID trees, persistent Tab Sets, transactional tab stashing, reviewed exact-URL duplicate cleanup, restart-safe one-shot snoozing, deterministic local rules with bounded explicit actions, a keyboard-first command palette, and the ATM-008C read-only manager/diagnostics foundation.

Firefox runtime tab/group IDs remain transient. Tree relationships use extension-owned logical IDs. Tab Set/stash, snooze, and rule data remain in separate versioned local records so one capability does not silently reinterpret another capability's saved state.

The restorable URL boundary is `http:`, `https:`, and `about:blank`. Privileged or executable schemes are not persisted for reconstruction.

### Source-preserving operations

Stashing uses **persist recovery state → verify persistence → close source tab**.

Snoozing uses **persist snooze recovery state → verify persistence → create and verify a one-shot Firefox alarm → close source tab**. Persisted deadlines are authoritative because Firefox alarms do not survive browser restarts. Startup reconstructs alarms from local storage; failed due restoration retains recovery state and schedules a bounded retry.

### Rule and command boundaries

Rules are local, globally disabled by default, priority-ordered, explainable, and limited to local tab/group metadata. Explicit actions remain restricted to pin/unpin, mute/unmute, and discard. Apply now re-reads live Firefox state and fails closed on drift or conflict.

The command palette is sidebar-local and opened by its visible control or `Ctrl/⌘+K`. Its pure command catalog/search layer has no browser API dependency. Commands route through established sidebar controls instead of creating a second browser-authority path.

### ATM-008C manager/diagnostics foundation — 0.1.8

Version 0.1.8 adds a full-window Manager surface reachable from the sidebar, toolbar popup, and command palette. This first manager slice is intentionally read-only.

The background aggregates a privacy-minimized manager model containing only live/saved counts, store availability/schema/revision metadata, source/lifecycle metadata, and manifest-declared permission posture. It does **not** serialize tab titles, tab URLs, saved-item URLs, rule contents, or browsing history into the manager model.

The Manager displays:

- current source version/lifecycle/component class and Firefox baseline;
- live tab/window/native-group/tree/pinned/discarded counts;
- Tab Set, stash, snooze, and rule counts;
- organizational/snooze/rule store schema/revision availability;
- extension permissions, host-permission count/list, content-script count, and private-browsing boundary.

A failure in one extension-owned store degrades that section without preventing the remaining diagnostics from rendering. The surface includes Reduced Transparency and Forced Colors fallbacks and uses native Firefox/system color semantics consistent with the existing constrained-browser Glaze presentation approach.

The Manager does not yet provide import/export, session snapshots, bulk organization, destructive settings, automatic rule execution, remote management, synchronization, or new Firefox permissions.

## GoreeCloud platform dependency posture

Required GoreeCloud runtime dependencies: none. Core tab management remains local and Firefox-native.

The current UI follows GoreeCloud Glaze presentation principles where practical for a Firefox extension surface, but 0.1.8 does not claim a separate Glaze runtime-package integration or product-level Glaze V1.5 acceptance. Webspaces integration and other platform-system integrations remain optional/planned and are not represented as implemented.

## Development validation

```bash
python extensions/advanced-tab-manager/scripts/validate.py
node --test extensions/advanced-tab-manager/tests/*.test.mjs
python shared/scripts/validate_repository.py
python shared/scripts/package_extension.py advanced-tab-manager
```

Packaging produces a deterministic unsigned XPI under `dist/`. Source/CI/package evidence does not establish representative Firefox runtime acceptance, Mozilla signing, production release, or Stable qualification.
