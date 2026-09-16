# GoreeCloud Advanced Tab Manager — Repository Specifications

This repository document describes the implemented source boundary for version `0.1.4`. The broader product direction is governed by the canonical Drive project specification.

## Implemented source contract

- Firefox Manifest V3 extension; add-on ID `advanced-tab-manager@goreecloud.com`; Firefox 139+ baseline.
- Non-persistent ES-module background scripts.
- Permissions only: `alarms`, `sessions`, `storage`, `tabGroups`, and `tabs`.
- `alarms` exists only for one-shot snooze wake scheduling; snooze deadlines are persisted separately because Firefox alarms do not survive browser sessions.
- No `unlimitedStorage`, host permissions, content scripts, remote telemetry, page-content inspection, or private-browsing access.
- Firefox remains authoritative for live tabs/windows/native groups; UI snapshots are reconstructed from Firefox APIs.
- Runtime Firefox tab/group IDs are not durable persistent identity.
- Existing Tab Set/stash state remains under its existing versioned key; snooze recovery uses a separate versioned `storage.local` record and fails closed on invalid/unsupported state.
- Restorable URLs remain limited to `http:`, `https:`, and `about:blank`.
- Snooze creation follows prepare → persist/readback verify → create/readback verify one-shot alarm → close source.
- Snooze scheduling or close failure attempts to clear the alarm and restore the exact prior snooze record.
- Background startup reconstructs all expected ATM snooze alarms from persisted deadlines and clears stale ATM snooze alarm names.
- Overdue persisted items receive a small startup grace before restore is attempted; failed due restoration preserves recovery state and schedules a bounded retry.
- Due restore follows create replacement → restore supported pin/group/tree metadata → verified recovery-record removal. Recovery removal failure removes the replacement as rollback.
- Snooze rescheduling writes/verifies the new deadline before replacing its alarm; alarm replacement failure restores prior storage and attempts to recreate the previous alarm.
- Initial UI supports Snooze 1 hour, Snoozed view, Open now, and +1h rescheduling. Arbitrary-date/recurring UI is not claimed.
- Existing tree, Tab Set, stash, exact-duplicate, and guarded-cleanup contracts remain in force.

## Release boundary

`0.1.4` is a source candidate. Source tests, CI, deterministic packaging, or merge do not establish representative Firefox runtime acceptance, browser-restart acceptance, Mozilla signing, signed-XPI acceptance, or Stable qualification.
