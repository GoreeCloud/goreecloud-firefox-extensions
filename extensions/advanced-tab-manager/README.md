# GoreeCloud Advanced Tab Manager

GoreeCloud Advanced Tab Manager is a local-first Firefox WebExtension for high-scale tab organization. Firefox remains authoritative for live tabs, windows, and native tab groups; the extension reconstructs live state on demand and augments it with extension-owned organization and recovery metadata.

## Current source state

- Version: `0.1.6`
- Lifecycle: `source-candidate`
- Firefox add-on ID: `advanced-tab-manager@goreecloud.com`
- Minimum Firefox version: `139.0`
- Stable release: none
- Permissions: `alarms`, `sessions`, `storage`, `tabGroups`, `tabs`
- Host permissions: none
- Content scripts: none
- Private browsing: explicitly not allowed by manifest

The current source implements live window/tab/native-group synchronization, durable logical-ID trees, persistent Tab Sets, transactional tab stashing, reviewed exact-URL duplicate cleanup, restart-safe one-shot snoozing, a deterministic local rule engine, and the bounded ATM-008A explicit rule-action layer.

Tree relationships remain keyed by extension-owned logical tab identity rather than Firefox runtime tab IDs. Tab Sets, stashed items, snoozed recovery records, and rule definitions remain local to the extension. The Tab Set/stash, snooze, and rule stores are independently versioned so new capabilities do not silently migrate or reinterpret unrelated saved-state data.

The current restorable URL boundary is `http:`, `https:`, and `about:blank`; privileged or executable schemes are not persisted for reconstruction.

### Source-preserving operations

Stashing uses: **persist recovery state → verify persistence → close source tab**.

Snoozing uses: **persist snooze recovery state → verify persistence → create and verify a one-shot Firefox alarm → close source tab**. If alarm scheduling/verification or tab closure fails, the implementation attempts to restore the exact previous snooze record and clears the attempted alarm.

Firefox alarms are session-scoped, so persisted snooze deadlines—not alarms—are authoritative. When the non-persistent background page starts, Advanced Tab Manager rebuilds its expected alarms from `storage.local`; overdue items receive a short startup grace before restore is attempted. A failed due restore keeps recovery state and schedules a bounded retry rather than dropping the item.

Due restoration creates the replacement tab before consuming the snooze record, reapplies supported pin/native-group metadata, attempts tree-parent restoration when the logical parent is live in the target window, and removes recovery state only after replacement succeeds. Failure to consume stored recovery state rolls the replacement back.

The current snooze UI exposes **Snooze 1 hour**, a dedicated **Snoozed** view, exact local wake times, **Open now**, and **+1h** rescheduling. Recurring snoozes, notifications, and remote synchronization are not part of 0.1.6.

Duplicate cleanup remains review-first and exact-URL-only. Active, pinned, audible, hidden/private, tree-linked, and explicitly excluded tabs are not eligible for duplicate cleanup.

### Rule engine and ATM-008A

The local rule store remains `goreecloud.advancedTabManager.ruleState.v1`. The rule engine is globally disabled by default and each rule has its own enabled state, explicit integer priority, stable ID, timestamps, and one to eight conditions.

The evaluator matches locally available tab metadata only: hostname, title, URL, native-group title, pinned, audible, muted, discarded, and tree-child state. Text comparisons are deterministic and case-insensitive; boolean comparisons use explicit `is` conditions. Rules use all-condition matching, higher numeric priority first, and stable rule-ID ordering for evaluation.

Version 0.1.6 adds optional rule actions without changing the storage schema version. Older rules with no action remain valid and preview-only. New actions are restricted to **pin**, **unpin**, **mute**, **unmute**, and **discard**. Unsupported, duplicate, or contradictory actions fail closed.

For each tab, the highest matching priority controls the action plan. If equal-priority matching rules disagree on the action list, the tab is marked conflicted and is not mutated. Preview exposes these plans and conflicts without changing Firefox.

**Apply now is explicit and user-triggered.** The background manager computes the plan from a fresh Firefox snapshot, reconstructs Firefox state again and recomputes it, then aborts if the plan changed or a conflict appeared. Each target tab is also re-read before mutation. The rule path can only pin/unpin, mute/unmute, or discard; it cannot close tabs, navigate tabs, create tabs, inspect page content, or widen permissions.

The sidebar includes a dedicated **Rules** view with engine enable/disable, a bounded hostname-rule creation form, rule enable/disable/delete, preview, conflict counts, and an Apply now confirmation. Event-driven automatic rule application and richer rule editing remain future work.

It does **not** yet implement tree drag-and-drop/bulk tree operations, normalized duplicate matching, durable protected-tab rules, event-driven automatic rule application, automatic discard policy, import/export, the full manager/settings interface, command palette, Webspaces integration, representative Firefox runtime acceptance, Mozilla signing, or Stable release acceptance.

## Development validation

```bash
python extensions/advanced-tab-manager/scripts/validate.py
node --test extensions/advanced-tab-manager/tests/*.test.mjs
python shared/scripts/validate_repository.py
python shared/scripts/package_extension.py advanced-tab-manager
```

Packaging produces a deterministic unsigned XPI under `dist/`. An unsigned package is not a Stable release.
