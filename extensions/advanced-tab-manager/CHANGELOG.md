# Changelog

## 0.1.12 — Development

- Started a new Development/source-candidate line from accepted Stable 0.1.11; Stable 0.1.11 remains the signed rollback/production baseline.
- Redesigned the toolbar popup as a compact command surface with glanceable live metrics and clearer primary/secondary action hierarchy.
- Redesigned sidebar chrome, search/view controls, state summary, active-tab treatment, responsive density, and interaction semantics.
- Reorganized the full Manager into overview, recovery, portability, and secondary technical-status regions with more deliberate information hierarchy.
- Removed stale hard-coded `In Development · source-candidate` fields from the runtime Manager model so canonical release records remain authoritative for mutable lifecycle truth.
- Corrected the Manager so retained session-snapshot count is rendered from the existing privacy-minimized model.
- Kept current Stable Glaze UI V1.5 / 1.5.1 as the consumer target and preserved Reduced Transparency, Forced Colors, focus, responsive, and semantic system-color fallbacks.
- Refactored candidate security/Glaze/release-qualification tooling to bind to the exact current manifest version while preserving historical Stable 0.1.11 release/signing evidence.
- Added no Firefox permission, host permission, content script, telemetry path, remote dependency, private-browsing access, storage schema, or new browser mutation authority.
- Removed the unsupported Manifest V3 `background.persistent` key after Firefox 156 surfaced it as a temporary-load warning; non-persistent event-page behavior remains the intended MV3 model.
- Corrected deterministic large-session evidence generation so `sourceVersion` is read from the exact candidate manifest instead of retaining the historical 0.1.11 label.
- Refined the sidebar toolbar after representative Firefox rendering showed the injected command trigger forcing Refresh onto a second row; the command trigger is now a compact `⌘K` control in the shared toolbar system, and row actions remain quieter than primary content without becoming nearly invisible.
- No new product icon or other image asset is introduced in this candidate.


## 0.1.11 — Stable

- Preserved the accepted 0.1.10 functional feature slice with no permission or browser-authority expansion.
- Advanced the manifest and canonical inventory source version to 0.1.11; after governed signed acceptance, canonical lifecycle metadata was promoted to `source_state: stable` and `accepted_stable_version: 0.1.11` without changing packaged runtime bytes.
- Removed packaged `source candidate` / `Development source only` lifecycle wording from popup and Manager surfaces so signed runtime bytes remain lifecycle-neutral.
- Added an explicit popup Forced Colors border fallback.
- Added repository-local GLAZE UI 1.5.1 consumer qualification bound to the current Stable shared authority while explicitly not inheriting shared performance/posture claims.
- Added fail-closed Stable Security Blocker qualification covering exact permissions, runtime remote/dynamic-code checks, candidate package inspection, deterministic package reproducibility, and full relevant Git-history secret scanning.
- Added a dedicated exact-candidate release qualification workflow retaining the unsigned candidate, SHA-256 digest, Glaze evidence, security evidence, and large-session evidence.
- Updated the real-Firefox runtime gate and deterministic qualification generators to bind to 0.1.11.
- Added source-only governed Mozilla signing infrastructure bound to accepted unsigned SHA-256 `9c0f44926ac1d2f213fd07f82dd18fa11bd54ceebc6cd871898fe82b962a5b02`, including authenticated existing-version recovery, governed signed-manifest parity, persistent signed installation, full same-profile Firefox restart, and post-restart product acceptance. This infrastructure does not change packaged runtime bytes.
- Governed signing/restart run `35350654198` accepted source revision `34c27805c3b56f3ba858794c785f6b68d1f7b8f3`, unsigned SHA-256 `9c0f44926ac1d2f213fd07f82dd18fa11bd54ceebc6cd871898fe82b962a5b02`, signed SHA-256 `e0f16901529cb8fa76e57d9aa056c98de9fa04e708f2232c151d5b75c1dfdb1d`, governed payload parity, Stable Security Blockers, GLAZE UI 1.5.1 consumer acceptance, persistent signed installation, full Firefox restart, and post-restart release-critical acceptance.

## 0.1.10 — Source candidate

- Added ATM-008E retained local session snapshots for supported non-private Firefox windows.
- Added configurable local snapshot retention from 1 through 50 records, defaulting to 10, with explicit oldest-record pruning when retention is reduced.
- Reused existing safe restorable-URL, native-group, tree, pin, order, and active-tab capture semantics rather than creating a competing session model.
- Added additive snapshot restore into new Firefox windows; existing live windows remain open, and failed multi-window restore attempts rollback of every window created by that restore.
- Added explicit Manager capture, restore, delete, and retention controls with destructive confirmations where state can be pruned or deleted.
- Kept Manager snapshot diagnostics privacy-minimized to ID, capture time, window count, and tab count; saved URLs/titles are not projected into the diagnostic model.
- Extended the existing organizational backup path so session snapshots are covered by backup integrity, schema validation, import preview, stale-revision rejection, readback verification, and rollback.
- Added legacy organizational-state normalization so pre-0.1.10 records load with empty snapshots/default retention without silent rewriting.
- Added deterministic 100/500/1,000-tab core-scale qualification and CI retention of the scale report, unsigned XPI, and SHA-256 package checksum.
- Added no Firefox permission; the boundary remains `alarms`, `sessions`, `storage`, `tabGroups`, and `tabs`, with no host permissions/content scripts and private browsing disabled.
- Added source-only release acceptance infrastructure: a dedicated clean-profile real-Firefox runtime smoke workflow covering Manager/live-state/tree/Tab Set/stash/snooze/duplicate/rule-default/session-snapshot/backup-preview paths against controlled local fixtures, with privacy-minimized retained evidence. This does not change packaged 0.1.10 runtime bytes.
- Representative Firefox runtime/accessibility/rendered-scale acceptance, actual browser-restart acceptance, current-Stable Glaze UI 1.5.1 product acceptance, security/privacy release qualification, Mozilla signing, signed-XPI acceptance, production release evidence, and Stable qualification remain pending.

## 0.1.9 — Source candidate

- Added ATM-008D source-preserving local backup portability for the implemented organizational, snooze, and rule stores.
- Added a versioned JSON backup envelope bound to the Advanced Tab Manager Gecko ID, source version, export timestamp, and SHA-256 integrity digest over canonicalized payload JSON.
- Added strict envelope, identity, integrity, organizational-state, snooze-state, and rule-state validation before import replacement.
- Added a privacy-minimized import preview containing counts, ID-conflict counts, source metadata, integrity status, and expected current revisions rather than browsing URLs or titles.
- Added explicit Manager backup export, JSON file selection with a 16 MiB safety cap, preview, confirmation, apply, and clear-preview controls.
- Added fresh-revision rejection when local extension-owned state changes after preview.
- Added cross-store replacement with local revision advancement, readback verification, snooze-alarm reconstruction, and exact pre-import state rollback when verification/reconstruction fails.
- Kept import separate from live restoration: applying a backup does not open, navigate, update, discard, or close Firefox tabs.
- Added deterministic portability-core and background transaction tests.
- Added no new manifest permission; the permission boundary remains exactly `alarms`, `sessions`, `storage`, `tabGroups`, and `tabs`, with no host permissions/content scripts and private browsing disabled.
- Broader manager/settings workflows, session snapshots, large-session qualification, representative Firefox portability/accessibility acceptance, current Glaze acceptance, security/privacy release qualification, Mozilla signing, signed-XPI acceptance, production release evidence, and Stable qualification remain pending.

## 0.1.8 — Source candidate

- Added ATM-008C, a privacy-minimized full-window Manager/diagnostics foundation.
- Added a pure manager model that aggregates only source/lifecycle metadata, live/saved counts, store availability/schema/revision metadata, and manifest permission posture.
- Deliberately excluded tab titles, tab URLs, saved-item URLs, snoozed URLs, rule contents, and browsing-history records from the manager model.
- Added a read-only background manager route that composes established dashboard, snooze, and rule-state reads and degrades individual unavailable stores without fabricating data.
- Added a responsive Manager surface with Source, Live browser, Saved organization, Store health, Permission boundary, and current-boundary diagnostics.
- Added Manager entry points from the sidebar, toolbar popup, and command palette while preserving the command palette's no-direct-browser-API boundary.
- Added Reduced Transparency, Forced Colors, keyboard focus, and responsive layout fallbacks for the new full-window surface.
- Updated the command catalog to ten bounded commands with an explicit Open Manager command.
- Corrected stale popup version text and stale privacy/security documentation from earlier source-candidate milestones.
- Added focused manager-model/background tests and expanded the source validator to enforce the 0.1.8 read-only privacy boundary.
- Added no new manifest permission; permissions remain exactly `alarms`, `sessions`, `storage`, `tabGroups`, and `tabs`, with no host permissions or content scripts and private browsing disabled.
- Full manager mutation/settings workflows, import/export, session snapshots, large-session qualification, representative Firefox manager runtime/accessibility acceptance, Mozilla signing, signed-XPI acceptance, production release, and Stable qualification remain outside this milestone.

## 0.1.7 — Source candidate

- Added a keyboard-first sidebar command palette with a visible top-bar trigger and `Ctrl/⌘+K` shortcut.
- Added a pure browser-API-independent command catalog with nine bounded commands and deterministic local query ranking.
- Added case-insensitive AND-token matching, stable authored tie ordering, and exact fail-closed command lookup.
- Added bounded commands for Tree, Native groups, Duplicates, Saved items, Snoozed, and Rules navigation plus local search focus, state refresh, and focused-window Tab Set capture.
- Routed command execution through existing sidebar controls rather than adding direct Firefox API authority to the palette.
- Added Arrow Up/Down, Enter, Escape, pointer selection, dialog/listbox semantics, focus restoration, and a no-match state.
- Added Reduced Transparency and Forced Colors fallbacks for the command overlay.
- Added focused command-catalog/search tests and expanded the source validator to require the 0.1.7 command boundary.
- Corrected repository architecture/source-state documentation to reflect the already-implemented 0.1.6 ATM-008A rule-action layer.
- Added no new manifest permission; the existing `alarms`, `sessions`, `storage`, `tabGroups`, and `tabs` boundary remains unchanged.
- Full manager/settings UI, import/export, richer command actions, representative Firefox command-palette runtime/accessibility acceptance, signing, and Stable qualification remain outside this source-candidate milestone.

## 0.1.6 — Source candidate

- Added a bounded rule-action vocabulary: `pin`, `unpin`, `mute`, `unmute`, and `discard`.
- Kept rule-state schema version 1 compatible with existing 0.1.5 rules; rules without an `actions` field remain valid and preview-only until explicitly updated.
- Added validation that rejects unsupported, duplicate, and contradictory rule actions.
- Added deterministic action planning in which the highest matching priority controls each tab and differing equal-priority action plans fail closed as explicit conflicts.
- Expanded rule preview to report actionable targets and conflicts without browser mutation.
- Added explicit **Apply now** execution only after two independently reconstructed live Firefox snapshots produce the same conflict-free plan.
- Added a final live tab read before each target mutation and fail-closed handling for missing/private/window-moved targets.
- Added only bounded pin/mute updates and tab discard as rule mutations; no rule path closes, navigates, or creates tabs.
- Added a Rules sidebar view with engine enable/disable, bounded hostname-rule creation, per-rule enable/disable/delete, preview, conflict visibility, and explicit Apply now confirmation.
- Added focused tests for action validation, deterministic planning, equal-priority conflicts, two-snapshot drift rejection, explicit mutation, and legacy rule-state compatibility.
- Expanded source validation to enforce the 0.1.6 mutation boundary and unchanged permission/privacy posture.
- Added no new manifest permission; the existing `alarms`, `sessions`, `storage`, `tabGroups`, and `tabs` boundary remains unchanged.
- Event-driven automatic rule application, richer rule editing, representative Firefox runtime acceptance, signing, and Stable qualification remain outside this source-candidate milestone.

## 0.1.5 — Source candidate

- Added a separately versioned local rule-state record with strict validation, revisioning, readback verification, and exact previous-record rollback on failed persistence.
- Added global rule-engine enable/disable state defaulting disabled plus per-rule enabled state.
- Added bounded rule definitions with stable IDs, names, explicit integer priority, timestamps, and one-to-eight conditions.
- Added deterministic local metadata matching for hostname, title, URL, native-group title, pinned, audible, muted, discarded, and tree-child state.
- Added explainable per-condition expected/observed/matched results and deterministic higher-priority-first evaluation with stable rule-ID tie ordering.
- Added fresh-snapshot rule preview routing plus create/update/delete/read operations.
- Kept 0.1.5 preview-only: no automatic browser mutation, rule-action executor, rule-management UI, command palette, or full manager is claimed.
- Added no new manifest permission; the existing `alarms`, `sessions`, `storage`, `tabGroups`, and `tabs` boundary remains unchanged.
- Added deterministic rule-state, evaluator, and background-manager tests.

## 0.1.4 — Source candidate

- Added restart-safe one-shot tab snoozing backed by a separately versioned local recovery store.
- Added `alarms` as the only new permission for local wake scheduling; no host/content/private-browsing expansion.
- Added source-preserving snooze transaction: persist/verify recovery → create/verify alarm → close source.
- Added startup alarm reconstruction from persisted deadlines because Firefox alarms do not survive browser sessions.
- Added overdue startup grace and bounded retry after failed due restoration.
- Added due restore that creates a replacement before consuming recovery state and restores supported pin, native-group, and live tree-parent metadata.
- Added verified +1h deadline rescheduling with storage/alarm rollback behavior.
- Added Snooze 1 hour row action, Snoozed view, Open now, +1h delay, and popup/sidebar snoozed counts.
- Added deterministic snooze-store, alarm/deadline, transaction, and background-manager tests.
- Recurring snoozes, notifications, and richer arbitrary-date scheduling UI remain outside 0.1.4.

## 0.1.3 — Source candidate

- Added exact-URL duplicate review as a dedicated sidebar view.
- Added explicit user-selected keeper controls and confirmation before destructive duplicate cleanup.
- Added conservative cleanup exclusions for active, pinned, audible, hidden/private, tree-child, tree-parent, and explicitly excluded tabs.
- Added fresh-state background verification immediately before cleanup so stale duplicate sets or keeper selections fail closed.
- Added guarded batch tab closure using existing `tabs` authority with no new manifest permission.
- Kept normalized URL matching and durable protected-tab policy out of the 0.1.3 boundary for a later explicit policy milestone.
- Expanded deterministic tests with duplicate grouping, guard-reason, keeper-selection, cleanup-plan, stale-review, and background cleanup coverage.

## 0.1.2 — Source candidate

- Added versioned persistent Tab Set and stash state in Firefox `storage.local`.
- Added verified complete-record storage mutation with schema validation, revisioning, readback verification, and rollback.
- Added Save Focused Window as Tab Set, reusable restoration, transactional stashing/restoration, safe URL filtering, and saved-state UI.
- Added `storage` as the only new manifest permission; no host permissions, content scripts, or `unlimitedStorage` permission were added.

## 0.1.1 — Source candidate

- Added durable logical-ID tree relationships, reconciliation/cycle prevention, transactional session metadata persistence, and tree/native-group sidebar modes.

## 0.1.0 — Source candidate

- Established canonical identity, live Firefox reconciliation, logical IDs, initial sidebar/popup, tests, inventory, CI, and deterministic packaging.

No Stable release is declared.
