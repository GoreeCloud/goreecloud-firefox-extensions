# GoreeCloud Advanced Tab Manager — Security

## Current boundary

- No host permissions, content scripts, remote code, telemetry, credential/cookie/token storage, or private-browsing access.
- Firefox remains authoritative for live browser state; non-persistent background state is reconstructed after wake.
- Runtime Firefox tab/group IDs are never durable organizational identity.
- Tab Set/stash and snooze stores are independently versioned and validated; corrupt/unsupported state fails closed.
- Persistent writes require readback verification and attempt exact previous-record rollback.
- Restorable URL schemes are restricted to `http:`, `https:`, and `about:blank`.
- Tree cycle-producing mutations fail closed.
- Duplicate cleanup remains reviewed, fresh-state checked, guarded, and non-automatic.
- The new `alarms` permission is used only for local snooze wake scheduling; deadlines remain in verified `storage.local` because browser-session alarms are ephemeral.
- A source tab is not closed for snoozing until recovery storage and the corresponding one-shot alarm both verify.
- Alarm scheduling/verification or source-close failure clears the candidate alarm best-effort and restores prior snooze state.
- Due restore creates the replacement before consuming recovery state. Recovery consumption failure rolls the replacement back.
- Failed due restore preserves recovery state and uses a bounded retry rather than silently dropping the item.
- Startup reconstruction clears only ATM-namespaced stale snooze alarms and recreates expected alarms from validated local state.
- Rescheduling verifies the new storage deadline and replacement alarm; failure attempts both storage rollback and previous-alarm restoration.
- No `unlimitedStorage` permission is requested.

## Release boundary

This source candidate has not completed representative Firefox runtime/browser-restart acceptance, Mozilla signing, signed-XPI acceptance, security release review, or Stable qualification. Source and CI evidence must not be represented as those runtime/release gates.
