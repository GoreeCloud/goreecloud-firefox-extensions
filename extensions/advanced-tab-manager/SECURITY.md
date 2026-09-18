# GoreeCloud Advanced Tab Manager — Security

## Current boundary

- No host permissions, content scripts, remote code, telemetry, credential/cookie/token storage, or private-browsing access.
- Firefox remains authoritative for live browser state; non-persistent background state is reconstructed after wake.
- Runtime Firefox tab/group IDs are never durable organizational identity.
- Tab Set/stash, snooze, and rule stores are independently versioned and validated; corrupt/unsupported state fails closed.
- Persistent writes require readback verification and attempt exact previous-record rollback where the operation contract supports it.
- Restorable URL schemes are restricted to `http:`, `https:`, and `about:blank`.
- Tree cycle-producing mutations fail closed.
- Duplicate cleanup remains reviewed, fresh-state checked, guarded, and non-automatic.
- Snoozing preserves verified recovery-before-destruction semantics and reconstructs ephemeral Firefox alarms from durable local deadlines.
- Rule-engine global state defaults disabled; explicit Apply now rechecks live plans and target tabs before bounded mutation.
- Manager diagnostics remain privacy-minimized; 0.1.11 retains the explicit local portability path that mutates only extension-owned local stores after preview and confirmation.
- The manager model contains counts and health/version metadata only; it does not serialize tab titles/URLs, saved URLs, rule contents, or browsing history.
- A failed local-store read degrades manager diagnostics rather than fabricating data or mutating recovery state.
- Retained session snapshots reuse validated organizational state, exclude private/unsupported URLs, enforce 1–50 record retention, and restore additively into new windows with created-window rollback on failure.
- Snapshot diagnostic metadata excludes saved URLs and titles.
- Deterministic 100/500/1,000-tab core-scale qualification is CI-enforced and produces exact-candidate evidence, but is not representative browser-runtime acceptance.
- A dedicated real-Firefox unsigned runtime workflow uses only controlled localhost fixtures and privacy-minimized evidence; temporary installation is explicitly distinct from Mozilla-signed persistent-install/restart acceptance.
- No `unlimitedStorage` permission is requested.

## Release boundary

Stable 0.1.11 completed the exact-candidate release gates: real-Firefox runtime acceptance, repository-local Glaze UI 1.5.1 qualification, Stable Security Blockers qualification, governed Mozilla signing, signed-XPI parity/integrity, persistent signed installation, full Firefox restart acceptance, and post-restart product acceptance. The Stable promotion changes metadata/documentation only and does not alter the accepted signed runtime payload.


## Portability hardening — 0.1.9

- Backup envelopes are versioned, bound to the exact GoreeCloud Advanced Tab Manager Gecko ID, and protected by SHA-256 integrity over canonicalized payload JSON.
- Unknown envelope fields, unsupported format/schema, wrong extension identity, malformed digest, integrity mutation, and invalid imported store schemas fail closed.
- Existing organizational, snooze, and rule validators revalidate every imported record, including safe restorable URL boundaries.
- The Manager rejects selected import files larger than 16 MiB before JSON parsing and never interprets imported strings as HTML or executable code.
- Import preview carries counts/conflicts rather than imported browsing content and requires explicit confirmation before replacement.
- The import transaction requires fresh local revisions, writes all three implemented stores together, verifies readback, reconstructs snooze alarms, and attempts exact prior-record rollback if verification or alarm reconstruction fails.
- The portability background does not create, navigate, update, discard, or close live Firefox tabs.
- No new permission, host permission, content script, remote service, dynamic code evaluation, or private-browsing authority is introduced.


## Session snapshot hardening — 0.1.10

- Snapshot capture reuses the existing safe Tab Set capture boundary and persists only non-private `http:`, `https:`, and `about:blank` restoration data.
- Corrupt snapshot windows with no restorable tabs, duplicate snapshot/window IDs, invalid tree/group relations, unsafe URLs, invalid retention, or records exceeding retention fail closed during organizational-state validation.
- Legacy 0.1.9 organizational records normalize to an empty snapshot list and default retention without an implicit storage rewrite.
- Restore creates new windows only. It does not close or replace pre-existing live windows. A failed multi-window restore attempts to remove every newly created window while preserving the source snapshot.
- Retention reduction is explicit in the Manager and prunes the oldest local recovery records through the verified organizational-state transaction.
- Session snapshots are carried through the existing integrity-checked portability envelope; no parallel unvalidated import path exists.


## Stable release qualification — 0.1.11

The dedicated release qualification workflow uses full Git history, deterministic double-build comparison, candidate archive inspection, recognized secret-pattern scanning, runtime remote/dynamic-code scanning, exact permission verification, and repository-local Glaze UI 1.5.1 qualification. Security exceptions: none.

Passing these source/package gates does not replace Mozilla-signed artifact verification. The returned signed XPI must still pass identity, version, payload parity/integrity, persistent installation, full-process restart, and post-restart acceptance before Stable promotion.


## Mozilla-signed artifact gate — 0.1.11

The governed signing workflow is bound to unsigned candidate SHA-256 `9c0f44926ac1d2f213fd07f82dd18fa11bd54ceebc6cd871898fe82b962a5b02`. It rebuilds authoritative main and fails if the deterministic bytes differ.

Mozilla-returned payload acceptance requires signature metadata, exact non-manifest payload inventory and byte parity, and manifest semantic parity except for the narrowly governed no-data `data_collection_permissions` materialization used by AMO. Existing-version recovery authenticates to AMO, suppresses automatic credential-bearing redirects, and follows any HTTPS mirror redirect without the developer JWT.

The signed XPI must then install persistently, survive a full Firefox process restart on the same profile without reinstalling, preserve extension-owned recovery state, and pass release-critical post-restart runtime checks.


## Stable 0.1.11 accepted security evidence

Governed signing/restart run `35350654198` accepted source revision `34c27805c3b56f3ba858794c785f6b68d1f7b8f3`, deterministic unsigned XPI SHA-256 `9c0f44926ac1d2f213fd07f82dd18fa11bd54ceebc6cd871898fe82b962a5b02`, and Mozilla-signed XPI SHA-256 `e0f16901529cb8fa76e57d9aa056c98de9fa04e708f2232c151d5b75c1dfdb1d`.

The same governed run re-ran the Stable Security Blocker qualification and GLAZE UI 1.5.1 consumer qualification, verified signed payload parity, and completed persistent-install/full-restart product acceptance. No security exception is recorded for this release.
