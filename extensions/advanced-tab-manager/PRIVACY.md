# GoreeCloud Advanced Tab Manager — Privacy

Version `0.1.11` remains local-first and has no remote service dependency.

The source candidate requests no host permissions and injects no content scripts. It does not inspect page contents, cookies, form contents, authentication data, or network requests.

The `tabs` permission supplies tab metadata required for organization; `tabGroups` supplies native group metadata; `sessions` stores extension-owned logical/tree identity; `storage` stores user-invoked local recovery/organizational/rule state; `alarms` schedules local one-shot snooze wakeups. Firefox alarms are not durable storage.

`storage.local` contains only metadata required by implemented features: safe restorable URLs, titles, timestamps/deadlines, ordering, pin state, extension-owned identifiers, tree relationships, native-group presentation metadata, user-authored rule definitions, and retained session snapshots. The extension does not store page contents, cookies, authentication tokens, passwords, form contents, private keys, or reusable credentials.

The Manager diagnostic model is privacy-minimized. It exposes counts, store availability/schema/revision values, source metadata, permission posture, snapshot IDs/timestamps, and snapshot window/tab counts. It deliberately omits live tab titles/URLs, saved-item URLs, snoozed URLs, rule contents, snapshot URLs/titles, and browsing history.

Manager diagnostics remain on-device. There is no telemetry, analytics, remote diagnostics, remote synchronization, or server upload path.

The restorable URL boundary remains `http:`, `https:`, and `about:blank`. Privileged/executable URLs are not persisted for Tab Set, stash, snooze, or session-snapshot reconstruction. Duplicate review remains exact-URL-only and ephemeral; no persistent duplicate index is created. The manifest explicitly sets `incognito: "not_allowed"`; private tabs/windows remain outside the operating boundary.

## Local backup portability

Backup export is an explicit user action and remains local to the browser/download flow. Exported JSON can contain saved restorable URLs, titles, timestamps, organization metadata, retained session snapshots, snooze deadlines, and user-authored rule definitions because those values are necessary to reconstruct implemented extension-owned state. The UI identifies the backup as private data that the user should protect.

Import preview does not expose backup URLs or titles to the Manager view. It reports only source version/time, integrity status, store counts, snapshot counts, ID-conflict counts, and the current revisions required for a fresh apply. The import backend does not upload the file, contact a remote service, or open imported URLs.

The selected-file size is capped at 16 MiB before JSON parsing. Backup identity, schema, integrity, and every imported store are validated before replacement. Private-window data remains outside the backup because private browsing is not allowed by the manifest.

## Retained session snapshots — 0.1.10

Snapshot capture is explicit and reads a fresh Firefox snapshot. Private windows and unsupported/privileged URLs are excluded before persistence. The default local retention is 10 snapshots and the supported range is 1 through 50.

Snapshot restore opens saved state into new windows without replacing or closing the user's existing live windows. A failed restore attempts to remove only windows created by that restore. Snapshot deletion and retention reduction are explicit destructive actions in the Manager.

The deterministic 100/500/1,000-tab qualification harness uses generated synthetic URLs and titles only. Its JSON report contains timing and tab-count measurements, not user browsing data.


## Release-candidate privacy continuity — 0.1.11

0.1.11 changes lifecycle-neutral presentation text, version identity, and an explicit Forced Colors popup border fallback only. It adds no host permission, content script, telemetry, remote synchronization, page-content inspection, or private-browsing access.

Release qualification evidence is privacy-minimized: the Glaze and security records contain source/version/digest/control outcomes and do not contain browsing URLs, titles, rules, cookies, credentials, page content, or profile paths.
