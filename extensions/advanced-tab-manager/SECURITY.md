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
- The 0.1.8 manager route is read-only and calls only established read interfaces.
- The manager model contains counts and health/version metadata only; it does not serialize tab titles/URLs, saved URLs, rule contents, or browsing history.
- A failed local-store read degrades manager diagnostics rather than fabricating data or mutating recovery state.
- No `unlimitedStorage` permission is requested.

## Release boundary

This source candidate has not completed representative Firefox runtime/browser-restart acceptance, manager accessibility/runtime acceptance, Mozilla signing, signed-XPI acceptance, security release review, production deployment, or Stable qualification. Source and CI evidence must not be represented as those runtime/release gates.
