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
- Manager diagnostics remain privacy-minimized; 0.1.9 adds an explicit local portability path that mutates only extension-owned local stores after preview and confirmation.
- The manager model contains counts and health/version metadata only; it does not serialize tab titles/URLs, saved URLs, rule contents, or browsing history.
- A failed local-store read degrades manager diagnostics rather than fabricating data or mutating recovery state.
- No `unlimitedStorage` permission is requested.

## Release boundary

This source candidate has not completed representative Firefox runtime/browser-restart acceptance, manager accessibility/runtime acceptance, Mozilla signing, signed-XPI acceptance, security release review, production deployment, or Stable qualification. Source and CI evidence must not be represented as those runtime/release gates.


## Portability hardening — 0.1.9

- Backup envelopes are versioned, bound to the exact GoreeCloud Advanced Tab Manager Gecko ID, and protected by SHA-256 integrity over canonicalized payload JSON.
- Unknown envelope fields, unsupported format/schema, wrong extension identity, malformed digest, integrity mutation, and invalid imported store schemas fail closed.
- Existing organizational, snooze, and rule validators revalidate every imported record, including safe restorable URL boundaries.
- The Manager rejects selected import files larger than 16 MiB before JSON parsing and never interprets imported strings as HTML or executable code.
- Import preview carries counts/conflicts rather than imported browsing content and requires explicit confirmation before replacement.
- The import transaction requires fresh local revisions, writes all three implemented stores together, verifies readback, reconstructs snooze alarms, and attempts exact prior-record rollback if verification or alarm reconstruction fails.
- The portability background does not create, navigate, update, discard, or close live Firefox tabs.
- No new permission, host permission, content script, remote service, dynamic code evaluation, or private-browsing authority is introduced.
