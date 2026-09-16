# GoreeCloud Advanced Tab Manager

GoreeCloud Advanced Tab Manager is a local-first Firefox WebExtension for high-scale tab organization. Firefox remains authoritative for live tabs, windows, and native tab groups; the extension reconstructs live state on demand and augments it with extension-owned organization and recovery metadata.

## Current source state

- Version: `0.1.7`
- Lifecycle: `source-candidate`
- Firefox add-on ID: `advanced-tab-manager@goreecloud.com`
- Minimum Firefox version: `139.0`
- Stable release: none
- Permissions: `alarms`, `sessions`, `storage`, `tabGroups`, `tabs`
- Host permissions: none
- Content scripts: none
- Private browsing: explicitly not allowed by manifest

The current source implements live window/tab/native-group synchronization, durable logical-ID trees, persistent Tab Sets, transactional tab stashing, reviewed exact-URL duplicate cleanup, restart-safe one-shot snoozing, a deterministic local rule engine, bounded explicit rule actions, and a keyboard-first command-palette foundation.

Tree relationships remain keyed by extension-owned logical tab identity rather than Firefox runtime tab IDs. Tab Sets, stashed items, snoozed recovery records, and rule definitions remain local to the extension. The Tab Set/stash, snooze, and rule stores are independently versioned so new capabilities do not silently migrate or reinterpret unrelated saved-state data.

The current restorable URL boundary is `http:`, `https:`, and `about:blank`; privileged or executable schemes are not persisted for reconstruction.

### Source-preserving operations

Stashing uses: **persist recovery state → verify persistence → close source tab**.

Snoozing uses: **persist snooze recovery state → verify persistence → create and verify a one-shot Firefox alarm → close source tab**. If alarm scheduling/verification or tab closure fails, the implementation attempts to restore the exact previous snooze record and clears the attempted alarm.

Firefox alarms are session-scoped, so persisted snooze deadlines—not alarms—are authoritative. When the non-persistent background page starts, Advanced Tab Manager rebuilds its expected alarms from `storage.local`; overdue items receive a short startup grace before restore is attempted. A failed due restore keeps recovery state and schedules a bounded retry rather than dropping the item.

Due restoration creates the replacement tab before consuming the snooze record, reapplies supported pin/native-group metadata, attempts tree-parent restoration when the logical parent is live in the target window, and removes recovery state only after replacement succeeds. Failure to consume stored recovery state rolls the replacement back.

The current snooze UI exposes **Snooze 1 hour**, a dedicated **Snoozed** view, exact local wake times, **Open now**, and **+1h** rescheduling. Recurring snoozes, notifications, and remote synchronization are not part of 0.1.7.

Duplicate cleanup remains review-first and exact-URL-only. Active, pinned, audible, hidden/private, tree-linked, and explicitly excluded tabs are not eligible for duplicate cleanup.

### Rule engine and ATM-008A

The local rule store remains `goreecloud.advancedTabManager.ruleState.v1`. The rule engine is globally disabled by default and each rule has its own enabled state, explicit integer priority, stable ID, timestamps, and one to eight conditions.

Version 0.1.6 added optional rule actions without changing the storage schema version. New actions remain restricted to **pin**, **unpin**, **mute**, **unmute**, and **discard**. Unsupported, duplicate, or contradictory actions fail closed. **Apply now is explicit and user-triggered** and performs fresh-plan/live-tab rechecks before bounded mutations.

### Command palette — 0.1.7

Version 0.1.7 adds a sidebar-local command palette opened by the toolbar button or `Ctrl/⌘+K`. Its catalog and query ranking are pure, deterministic, and browser-API independent. Multi-token matching is AND-based and stable authored order resolves equal scores.

The palette deliberately exposes only existing bounded sidebar actions: open Tree, Native groups, Duplicates, Saved items, Snoozed, or Rules views; focus the main local search field; refresh live/saved state; and save the focused window as a local Tab Set. It routes through established sidebar controls instead of introducing direct browser APIs or new permissions. It does not close, navigate, pin, mute, discard, or otherwise mutate live tabs by itself.

Keyboard interaction supports up/down selection, Enter execution, Escape close, and `Ctrl/⌘+K` toggle. The overlay includes Reduced Transparency and Forced Colors fallbacks.

It does **not** yet implement tree drag-and-drop/bulk tree operations, normalized duplicate matching, durable protected-tab rules, event-driven automatic rule application, automatic discard policy, import/export, the full manager/settings interface, richer command actions, Webspaces integration, representative Firefox runtime acceptance, Mozilla signing, or Stable release acceptance.

## Development validation

```bash
python extensions/advanced-tab-manager/scripts/validate.py
node --test extensions/advanced-tab-manager/tests/*.test.mjs
python shared/scripts/validate_repository.py
python shared/scripts/package_extension.py advanced-tab-manager
```

Packaging produces a deterministic unsigned XPI under `dist/`. An unsigned package is not a Stable release.
