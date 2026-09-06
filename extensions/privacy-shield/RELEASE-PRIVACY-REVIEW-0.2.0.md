# Privacy Shield 0.2.0 Release Privacy Review

**Status:** Source-level release privacy review passed; release promotion remains gated.

**Reviewed candidate:** GoreeCloud Privacy Shield Firefox adapter 0.2.0

**Stable baseline:** 0.1.1 remains Stable until every 0.2.0 release gate is satisfied.

## Scope

This review covers the 0.2.0 popup quick controls and privacy-safe support diagnostics already integrated on canonical `main`, including:

- Copy clean URL;
- Standard, Strict, and Compatible per-site modes;
- Reset site;
- Protection details and Refresh;
- local On/Off plus site-mode presentation;
- Copy support snapshot;
- current-tab counter persistence across Manifest V3 event-page recreation;
- interaction with the existing redacted, memory-only Activity Logger.

The review is intentionally limited to privacy/data-handling semantics. It does not substitute for manual usability review, representative-site compatibility review, Mozilla signing, persistent signed installation, restart acceptance, or Stable promotion.

## Evidence reviewed

The review inspected the current canonical implementations and regression boundaries in:

- `src/popup.js`;
- `src/support-snapshot.js`;
- `src/logger-privacy.js`;
- `src/background.js`;
- `src/site-profiles.js`;
- `PRIVACY.md`;
- `RELEASE.md`;
- `scripts/test_support_snapshot.js`;
- `scripts/test_logger_privacy.js`;
- `scripts/test_background_activity.js`;
- `tests/popup_quick_controls_smoke.py`.

The last product-payload change before this review was canonical main revision `dc7517d412997250c8a609a49464e1af2df59b6a`. The later popup-acceptance merge `41c4f615664d21e7ecaa162c6f8ff6a7ec31df4c` changed only the Firefox runtime workflow, Python source validation, and Python runtime acceptance test. The canonical packager excludes Markdown, Python, `scripts/`, and other non-runtime material, so those acceptance-only changes do not alter the packaged extension payload.

## Findings

### 1. Copy clean URL

**Pass.** The popup reads only the active HTTP/HTTPS tab URL, sends it to the existing local Privacy Shield URL cleaner, and writes the result to the local clipboard after explicit user action. No remote cleaner, shortening service, analytics service, or telemetry endpoint is involved.

### 2. Site protection modes

**Pass.** Standard, Strict, Compatible, and Reset reuse the existing local `siteOverrides` settings boundary. A mode selection is stored only for the deliberate hostname and does not create visit timestamps, a browsing timeline, remote profiles, or request telemetry. Profile changes preserve the independent per-site enabled/disabled state.

Strict adds third-party script/frame blocking without silently enabling reviewed annoyance hiding or media blocking. Compatible keeps core tracker, malicious-domain, miner, URL-cleaning, ping/beacon, ETag, popup, and ad-request protections while reducing page-altering cosmetic/local-resource behavior.

### 3. Protection details and Refresh

**Pass.** Protection details uses the already-redacted `logger:get` representation rather than `logger:reveal`. It filters to the active tab and presents friendly aggregate labels/counts. The renderer does not consume request URLs, final URLs, selectors, DOM text, page content, credentials, or identifiers.

Logger entries remain bounded background memory only. Refresh re-reads current-tab counters and the current in-memory public logger view; it does not create persistent history or remote traffic. The real-Firefox popup acceptance deliberately creates current-session activity instead of treating previous logger rows as durable evidence.

### 4. Current-tab counters

**Pass.** Blocked/Cleaned/Hidden/Local counters are mirrored only to Firefox `browser.storage.session` so they survive Manifest V3 event-page recreation. They reset when a new navigation begins and are removed when the tab closes. This is browser-session observability, not a retained browsing-history store.

### 5. Copy support snapshot

**Pass for source-level privacy semantics.** The formatter receives a bounded derived input assembled by the popup: extension/browser version, hostname, enabled state, site mode, current-tab counters, and friendly aggregate reason labels/counts. Unknown caller fields are ignored. Regression tests deliberately inject raw URLs, query/session values, logger identifiers, and DOM content and require those values to be absent from output.

The snapshot does not accept raw request/final URLs, query strings, page content, selectors, credentials, cookies, or logger identifiers. It is produced only after explicit user action, copied only to the local clipboard, and is not retained, uploaded, transmitted, or added to the Activity Logger.

The current site hostname is intentionally included because the diagnostic is site-scoped. Users should therefore treat the copied snapshot as shareable diagnostic text that identifies the current hostname even though it excludes raw paths, queries, and activity payloads.

### 6. Reason-label provenance

**Pass.** Network protection reason codes are generated internally by the Privacy Shield request decision path. Page-filter reasons are explicitly restricted by `PAGE_FILTER_REASONS` before logging. The popup maps these internal reason codes to friendly labels and aggregate counts before support-snapshot formatting; arbitrary page content, selectors, URLs, or caller-provided request data are not used as reason labels in the product path.

### 7. Remote-data and permission boundary

**Pass.** The 0.2.0 quick-control/support-diagnostic feature set introduces no new Firefox permission and no GoreeCloud telemetry/support backend. User-configured filter-list subscriptions remain the pre-existing explicit exception: configuring an HTTPS filter-list URL necessarily contacts that selected provider when the list refreshes.

## Automated release evidence already accepted

Exact PR #28 head `5d51f6286a12cb08694a3bf2a1999a208b0e7137` passed:

- Firefox Repository run `34040856513`;
- Privacy Shield Firefox Runtime run `34040856577` on Firefox 155.0.1, including the normal real-Firefox smoke suite, the complete 0.2.0 popup quick-control exercise, and forced MV3 event-page termination/wake recovery.

PR #28 was merged with expected-head protection as `41c4f615664d21e7ecaa162c6f8ff6a7ec31df4c`, and post-merge Firefox Repository run `34040969920` passed on exact main.

## Review result

The 0.2.0 quick-control and support-diagnostic implementation passes this source-level release privacy review. The reviewed design remains local-first, bounded to deliberate per-site preferences and ephemeral/current-session observability, and does not create a new remote data path or durable browsing-history store.

This review does **not** make 0.2.0 Stable. Remaining gates include manual target-environment popup/user-interaction review, representative-site compatibility and Strict-mode recovery review, an explicit final inspection of copied support-snapshot text in the target environment, Mozilla unlisted signing of the exact 0.2.0 packaged payload, signed-artifact popup verification, persistent signed installation, full same-profile Firefox restart acceptance, and governed Stable promotion evidence.
