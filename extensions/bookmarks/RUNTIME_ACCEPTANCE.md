# GoreeCloud Bookmarks Firefox Runtime Acceptance

This record defines the manual runtime and signed-release acceptance procedure for the canonical GoreeCloud Bookmarks Firefox extension.

## Candidate

- Extension: GoreeCloud Bookmarks
- Canonical directory: `extensions/bookmarks/`
- Candidate version: `0.1.1`
- Firefox add-on ID: `goreecloud-bookmarks@goreecloud.com`
- Source status: `authenticated-source-candidate`
- Server contract: `POST /api/v1/bookmarks/extension-capture`
- Production status: Not Stable

The source and server contract may be merged before this procedure is complete. A successful source build or GitHub Actions run does not substitute for actual Firefox execution.

## Preconditions

Before runtime acceptance:

1. Use a production-representative GoreeCloud Bookmarks server containing the integrated extension-capture endpoint.
2. Use a normal supported Firefox profile rather than only a source validator or JavaScript shell.
3. Use test accounts and test bookmarks that do not expose private family information.
4. Create a dedicated per-user revocable GoreeCloud Bookmarks access token through the approved application workflow. Do not place the token in source control, screenshots, logs, issue bodies, or this file.
5. Confirm that the test user has at least one collection the user is authorized to write to and, for authorization testing, identify a collection the user is not authorized to write to when a safe isolated test fixture is available.

## Unsigned Source-Candidate Acceptance

Record Pass, Fail, or Blocked for every check.

| Check | Expected result | Result | Evidence reference |
| --- | --- | --- | --- |
| Temporary installation | Firefox loads the candidate without manifest or startup errors. | Pending | |
| Product identity | Firefox shows GoreeCloud Bookmarks and the canonical add-on ID. | Pending | |
| Current-page metadata | Popup displays the current page title and URL before submission. | Pending | |
| Session fallback | With no stored token, an already authenticated GoreeCloud Bookmarks browser session can load authorized collections and capture when supported by the server session. | Pending | |
| Token storage | A user-provided access token can be stored without the interface redisplaying the full value. | Pending | |
| Bearer authentication | With a valid token, authorized collections load successfully. | Pending | |
| Collection identity | The popup submits an existing collection ID rather than an arbitrary collection name. | Pending | |
| Basic capture | Current page saves to the expected user library. | Pending | |
| Collection capture | Current page saves to the selected authorized collection. | Pending | |
| Tags | Submitted tags are preserved according to the server bookmark-creation behavior. | Pending | |
| Note | Submitted note is preserved according to the server bookmark-creation behavior. | Pending | |
| Duplicate handling | Saving an already-saved URL produces clear duplicate feedback without creating an unintended second record. | Pending | |
| Invalid token | An invalid token fails clearly and does not create a bookmark. | Pending | |
| Revoked token | A previously valid token fails after server-side revocation and does not create a bookmark. | Pending | |
| Token removal | Removing the token clears extension-local authentication material and returns behavior to the supported session/no-auth path. | Pending | |
| Unauthorized collection | A user cannot capture into a collection the server does not authorize for that user. | Pending | |
| Server unavailable | Network/server failure is reported clearly without claiming success. | Pending | |
| HTTP/HTTPS boundary | Normal HTTP and HTTPS page URLs are accepted; unsupported URL schemes are not sent as successful bookmark captures. | Pending | |
| Least-privilege behavior | No unrelated browsing-history collection or broad host access is observed during the acceptance flow. | Pending | |

## Multi-User Isolation Acceptance

Use at least two isolated test users when practical.

1. Authenticate the extension as test user A and confirm only collections authorized to A are offered.
2. Capture a bookmark for A and verify ownership and collection context in GoreeCloud Bookmarks.
3. Reauthenticate as test user B and confirm A-only private collections are not offered to B.
4. Confirm B cannot force capture into A-only collection context by manipulating a collection identifier.
5. Confirm intentionally shared collections behave according to their server-side membership and role rules.

The browser extension must rely on server-side authorization. A hidden or disabled client control is not sufficient evidence of an authorization boundary.

## Packaging Acceptance

Before Mozilla submission:

1. Run the canonical repository validation and deterministic packaging workflow against the exact candidate revision.
2. Inspect the generated XPI archive and confirm that maintenance-only files, credentials, local artifacts, and unrelated extension sources are absent.
3. Confirm the XPI manifest reports version `0.1.1`, add-on ID `goreecloud-bookmarks@goreecloud.com`, `activeTab` and `storage` permissions, and host access limited to `https://bookmarks.goreecloud.com/*`.
4. Record the exact candidate source commit and package SHA-256 in release evidence outside this source file when the artifact exists.

## Mozilla-Signed Acceptance

Stable promotion requires a Mozilla-signed artifact.

1. Submit the exact accepted source candidate through the approved Mozilla signing path.
2. Record the signed artifact identity and checksum without recording signing credentials.
3. Install the signed XPI persistently in normal Firefox.
4. Fully exit Firefox and start it again.
5. Confirm the extension remains installed and enabled after restart.
6. Repeat valid-token authentication, collection loading, current-page capture, duplicate handling, and token-revocation checks using the signed build.
7. Confirm the signed artifact corresponds to the recorded accepted source revision.

## Failure Handling

Any release-critical failure keeps GoreeCloud Bookmarks below Stable status. Correct the defect on an isolated branch, repeat relevant automated validation, and repeat every manual acceptance check affected by the change. Do not reuse evidence from a superseded candidate when the changed code could affect that evidence.

## Final Acceptance Record

Complete only after every required gate passes.

- Accepted source commit: Pending
- Accepted unsigned package SHA-256: Pending
- Mozilla-signed artifact identifier: Pending
- Signed artifact SHA-256: Pending
- Firefox version/platform: Pending
- Runtime acceptance date: Pending
- Post-restart acceptance date: Pending
- Final release classification: Pending

Until these fields and the applicable checks are complete, version 0.1.1 remains an authenticated source candidate and is not a Stable Firefox release.
