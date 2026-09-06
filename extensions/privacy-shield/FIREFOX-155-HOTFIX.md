# Privacy Shield Firefox 155 Compatibility Hotfix

## Status

**Release:** 0.1.1 Stable  
**Accepted environment:** Firefox 155.0.1  
**Prior Stable:** Privacy Shield 0.1.0 on Firefox 154.0.1  
**Distribution:** Mozilla unlisted/self-distribution

## User-visible symptom

Privacy Shield could appear enabled while the popup reported `0` for **Blocked**, **Cleaned**, **Hidden**, and **Local** after a tab had already been protected. A cold background wake could also evaluate early network requests before asynchronously loaded settings and built-in blocking rules were available.

## Root cause

Privacy Shield 0.1.0 is a Firefox Manifest V3 extension. Firefox implements MV3 `background.scripts` as a non-persistent event page. An event page may be unloaded while idle and later recreated for an extension event.

The 0.1.0 runtime retained per-tab counters only in the `countersByTab` JavaScript `Map`. When Firefox unloaded the event page, that state disappeared. Reopening the popup could wake a new background page whose map was empty, producing the all-zero state even for a tab that had already recorded protection activity.

The network listeners also executed synchronously while the `ready` initialization promise loaded persisted settings, subscribed rules, and `rules/builtin.json`. On a cold event-page wake, an early request could therefore be evaluated against default settings plus an empty built-in rule catalog before initialization completed.

This was an extension lifecycle defect, not evidence that Firefox removed MV3 blocking `webRequest` support.

## 0.1.1 correction

The release changes the background runtime so that:

- blocking `onBeforeRequest`, `onBeforeSendHeaders`, and `onHeadersReceived` listeners are asynchronous and await `ready` before deciding or modifying a request;
- current-tab counters are mirrored to `browser.storage.session` under `runtimeTabCounters`;
- session counters are restored when Firefox recreates the event page;
- session counter persistence remains memory-only for the current browser session and does not create a browsing-history database on disk;
- counters still reset when a tab begins a new page load and are removed when the tab closes;
- alarms and context-menu handlers also await background initialization before using runtime settings.

The Activity Logger remains bounded background memory in this release. Preserving raw logger reveal state across event-page recreation is deliberately not included because it has a separate privacy/lifetime design boundary.

## Regression coverage

`extensions/privacy-shield/scripts/test_background_activity.js` covers both source-level failure modes:

1. a tracker-domain request is delivered immediately after the background script loads, before asynchronous initialization can naturally settle, and must still be blocked;
2. `background.js` is recreated with the same mocked `storage.session`, and **This tab** counters must restore unchanged before the next navigation reset.

`extensions/privacy-shield/tests/event_page_recovery_smoke.py` provides real-Firefox lifecycle acceptance. It temporarily installs the packaged XPI, proves URL cleaning and tracker blocking, explicitly terminates the non-persistent background through Firefox's own `ExtensionParent.DebugUtils.terminateBackgroundScript` path, then proves that the next protected navigation wakes the event page and retains the protections.

`extensions/privacy-shield/scripts/validate.py` requires the event-page recovery contract and initialization-aware blocking listeners to remain present.

## Accepted evidence

All release gates required for the Firefox 155 hotfix passed:

1. repository validation — passed;
2. Privacy Shield source validation — passed;
3. JavaScript syntax checks — passed;
4. core, logger-privacy, and background-activity unit tests — passed;
5. deterministic packaging — passed;
6. real Firefox 155.0.1 runtime smoke testing — passed;
7. real Firefox MV3 event-page termination/wake recovery — passed;
8. Mozilla unlisted signing — passed;
9. persistent signed installation — passed;
10. Firefox 155.0.1 full restart acceptance before and after restart using the same profile — passed;
11. manual target-environment popup verification — passed for the reported symptom.

### Exact evidence

- Signed packaged-payload source revision: `4468d15c49a7ea19dae6e8dda49e07572134a019`
- Final accepted PR head: `87a8a8b1105f3d8ad7658abc2937c3b80e91f94c`
- Canonical hotfix merge: `eac06d89bfb4110758ac334b8f6b5f5707188caf`
- Deterministic unsigned candidate SHA-256: `1ab3e70e0ff2398da6c9319437b1162ef92e8b36398d5a304da3052f0f00ff9d`
- Mozilla-signed XPI SHA-256: `f588ea7d638dce8b7b8a6eb341cc3748d6ec1595f069358cb92df72a8cccd848`
- Mozilla signing run: `34036020332`
- Exact-head Firefox Repository run: `34037548865`
- Exact-head Privacy Shield Firefox Runtime run: `34037548881`
- Post-merge Firefox Repository run: `34037679174`

The commits between the signed payload revision and final accepted PR head change CI/test/source-validation material only; no packaged extension payload file changed in that range.

## Manual target-environment result

On September 6, 2026, the reported Zorin/Firefox environment showed Privacy Shield enabled on The Verge with live **This tab** counters of **2 Blocked, 1 Cleaned, 0 Hidden, and 0 Local**. This confirms the original user-visible all-zero regression was no longer present in the observed target environment. The automated Firefox lifecycle suite separately verifies protection after forced MV3 event-page termination and wake.

## Historical boundary

Privacy Shield 0.1.0 remains the prior Stable release record accepted against Firefox 154.0.1. Version 0.1.1 supersedes it as the current Stable Firefox release for the accepted Firefox 155.0.1 compatibility evidence. Public AMO listing remains a separate publication decision.