# Privacy Shield 0.2.0 Target Acceptance Checklist

## Status

**Release state:** Candidate  
**Current Stable Firefox release:** 0.1.1  
**Purpose:** Record the remaining human/target-environment evidence required before deliberate Mozilla signing and governed Stable promotion of 0.2.0.

This checklist is an acceptance aid, not evidence by itself. A box is complete only when the exact candidate/artifact and target environment are identified and the observed result is recorded. Automated controlled fixtures supplement but do not replace real-site or human interaction review.

## Evidence header

Record before review:

- exact source revision;
- manifest version;
- packaged XPI SHA-256;
- Firefox version;
- operating system/device;
- installation mode: temporary unsigned candidate or Mozilla-signed candidate;
- date/time of review;
- reviewer.

Do not paste AMO credentials, cookies, authentication headers, private browsing history, account identifiers, full private URLs, or unrelated page content into this record.

## 1. Popup and interaction review

Verify on an ordinary HTTPS page:

- [ ] Popup opens reliably and identifies the expected hostname.
- [ ] On/Off state is understandable and changes only the current site's protection override.
- [ ] Standard, Strict, and Compatible mode labels/help are understandable.
- [ ] Apply changes the intended site mode and reloads the protected tab.
- [ ] Reset site removes the host-specific override and returns to Standard/global behavior.
- [ ] Blocked, Cleaned, Hidden, and Local counters are readable and scoped explicitly to **This tab**.
- [ ] Protection details opens, uses friendly aggregate reasons, and does not expose raw request URLs or page content.
- [ ] Refresh updates current-session details without reloading the protected page.
- [ ] Copy clean URL copies the expected sanitized page URL.
- [ ] Copy support snapshot reports success and copies only the bounded diagnostic surface.
- [ ] Keyboard focus is visible and every quick control is reachable and operable without a mouse.
- [ ] Controls remain usable at the target system/browser text scaling and zoom settings.

## 2. Representative-site compatibility review

Use ordinary sites you are authorized to access. Do not use this review to bypass authentication, paywalls, consent boundaries, or access controls.

Cover at least these site archetypes where available:

- [ ] long-form article/news page;
- [ ] JavaScript-heavy application or dashboard;
- [ ] page with ordinary third-party embedded content;
- [ ] form/login/account flow that you can safely exercise;
- [ ] media-rich page where normal playback or viewing is expected.

For each representative site, record the hostname, mode tested, whether core content/navigation/actions worked, and any visible breakage. Do not copy private page contents into the acceptance record.

## 3. Strict-mode breakage recovery

At least one controlled or naturally affected representative page must demonstrate that the user can recover from Strict-mode incompatibility without disabling Privacy Shield globally.

- [ ] Apply Strict to one site and identify a real, reproducible compatibility impact caused by third-party script/frame blocking, if the chosen site has such dependencies.
- [ ] Switch that same site to Compatible and confirm ordinary site functionality returns while core Privacy Shield tracker/malware/miner/URL/ping/ETag/popup/ad-request protections remain enabled by the profile contract.
- [ ] Re-test the affected user action after Compatible is applied.
- [ ] Apply Reset site and confirm the host returns to Standard/global settings.
- [ ] Confirm recovery is host-scoped and does not alter another tab/site's mode.

The permanent `compatibility_recovery_smoke.py` runtime gate covers deterministic article, script-dependent application, and third-party-embed archetypes in real Firefox. Passing that gate is controlled regression evidence only; this section still requires target-environment representative-site review.

## 4. Copied support-snapshot privacy inspection

Generate **Copy support snapshot** on a test page where you know the current URL contains a harmless throwaway path/query value so absence can be checked safely.

Expected allowed fields are limited to:

- extension/browser version;
- hostname;
- enabled state;
- active site mode;
- current-tab Blocked/Cleaned/Hidden/Local counters;
- friendly aggregate protection-reason labels/counts.

Verify:

- [ ] Hostname is present and expected.
- [ ] Raw page path is absent.
- [ ] Query string and fragment are absent.
- [ ] Raw request/final URLs are absent.
- [ ] Page text/DOM/selector content is absent.
- [ ] Cookies, credentials, authentication material, and identifiers are absent.
- [ ] Logger identifiers are absent.
- [ ] Snapshot is copied only after explicit user action and no upload/transmission occurs.

## 5. Candidate decision before signing

Before deliberate Mozilla unlisted signing:

- [ ] Permanent repository/runtime workflows pass on the exact candidate head.
- [ ] Automated popup acceptance passes on the exact candidate.
- [ ] Controlled Strict → Compatible → Reset compatibility recovery passes on the exact candidate.
- [ ] Forced MV3 event-page termination/wake recovery passes on the exact candidate.
- [ ] Sections 1–4 above have target-environment evidence with no unresolved release-blocking defect.
- [ ] Source-level release privacy review remains valid for the exact packaged payload.
- [ ] Exact candidate XPI digest is recorded.

Only after these checks should the manual Mozilla signing workflow be deliberately invoked.

## 6. Signed-artifact acceptance

The Mozilla-returned signed XPI must independently pass the canonical signing workflow's release-critical gates:

- [ ] signature/archive integrity;
- [ ] full real-Firefox runtime regression;
- [ ] popup quick-control acceptance;
- [ ] controlled compatibility/recovery acceptance;
- [ ] forced MV3 event-page recovery;
- [ ] persistent signed installation;
- [ ] full same-profile Firefox restart without reinstalling the extension;
- [ ] critical protection checks after restart.

Record the signed XPI SHA-256 and exact signing workflow run. Do not record signing credentials.

## 7. Promotion boundary

Stable promotion requires a separate governed release-record change after all required evidence is complete. Until that change is reviewed, validated, and merged, **0.1.1 remains Stable and 0.2.0 remains Candidate**.

Public AMO listing, global Privacy Shield platform production acceptance, GoreeCloud Browser compiled-runtime acceptance, DNS/Network/application acceptance, and other product/runtime gates remain separate decisions.