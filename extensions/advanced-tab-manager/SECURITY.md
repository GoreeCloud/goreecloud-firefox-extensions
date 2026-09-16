# GoreeCloud Advanced Tab Manager — Security

## Current boundary

- No host permissions, content scripts, remote code, telemetry, credential/cookie/token storage, or private-browsing access.
- Firefox remains authoritative for live browser state; non-persistent background state is reconstructed after wake.
- Runtime Firefox tab/group IDs are never durable organizational identity.
- Tab Set/stash, snooze, and rule stores are independently versioned and validated; corrupt/unsupported state fails closed.
- Persistent writes require readback verification and attempt exact previous-record rollback.
- Restorable URL schemes are restricted to `http:`, `https:`, and `about:blank`.
- Tree cycle-producing mutations fail closed.
- Duplicate cleanup remains reviewed, fresh-state checked, guarded, and non-automatic.
- Snoozing preserves verified recovery-before-destruction semantics and reconstructs ephemeral Firefox alarms from durable local deadlines.
- Rule-engine global state defaults disabled. Each rule also has an explicit enabled state.
- Rule definitions are bounded to one-to-eight conditions and an explicit priority range; unsupported fields/operators fail closed.
- Rule evaluation uses only normalized local Firefox tab/group metadata, excludes incognito tabs, and returns explainable per-condition results.
- Rule evaluation is preview-only in 0.1.5. `src/background/rules.js` contains no live-tab mutation call, preventing persisted rules from silently becoming automation authority.
- Rule persistence is separated from Tab Set/stash and snooze stores, avoiding implicit cross-feature schema migration.
- No `unlimitedStorage` permission is requested.

## Release boundary

This source candidate has not completed representative Firefox runtime/browser-restart acceptance, automated-rule-action acceptance, Mozilla signing, signed-XPI acceptance, security release review, or Stable qualification. Source and CI evidence must not be represented as those runtime/release gates.
