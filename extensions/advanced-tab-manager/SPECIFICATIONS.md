# GoreeCloud Advanced Tab Manager — Repository Specifications

This repository document describes the implemented source boundary for version `0.1.6`. The broader product direction is governed by the canonical Drive project specification.

## Implemented source contract

- Firefox Manifest V3 extension; add-on ID `advanced-tab-manager@goreecloud.com`; Firefox 139+ baseline.
- Non-persistent ES-module background scripts.
- Permissions only: `alarms`, `sessions`, `storage`, `tabGroups`, and `tabs`.
- No `unlimitedStorage`, host permissions, content scripts, remote telemetry, page-content inspection, or private-browsing access.
- Firefox remains authoritative for live tabs/windows/native groups; UI/rule snapshots are reconstructed from Firefox APIs.
- Runtime Firefox tab/group IDs are not durable persistent identity.
- Existing Tab Set/stash state, snooze recovery state, and rule definitions remain in separate versioned `storage.local` records so one feature does not silently reinterpret another feature's schema.
- Restorable URLs remain limited to `http:`, `https:`, and `about:blank`.
- Existing tree, Tab Set, stash, exact-duplicate, guarded-cleanup, and restart-safe snooze contracts remain in force.

### 0.1.5 rule-engine foundation retained

- Rule state uses `goreecloud.advancedTabManager.ruleState.v1`, schema version 1, monotonic revision, a global enabled flag, and a bounded rule collection.
- The global rule engine defaults to disabled. Each rule also has an explicit enabled state.
- Rule state persistence uses read previous → mutate copy → validate → write → readback verify → exact previous-record rollback on failure.
- Rules contain a stable ID, name, integer priority from -1000 through 1000, creation/update timestamps, and one to eight conditions.
- Initial conditions remain local browser metadata only: `hostname`, `title`, `url`, `nativeGroupTitle`, `pinned`, `audible`, `muted`, `discarded`, and `treeChild`.
- Text operators are `equals`, `contains`, `starts-with`, and `ends-with`; comparisons are case-insensitive. Boolean fields support explicit `is` matching.
- Conditions use deterministic AND semantics. Enabled rules evaluate highest numeric priority first; equal priorities use stable rule-ID ordering.
- Evaluation uses a fresh live Firefox snapshot, excludes incognito tabs, and returns per-condition expected/observed/matched explanation data.
- Runtime message routes support reading rule state, global enable/disable, create/update, delete, preview evaluation, and explicit user-triggered action application.

### 0.1.6 ATM-008A rule-action boundary

- Existing schema-version-1 rule records remain valid when they do not contain an `actions` field; those rules remain preview-only until explicitly updated with actions.
- A rule may contain zero to three actions selected only from `pin`, `unpin`, `mute`, `unmute`, and `discard`.
- Contradictory `pin`/`unpin` or `mute`/`unmute` combinations fail validation. Duplicate or unsupported actions fail closed.
- The action planner applies only the highest matching priority for a tab. Equal-priority matching rules may share an identical action list, but differing equal-priority action lists create an explicit conflict and block mutation for that tab.
- Preview returns the deterministic action plan and conflicts without mutating Firefox.
- **Apply now** is an explicit user operation. It is not event-driven automatic organization.
- Apply reads a fresh snapshot, computes a plan, reads Firefox state again, recomputes the plan, and rejects the operation if the plan changed or conflicts appeared.
- Immediately before mutation, each target tab is re-read from Firefox and rejected if it is unavailable, private, or has moved to a different window.
- Rule action execution may only call the existing tab pin/mute update authority or Firefox tab discard. It does not close tabs, navigate tabs, create tabs, read page content, or expand manifest permissions.
- Browser mutation is not represented as transactionally reversible. If Firefox applies earlier actions and a later mutation fails, the result reports the already-applied actions instead of claiming rollback.
- The sidebar now includes a Rules view with engine enable/disable, rule listing, per-rule enable/disable and delete, a bounded hostname-rule creation form, preview, conflict counts, and explicit Apply now confirmation.

## Release boundary

`0.1.6` is a source candidate. Source tests, CI, deterministic packaging, or merge do not establish representative Firefox runtime acceptance, browser-restart acceptance, event-driven automatic-rule acceptance, Mozilla signing, signed-XPI acceptance, production release, or Stable qualification.
