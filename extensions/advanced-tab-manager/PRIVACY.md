# GoreeCloud Advanced Tab Manager — Privacy

Version `0.1.2` is local-first and has no remote service dependency.

The source candidate requests no host permissions and injects no content scripts. It does not inspect page contents, cookies, form contents, authentication data, or network requests.

The `tabs` permission permits access to privileged tab metadata such as title and URL so the extension can present and organize open tabs. `tabGroups` provides native Firefox tab-group metadata. `sessions` stores only extension-owned tab-session metadata used for durable logical/tree identity. Version `0.1.2` adds the `storage` permission because persistent Tab Sets and stash records now require extension-local persistence.

`storage.local` contains only data required by saved features the user invokes: safe restorable URLs, titles, timestamps, ordering, pin state, extension-owned local identifiers, tree relationships, and native-group presentation metadata. The extension does not store page contents, cookies, authentication tokens, passwords, form contents, private keys, or reusable credentials.

The current restorable URL boundary is intentionally conservative: `http:`, `https:`, and `about:blank`. Privileged or executable URLs such as `about:config`, `file:`, `data:`, `javascript:`, and `chrome:` are not persisted for Tab Set/stash restoration and are not closed by the stash action.

Users can delete individual Tab Sets, individual stashed items, or all Tab Set/stash persistent state from the extension UI. These actions affect extension-owned saved state only; they do not erase Firefox history or unrelated browser data.

The source candidate does not implement telemetry, advertising, analytics, remote synchronization, or Webspaces identity inference. The manifest explicitly sets `incognito: "not_allowed"`, so private tabs and windows are outside the extension's operating boundary.
