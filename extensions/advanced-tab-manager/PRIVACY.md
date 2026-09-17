# GoreeCloud Advanced Tab Manager — Privacy

Version `0.1.8` remains local-first and has no remote service dependency.

The source candidate requests no host permissions and injects no content scripts. It does not inspect page contents, cookies, form contents, authentication data, or network requests.

The `tabs` permission supplies tab metadata required for organization; `tabGroups` supplies native group metadata; `sessions` stores extension-owned logical/tree identity; `storage` stores user-invoked local recovery/organizational/rule state; `alarms` schedules local one-shot snooze wakeups. Firefox alarms are not durable storage.

`storage.local` contains only metadata required by implemented features: safe restorable URLs, titles, timestamps/deadlines, ordering, pin state, extension-owned identifiers, tree relationships, native-group presentation metadata, and user-authored rule definitions. The extension does not store page contents, cookies, authentication tokens, passwords, form contents, private keys, or reusable credentials.

The 0.1.8 manager adds no persistent dataset. Its background model is a privacy-minimized projection of existing state: counts, local-store availability/schema/revision values, source metadata, and manifest permission posture. It deliberately omits tab titles, tab URLs, saved-item URLs, snoozed URLs, rule contents, and browsing history.

Manager diagnostics remain on-device. There is no telemetry, analytics, remote diagnostics, remote synchronization, or server upload path.

The restorable URL boundary remains `http:`, `https:`, and `about:blank`. Privileged/executable URLs are not persisted for Tab Set, stash, or snooze restoration and therefore are not closed by those recovery-backed operations.

Duplicate review remains exact-URL-only and ephemeral; no persistent duplicate index is created. The manifest explicitly sets `incognito: "not_allowed"`; private tabs/windows remain outside the operating boundary.
