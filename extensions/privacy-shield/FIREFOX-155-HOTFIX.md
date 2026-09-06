# Privacy Shield Firefox 155 Compatibility Hotfix

## Status

**Candidate:** 0.1.1  
**Observed environment:** Firefox 155  
**Prior accepted Stable evidence:** Privacy Shield 0.1.0 on Firefox 154.0.1  
**Promotion state:** Not Stable until the exact candidate passes Firefox 155 runtime and signing acceptance.

## User-visible symptom

Privacy Shield can appear enabled while the popup reports `0` for **Blocked**, **Cleaned**, **Hidden**, and **Local** after a tab has already been protected. A cold background wake can also evaluate early network requests before asynchronously loaded settings and built-in blocking rules are available.

## Root cause

Privacy Shield 0.1.0 is a Firefox Manifest V3 extension. Firefox implements MV3 `background.scripts` as a non-persistent event page. An event page may be unloaded while idle and later recreated for an extension event.

The 0.1.0 runtime retained per-tab counters only in the `countersByTab` JavaScript `Map`. When Firefox unloaded the event page, that state disappeared. Reopening the popup could wake a new background page whose map was empty, producing the all-zero state even for a tab that had already recorded protection activity.

The network listeners also executed synchronously while the `ready` initialization promise loaded persisted settings, subscribed rules, and `rules/builtin.json`. On a cold event-page wake, an early request could therefore be evaluated against default settings plus an empty built-in rule catalog before initialization completed.

This is an extension lifecycle defect, not evidence that Firefox removed MV3 blocking `webRequest` support.

## 0.1.1 candidate correction

The candidate changes the background runtime so that:

- blocking `onBeforeRequest`, `onBeforeSendHeaders`, and `onHeadersReceived` listeners are asynchronous and await `ready` before deciding or modifying a request;
- current-tab counters are mirrored to `browser.storage.session` under `runtimeTabCounters`;
- session counters are restored when Firefox recreates the event page;
- session counter persistence remains memory-only for the current browser session and does not create a browsing-history database on disk;
- counters still reset when a tab begins a new page load and are removed when the tab closes;
- alarms and context-menu handlers also await background initialization before using runtime settings.

The Activity Logger remains bounded background memory in this candidate. Preserving raw logger reveal state across event-page recreation is deliberately not included in this hotfix because it has a separate privacy/lifetime design boundary.

## Regression coverage

`extensions/privacy-shield/scripts/test_background_activity.js` now covers both failure modes:

1. a tracker-domain request is delivered immediately after the background script loads, before asynchronous initialization can naturally settle, and must still be blocked;
2. background.js is recreated with the same mocked `storage.session`, and **This tab** counters must restore unchanged before the next navigation reset.

`extensions/privacy-shield/scripts/validate.py` also requires the event-page recovery contract and initialization-aware blocking listeners to remain present.

## Required acceptance before promotion

The 0.1.1 candidate is not release-complete until all of the following pass on the exact revision:

1. repository validation;
2. Privacy Shield source validation;
3. JavaScript syntax checks;
4. core, logger-privacy, and background-activity unit tests;
5. deterministic packaging;
6. real Firefox 155 runtime smoke tests, including protection after an event-page idle/suspend interval;
7. Mozilla unlisted signing;
8. persistent signed installation;
9. Firefox 155 restart acceptance before and after restart using the same profile;
10. manual popup verification that active-tab counters do not collapse to zero merely because the MV3 event page idled.

Until those gates pass, 0.1.0 remains the last signed Stable artifact, with acceptance evidence recorded specifically against Firefox 154.0.1.
