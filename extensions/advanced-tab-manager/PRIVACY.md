# GoreeCloud Advanced Tab Manager — Privacy

Version `0.1.5` remains local-first and has no remote service dependency.

The source candidate requests no host permissions and injects no content scripts. It does not inspect page contents, cookies, form contents, authentication data, or network requests.

The `tabs` permission supplies tab metadata required for organization; `tabGroups` supplies native group metadata; `sessions` stores extension-owned logical/tree identity; `storage` stores user-invoked local recovery/organizational/rule state; `alarms` schedules local one-shot snooze wakeups. Firefox alarms are not treated as durable storage.

`storage.local` contains only metadata required by implemented features: safe restorable URLs, titles, timestamps/deadlines, ordering, pin state, extension-owned identifiers, tree relationships, native-group presentation metadata, and user-authored rule definitions. The extension does not store page contents, cookies, authentication tokens, passwords, form contents, private keys, or reusable credentials.

Rule state uses its own versioned key and remains on-device. The 0.1.5 evaluator reads only locally available tab metadata—hostname, title, URL, native-group title, pinned/audible/muted/discarded flags, and tree-child state. It does not inspect webpage content. Private/incognito tabs are excluded. Rule evaluation is preview-only and produces no automatic browser mutation.

Snooze records use a separate versioned key. Deadlines stay on-device; no notification, cloud service, telemetry service, analytics service, or remote scheduling system receives them. The extension rebuilds browser-session alarms locally after restart.

The restorable URL boundary remains `http:`, `https:`, and `about:blank`. Privileged/executable URLs are not persisted for Tab Set, stash, or snooze restoration and therefore are not closed by those recovery-backed operations.

Duplicate review remains exact-URL-only and ephemeral; no persistent duplicate index is created.

The manifest explicitly sets `incognito: "not_allowed"`. Private tabs/windows are outside the intended operating boundary.
