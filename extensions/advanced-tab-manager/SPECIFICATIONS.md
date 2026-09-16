# GoreeCloud Advanced Tab Manager — Repository Specifications

This repository document describes the implemented source boundary for version `0.1.5`. The broader product direction is governed by the canonical Drive project specification.

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

### 0.1.5 rule-engine foundation

- Rule state uses `goreecloud.advancedTabManager.ruleState.v1`, schema version 1, monotonic revision, a global enabled flag, and a bounded rule collection.
- The global rule engine defaults to disabled. Each rule also has an explicit enabled state.
- Rule state persistence uses read previous → mutate copy → validate → write → readback verify → exact previous-record rollback on failure.
- Rules contain a stable ID, name, integer priority from -1000 through 1000, creation/update timestamps, and one to eight conditions.
- Initial conditions are local browser metadata only: `hostname`, `title`, `url`, `nativeGroupTitle`, `pinned`, `audible`, `muted`, `discarded`, and `treeChild`.
- Text operators are `equals`, `contains`, `starts-with`, and `ends-with`; comparisons are case-insensitive. Boolean fields support explicit `is` matching.
- Conditions use deterministic AND semantics. Enabled rules evaluate highest numeric priority first; equal priorities use stable rule-ID ordering.
- Evaluation uses a fresh live Firefox snapshot, excludes incognito tabs, and returns per-condition expected/observed/matched explanation data.
- Runtime message routes support reading rule state, global enable/disable, create/update, delete, and preview evaluation.
- 0.1.5 performs **preview-only evaluation**. The rule manager does not call live-tab mutation APIs and does not claim automatic organization behavior.

## Release boundary

`0.1.5` is a source candidate. Source tests, CI, deterministic packaging, or merge do not establish representative Firefox runtime acceptance, browser-restart acceptance, automated-rule-action acceptance, Mozilla signing, signed-XPI acceptance, or Stable qualification.
