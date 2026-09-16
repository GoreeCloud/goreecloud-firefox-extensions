# GoreeCloud Advanced Tab Manager — Repository Specifications

This repository document describes the implemented source boundary for version `0.1.7`. The broader product direction is governed by the canonical Drive project specification.

## Implemented source contract

- Firefox Manifest V3 extension; add-on ID `advanced-tab-manager@goreecloud.com`; Firefox 139+ baseline.
- Non-persistent ES-module background scripts.
- Permissions only: `alarms`, `sessions`, `storage`, `tabGroups`, and `tabs`.
- No `unlimitedStorage`, host permissions, content scripts, remote telemetry, page-content inspection, or private-browsing access.
- Firefox remains authoritative for live tabs/windows/native groups; UI/rule snapshots are reconstructed from Firefox APIs.
- Runtime Firefox tab/group IDs are not durable persistent identity.
- Existing Tab Set/stash state, snooze recovery state, and rule definitions remain in separate versioned `storage.local` records.
- Restorable URLs remain limited to `http:`, `https:`, and `about:blank`.
- Existing tree, Tab Set, stash, exact-duplicate, guarded-cleanup, restart-safe snooze, and explicit rule-action contracts remain in force.

### 0.1.6 ATM-008A rule-action boundary retained

- Rule state remains schema version 1 and globally disabled by default.
- Rules use deterministic all-condition matching, explicit integer priority, stable ties, explainable expected/observed/matched data, and private-tab exclusion.
- Optional actions remain restricted to `pin`, `unpin`, `mute`, `unmute`, and `discard`; unsupported, duplicate, or contradictory actions fail closed.
- Equal-priority differing action plans conflict and block mutation for the affected tab.
- Preview does not mutate Firefox. **Apply now** is a separate explicit user operation with two fresh snapshot plans plus a final target-tab read before mutation.
- Rule action execution does not close, navigate, or create tabs and does not widen manifest permissions.

### 0.1.7 ATM-008B command-palette boundary

- `src/core/commands.js` owns a browser-API-independent, immutable catalog of nine bounded commands plus deterministic local query matching and exact lookup.
- Empty queries preserve authored order. Non-empty queries use case-insensitive AND token matching; title and keyword matches produce deterministic ranking with authored order as the tie-break.
- The palette can only request existing sidebar behavior: open Tree, Native groups, Duplicates, Saved items, Snoozed, or Rules views; focus the local sidebar search; refresh current state; or invoke the existing focused-window Tab Set save control.
- `src/sidebar/command-palette.js` contains no direct `browser.*` calls. Execution is routed through existing sidebar controls so the palette does not create a parallel browser-authority path.
- The palette opens from a visible top-bar control or `Ctrl/⌘+K`, supports keyboard result traversal and Enter execution, closes with Escape, and supports pointer selection.
- The overlay exposes dialog/listbox semantics and includes Reduced Transparency and Forced Colors CSS fallbacks.
- The command palette does not add automatic behavior, close/navigate/mutate tabs directly, inspect page content, or request any new permission.

## Release boundary

`0.1.7` is a source candidate. Source tests, CI, deterministic packaging, or merge do not establish representative Firefox runtime acceptance, browser-restart acceptance, event-driven automatic-rule acceptance, command-palette runtime/accessibility acceptance, Mozilla signing, signed-XPI acceptance, production release, or Stable qualification.
