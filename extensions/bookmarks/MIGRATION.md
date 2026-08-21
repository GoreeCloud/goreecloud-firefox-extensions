# Migration Record

Legacy repository: `GoreeCloud/goreecloud-bookmark-browser-extension`

Inspected legacy baseline: main tree `3175f85191bab62d84873c46e54b32ab958f9be8`.

The legacy project is a Linkwarden-derived cross-browser extension. Its Firefox manifest identifies Linkwarden 1.5.4, uses upstream add-on ID `jordanlinkwarden@gmail.com`, requests `storage`, `scripting`, `activeTab`, `tabs`, `bookmarks`, and `contextMenus`, and grants `<all_urls>` host access. The repository also contains a Safari manifest and Xcode project material.

The canonical Firefox repository does not import Safari/Xcode release artifacts. Instead, GoreeCloud begins a Firefox-specific first-party replacement with a narrower permission model and GoreeCloud-controlled add-on identity. The legacy project remains provenance and behavioral reference until equivalent required workflows are validated here.

No Stable release is claimed by this migration. Mozilla signing, persistent installation, runtime capture validation, server endpoint acceptance, and restart verification remain separate gates.
