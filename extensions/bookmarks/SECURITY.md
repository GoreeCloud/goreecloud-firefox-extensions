# Security

The Firefox extension follows least privilege. It requests the active-tab capability needed for explicit page capture and host access only to the canonical GoreeCloud Bookmarks application.

Reusable credentials, session secrets, signing secrets, private keys, cookies, and tokens must never be committed to this repository. Authentication is delegated to the existing authenticated browser session.

The extension fails visibly when authentication is rejected or the application returns an error. Source acceptance does not imply production approval or Mozilla-signing acceptance.
