# Security

The Firefox extension follows least privilege. It requests `activeTab` for explicit current-page capture, `storage` for the optional revocable access token, and host access only to the canonical GoreeCloud Bookmarks application.

Reusable passwords, session secrets, signing secrets, private keys, cookies, and access tokens must never be committed to this repository. When configured, the extension token is user-provided and stored only in Firefox extension local storage. Requests prefer that explicit Bearer token; cookie-based GoreeCloud Bookmarks authentication remains a compatibility fallback for an already authenticated browser session.

The server-side capture contract uses the existing GoreeCloud Bookmarks user-verification path, so Bearer-token expiry and revocation checks remain server enforced. Collection IDs are passed through the existing link-creation authorization path rather than trusting collection names supplied by the extension.

The extension fails visibly when authentication is rejected, duplicate prevention returns a conflict, or the application returns another error. Source acceptance does not imply production approval or Mozilla-signing acceptance.
