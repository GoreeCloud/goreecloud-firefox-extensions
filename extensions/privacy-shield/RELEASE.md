# Release Gate

## 0.2.0 popup quick-controls and support-diagnostics candidate

Version 0.2.0 is a **candidate**, not a Stable release. Stable 0.1.1 remains the current accepted Mozilla-unlisted Firefox release until every applicable 0.2.0 gate is satisfied.

The candidate builds on Stable 0.1.1 and adds user-facing Firefox popup controls without broadening permissions or introducing a new GoreeCloud remote data path:

1. **Copy clean URL** for the current page using the same canonical local URL sanitizer already used by Privacy Shield navigation/link cleanup;
2. per-site **Standard**, **Strict**, and **Compatible** protection modes using the existing local `siteOverrides` settings boundary;
3. **Reset site** to remove the complete host-specific override and return to global Privacy Shield settings;
4. **Protection details** that aggregates current-tab blocked/redirected/hidden reason codes from already-redacted in-memory logger entries and displays only friendly reason labels plus counts;
5. **Refresh** to re-read the current-tab counters and privacy-safe Protection-details state without reloading the page or creating a new history store;
6. a compact local protection-state line showing On/Off plus the active site mode without claiming remote health, trust, or certification;
7. **Copy support snapshot**, an explicit local clipboard diagnostic that includes only extension/browser version, hostname, enabled state, site mode, current-tab counters, and friendly aggregate reason counts;
8. dedicated site-profile and support-snapshot helpers with regression tests and source-contract enforcement.

### Accepted source/runtime integration evidence

Quick-control PR #26 exact accepted head `caf41e9f69c839164b8d359a1227d190f7d9c7f4` passed Firefox Repository run `34038601483` and Privacy Shield Firefox Runtime run `34038601302`, then was squash-merged to canonical `main` as `8ebe049738e8eaa6fb62fbfb77dcc406644ab6e0`. Post-merge Firefox Repository run `34039281839` passed.

Privacy-safe support-diagnostics PR #27 exact accepted head `4ff981fc0a9f7a005aca45de3c86ec79606a2940` passed Firefox Repository run `34039723202` and Privacy Shield Firefox Runtime run `34039723198`, then was squash-merged to canonical `main` as `dc7517d412997250c8a609a49464e1af2df59b6a`. Post-merge Firefox Repository run `34039798025` passed.

Automated popup-acceptance PR #28 exact accepted head `5d51f6286a12cb08694a3bf2a1999a208b0e7137` passed Firefox Repository run `34040856513` and Privacy Shield Firefox Runtime run `34040856577` on Firefox 155.0.1. The runtime gate passed the existing real-Firefox smoke suite, the complete 0.2.0 popup quick-control exercise, and forced Manifest V3 event-page termination/wake recovery. PR #28 was squash-merged with expected-head protection as `41c4f615664d21e7ecaa162c6f8ff6a7ec31df4c`; post-merge Firefox Repository run `34040969920` passed on that exact main revision.

PR #28 changed only the permanent Firefox runtime workflow, Python source validation, and Python runtime acceptance test. The canonical packager excludes Markdown, Python files, `scripts/`, and `.github` workflow material from the extension XPI. Therefore PR #28 strengthened acceptance without altering the packaged 0.2.0 product payload that had already been integrated through PR #27.

### Controlled compatibility-recovery acceptance

The 0.2 release path now includes a permanent real-Firefox `compatibility_recovery_smoke.py` gate using deterministic local archetypes for a long-form/article page, a third-party-script-dependent web application, and a third-party embedded-content page. The gate requires Standard to retain ordinary dependencies while blocking a known tracker; Strict to block ordinary third-party script/frame dependencies while retaining tracker and cosmetic protection; Compatible to restore the affected ordinary dependencies while continuing to block the tracker; and Reset site to restore Standard behavior.

This is controlled regression evidence, not a claim about arbitrary public websites. It deliberately supplements rather than replaces the manual target-environment representative-site review. `RELEASE-ACCEPTANCE-0.2.0.md` defines the human release checklist, including real-site interaction, Strict breakage recovery, and support-snapshot inspection. The same deterministic compatibility/recovery test is required on the Mozilla-returned signed XPI by the manual signing workflow.

### Candidate privacy and authority boundary

- no new extension permissions are requested;
- Copy clean URL writes only the locally sanitized current-page URL to the local clipboard;
- site protection modes persist only settings the user deliberately selects for that hostname and do not create browsing-history telemetry;
- changing a protection mode preserves the independent per-site enabled/disabled state;
- Strict mode adds third-party script/frame blocking but does not silently enable reviewed annoyance hiding or media blocking;
- Compatible mode keeps core tracker/malware/miner/URL/ping/ETag/popup/ad-request protections while reducing page-altering cosmetic/local-resource behavior;
- Protection details do not display raw URLs, selectors, DOM text, page content, credentials, identifiers, or other private payloads;
- Refresh reuses existing current-tab counter and redacted logger authorities and does not create storage or remote traffic;
- Copy support snapshot uses an explicit positive allowlist and excludes raw request/final URLs, query strings, page content, selectors, credentials, cookies, and logger identifiers even if unknown sensitive fields are supplied by a caller;
- the copied support snapshot intentionally includes the current hostname because it is a site-scoped diagnostic; it does not include the raw path, query, fragment, or request activity payload;
- support snapshots are created only after user action, copied only to the local clipboard, and are not retained, uploaded, transmitted, or added to the Activity Logger;
- the existing Activity Logger remains bounded memory-only state; Protection details therefore covers the current logger/background session rather than pretending to be durable historical evidence;
- current-tab Blocked/Cleaned/Hidden/Local counters use Firefox `browser.storage.session` only so they survive Manifest V3 event-page recreation; they reset on new navigation and are removed when the tab closes.

### Release privacy review

This release-review change adds `RELEASE-PRIVACY-REVIEW-0.2.0.md`, which records the source-level 0.2.0 release privacy review. The review confirms that the quick controls and support diagnostics remain local-first, use bounded derived state, do not create a new GoreeCloud telemetry/support backend, and do not create a durable browsing-history store.

The source-level privacy review does **not** authorize automatic signing or Stable promotion. A final target-environment inspection of the copied support-snapshot text remains part of release acceptance so the human-visible diagnostic can be checked directly before promotion.

### Mozilla signing and signed-artifact acceptance

The canonical manual-only `.github/workflows/privacy-shield-mozilla-signing.yml` is version-dynamic and resolves the exact manifest version selected for a deliberate release operation. This release-review change strengthens that workflow so the exact candidate is revalidated with core, site-profile, support-snapshot, logger-privacy, and unified-background tests before signing.

After Mozilla returns the signed XPI, the workflow now requires the **signed artifact itself** to pass:

1. the complete real-Firefox Privacy Shield runtime smoke suite;
2. the 0.2 popup quick-control acceptance matrix;
3. the controlled Strict → Compatible → Reset compatibility/recovery archetype matrix;
4. forced non-persistent Manifest V3 event-page wake recovery; and
5. persistent signed installation plus full same-profile Firefox restart acceptance.

The workflow continues to use pinned `web-ext` 10.5.0 with Node.js 22, the unlisted/self-distribution channel, the fixed extension ID `privacy-shield@goreecloud.com`, exact unsigned/signed SHA-256 evidence, Mozilla signature-metadata verification, and AMO credentials sourced only from encrypted GitHub repository secrets.

### Required 0.2.0 acceptance before promotion

The following gates are already complete at source/runtime level:

- repository and extension source validation;
- site-profile, support-snapshot, core, logger-privacy, and unified-background regression tests;
- maintained JavaScript syntax checks;
- deterministic package and archive verification;
- real Firefox 155.0.1 runtime regression coverage for the candidate;
- automated real-Firefox popup acceptance for Copy clean URL, Standard/Strict/Compatible, Reset site, Protection details, Refresh, local protection-state presentation, and Copy support snapshot;
- forced Manifest V3 event-page termination and wake recovery for the unsigned candidate;
- source-level release privacy review of the 0.2 quick-control/support-diagnostic data boundaries.

The controlled compatibility/recovery gate is now a permanent candidate and signed-artifact requirement. Its exact-candidate acceptance is established only by a successful workflow result for the revision being considered for release; its presence in source is not itself acceptance evidence.

The remaining release gates are:

1. **manual target-environment popup/user-interaction review** of the complete 0.2.0 control set;
2. **manual target-environment representative-site compatibility review**, including a demonstrated recovery path from Strict-mode breakage through Compatible or Reset site; controlled fixture acceptance does not close this human/live-site gate;
3. **target-environment copied-support-snapshot inspection** confirming expected diagnostic fields are present and private URL/query/page/selector/credential/logger content is absent;
4. **Mozilla unlisted signing of the exact 0.2.0 packaged payload** through the canonical manual signing workflow;
5. **signed-artifact full runtime, popup, compatibility/recovery, and MV3 wake-recovery acceptance** on the returned Mozilla-signed XPI;
6. **persistent signed installation and full same-profile Firefox restart acceptance**;
7. **governed Stable promotion evidence** and release-record reconciliation.

Until those remaining gates pass, **0.1.1 remains the current Stable Privacy Shield Firefox release**.

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