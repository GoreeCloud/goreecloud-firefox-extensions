# Release Gate

## 0.2.0 popup quick-controls candidate

Version 0.2.0 is a **candidate**, not a Stable release.

The candidate builds on Stable 0.1.1 and adds user-facing Firefox popup controls without broadening permissions or introducing a new remote data path:

1. **Copy clean URL** for the current page using the same canonical local URL sanitizer already used by Privacy Shield navigation/link cleanup;
2. per-site **Standard**, **Strict**, and **Compatible** protection modes using the existing local `siteOverrides` settings boundary;
3. **Reset site** to remove the complete host-specific override and return to global Privacy Shield settings;
4. **Protection details** that aggregates current-tab blocked/redirected/hidden reason codes from already-redacted in-memory logger entries and displays only friendly reason labels plus counts;
5. a dedicated site-profile helper and regression tests, plus source-contract requirements that Protection details do not render request/final URLs.

### Candidate privacy and authority boundary

- no new extension permissions are requested;
- Copy clean URL writes only the locally sanitized current-page URL to the local clipboard;
- site protection modes persist only settings the user deliberately selects for that hostname and do not create browsing-history telemetry;
- changing a protection mode preserves the independent per-site enabled/disabled state;
- Strict mode adds third-party script/frame blocking but does not silently enable reviewed annoyance hiding or media blocking;
- Compatible mode keeps core tracker/malware/miner/URL/ping/ETag/popup/ad-request protections while reducing page-altering cosmetic/local-resource behavior;
- Protection details do not display raw URLs, selectors, DOM text, page content, credentials, identifiers, or other private payloads;
- the existing Activity Logger remains memory-only; Protection details therefore cover the current logger/background session rather than pretending to be durable historical evidence.

### Required 0.2.0 acceptance before promotion

The 0.2.0 candidate must not supersede Stable 0.1.1 until the exact release revision passes:

1. repository and extension source validation;
2. site-profile, core, logger-privacy, and unified-background regression tests;
3. maintained JavaScript syntax checks;
4. deterministic package and archive verification;
5. real Firefox runtime regression coverage on the accepted target Firefox version;
6. manual popup acceptance for Copy clean URL, all site modes, Reset site, and Protection details;
7. compatibility review demonstrating Standard/Strict/Compatible behavior on representative sites and recovery from a strict-mode site breakage through Compatible or Reset site;
8. Mozilla unlisted signing of the exact packaged payload;
9. persistent signed installation and full Firefox restart acceptance using the same profile;
10. release-specific privacy review confirming the quick controls remain local-first and evidence-bounded.

Until those gates pass, **0.1.1 remains the current Stable Privacy Shield Firefox release**.

## Stable 0.1.1 — Firefox 155 compatibility hotfix

Version 0.1.1 is **Stable** for Firefox unlisted/self-distribution within the accepted Firefox 155.0.1 compatibility evidence.

The release corrects a Manifest V3 event-page lifecycle defect that could make an enabled Privacy Shield popup return to zero current-tab counters after Firefox unloaded and recreated the non-persistent background event page. The same lifecycle could also allow an early request to be evaluated before asynchronously loaded settings and built-in rules were ready.

The accepted correction:

1. makes blocking `webRequest` handlers await asynchronous settings, subscribed-rule, and built-in-rule initialization before making a network decision;
2. stores **This tab** counters in `browser.storage.session`, which remains memory-only for the browser session but survives background event-page recreation;
3. restores those counters when the event page wakes again and continues to clear them when a new navigation begins or the tab closes;
4. adds regression coverage for cold-start blocking and simulated event-page recreation;
5. adds real Firefox lifecycle acceptance that explicitly terminates the non-persistent background through Firefox's WebExtension DebugUtils path, then verifies that a subsequent navigation wakes Privacy Shield and still cleans tracking parameters and blocks tracker requests.

### Stable 0.1.1 evidence

- Signed packaged-payload source revision: `4468d15c49a7ea19dae6e8dda49e07572134a019`
- Accepted exact PR head for final source/lifecycle validation: `87a8a8b1105f3d8ad7658abc2937c3b80e91f94c`
- Accepted hotfix merge on canonical main: `eac06d89bfb4110758ac334b8f6b5f5707188caf`
- Deterministic unsigned candidate SHA-256: `1ab3e70e0ff2398da6c9319437b1162ef92e8b36398d5a304da3052f0f00ff9d`
- Mozilla-signed XPI SHA-256: `f588ea7d638dce8b7b8a6eb341cc3748d6ec1595f069358cb92df72a8cccd848`
- Mozilla signing workflow: `Privacy Shield Mozilla Signing` run `34036020332`
- Exact-head Firefox Repository validation: run `34037548865` — success
- Exact-head Privacy Shield Firefox Runtime: run `34037548881` — success on Firefox `155.0.1`
- Post-merge Firefox Repository validation on canonical main: run `34037679174` — success
- Persistent Mozilla-signed installation: passed
- Full Firefox `155.0.1` restart using the same profile without reinstalling the add-on: passed
- Pre- and post-restart tracking cleanup, tracker-domain blocking, and built-in cosmetic filtering: passed
- Real Firefox non-persistent event-page termination and wake recovery: passed
- Manual target-environment verification on September 6, 2026: Privacy Shield enabled on The Verge with live **This tab** state of `2 Blocked`, `1 Cleaned`, `0 Hidden`, and `0 Local`, confirming the reported all-zero popup regression was no longer present in the tested Zorin/Firefox environment
- Extension ID: `privacy-shield@goreecloud.com`
- Distribution channel: Mozilla unlisted/self-distribution

The commits between the signed packaged-payload revision and the final accepted PR head affect CI/test/source-validation material only. Comparison of `4468d15c49a7ea19dae6e8dda49e07572134a019` through `87a8a8b1105f3d8ad7658abc2937c3b80e91f94c` contains no packaged extension payload files, preserving exact signed-payload identity while strengthening release acceptance.

The signing workflow remains `.github/workflows/privacy-shield-mozilla-signing.yml`; signed restart acceptance is implemented by `tests/signed_restart_smoke.py`, and Firefox event-page lifecycle acceptance is implemented by `tests/event_page_recovery_smoke.py`.

Public AMO listing is not part of this Stable release. A public listing remains a separate explicit publication decision.

## Prior Stable 0.1.0

Version 0.1.0 remains a historically accepted **Stable** release for Firefox unlisted/self-distribution within its Firefox 154.0.1 compatibility evidence. It is superseded by 0.1.1 as the current Stable Privacy Shield Firefox release but its acceptance record is preserved.

All required release gates passed for the accepted 0.1.0 candidate:

1. repository and extension validation passed on the exact candidate revision;
2. JavaScript syntax checks passed;
3. deterministic unsigned packaging succeeded and archive contents were inspected;
4. temporary Firefox installation validated manifest permissions and startup behavior;
5. runtime acceptance covered tracking cleanup, redirect bypass, copied-link cleaning, ETag removal, ping/beacon blocking, request filtering, custom rules, subscriptions, cosmetic filtering, picker/zapper, script/frame controls, logger, site exceptions, and local CDN substitution;
6. compatibility tests covered the reviewed normalize.css 8.0.1 local-resource mappings;
7. privacy review confirmed the local-first logging and remote-transmission boundaries;
8. Mozilla signing succeeded through the unlisted/self-distribution channel;
9. the returned Mozilla-signed XPI passed persistent installation, critical protection checks before restart, a full Firefox restart using the same profile without reinstalling the add-on, and the same critical checks after restart.

### Stable 0.1.0 evidence

- Release-source revision: `5546097d6985935c14ac36518008e54039ef7e94`
- Deterministic unsigned candidate SHA-256: `cf794ca17f8443f1a05162d16305315714fb432a9245c98513bbf131490a4e97`
- Mozilla-signed XPI SHA-256: `da7aa76ed45fededd66735e357ce93fb0e613ca1c4563b5a2cee09ded3b7a037`
- Mozilla signing workflow: `Privacy Shield Mozilla Signing` run `33077859664`, successful rerun job `98601740648`
- Accepted Firefox version: `154.0.1`
- Extension ID: `privacy-shield@goreecloud.com`
- Distribution channel: Mozilla unlisted/self-distribution
