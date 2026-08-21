# Release Gates

The Bookmarks Firefox extension must not be promoted to Stable until all of the following are complete:

1. Source validation and JavaScript syntax checks pass on the exact candidate head.
2. The GoreeCloud Bookmarks server exposes and validates the documented extension-capture endpoint.
3. Firefox runtime acceptance confirms current-page capture, collection, tags, notes, authentication failure, and duplicate handling behavior.
4. The extension package is submitted through Mozilla's approved signing path.
5. The Mozilla-signed XPI installs persistently in normal Firefox.
6. Firefox is fully restarted and the extension remains installed and enabled.
7. Post-restart capture behavior is revalidated.
8. The exact signed artifact and source revision are recorded without committing signing credentials.
