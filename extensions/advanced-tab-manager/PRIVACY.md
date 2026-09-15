# GoreeCloud Advanced Tab Manager — Privacy

Version `0.1.0` is local-first and has no remote service dependency.

The source candidate requests no host permissions and injects no content scripts. It does not inspect page contents, cookies, form contents, authentication data, or network requests.

The `tabs` permission permits access to privileged tab metadata such as title, URL, and favicon URL so the extension can present and organize open tabs. The `tabGroups` permission provides native Firefox tab-group metadata. The `sessions` permission is used to attach an extension-owned logical identifier to supported Firefox tab-session state.

The foundation does not implement telemetry, advertising, analytics, remote synchronization, or Webspaces identity inference. The manifest explicitly sets `incognito: "not_allowed"`, so private tabs and windows are outside the extension's initial operating boundary.
