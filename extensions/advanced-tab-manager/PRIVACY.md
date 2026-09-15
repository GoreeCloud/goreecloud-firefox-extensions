# GoreeCloud Advanced Tab Manager — Privacy

Version `0.1.1` is local-first and has no remote service dependency.

The source candidate requests no host permissions and injects no content scripts. It does not inspect page contents, cookies, form contents, authentication data, or network requests.

The `tabs` permission permits access to privileged tab metadata such as title, URL, and favicon URL so the extension can present and organize open tabs. The `tabGroups` permission provides native Firefox tab-group metadata. The `sessions` permission is used only for extension-owned tab-session metadata needed by the current source: a random logical tab identifier and, when the user or Firefox opener relationship establishes a tree, the parent tab's logical identifier.

Tree metadata contains no page contents, credentials, cookies, account tokens, browsing-body data, or remote identity information. It remains associated with Firefox's own session restoration mechanism and is not uploaded by the extension.

The source candidate does not implement telemetry, advertising, analytics, remote synchronization, or Webspaces identity inference. The manifest explicitly sets `incognito: "not_allowed"`, so private tabs and windows are outside the extension's operating boundary.
