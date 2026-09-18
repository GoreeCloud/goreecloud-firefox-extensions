# GoreeCloud Advanced Tab Manager 0.1.12 — Rendered Acceptance Record

## Status

- Product: GoreeCloud Advanced Tab Manager
- Candidate version: `0.1.12`
- Lifecycle: Development / source candidate
- Accepted Stable release remains: `0.1.11`
- Exact reviewed source revision: `35c4d2dd8aa2a3fcd5742f430d8c8388ab85846a`
- Review date: 2026-09-18
- Review environment observed: Mozilla Firefox 156 on Linux
- Evidence type: owner-supplied representative rendered screenshots
- Stable acceptance implied: no

This record captures only what the supplied rendered evidence demonstrates. It does not replace automated Glaze/security/runtime qualification and does not establish Stable status.

## Reviewed surfaces

The supplied screenshots show:

- Firefox `about:debugging#/runtime/this-firefox` with the temporary 0.1.12 candidate loaded;
- the Advanced Tab Manager sidebar at a constrained desktop sidebar width;
- the full Manager surface;
- the toolbar popup.

## Verified rendered observations

### Firefox manifest/runtime presentation

- The earlier yellow Manifest V3 `background.persistent` warning is no longer present in the displayed temporary-extension card.
- The background script is shown as running.
- The add-on identity displayed by Firefox is GoreeCloud Advanced Tab Manager with extension ID `advanced-tab-manager@goreecloud.com`.

### Sidebar

- The top action row remains on one line at the observed sidebar width.
- The command trigger, Manager, Save, and Refresh controls are visibly separated and usable without the prior Refresh wrap.
- Search, view selection, summary chips, window heading, tab rows, active-tab treatment, and row actions remain readable at the observed width.
- The current native-tab-activation/source semantics are not fully proven by screenshots alone; keyboard and assistive-technology behavior remain separate acceptance work.

### Manager

- Live browser metrics render in a balanced 3×2 layout.
- Saved workspace renders six metrics in a balanced 3×2 layout.
- Snapshot count renders as `0`.
- Snapshot limit renders as `10`.
- The retention number input renders `10`.
- The empty recovery state visibly renders `No local session snapshots yet.`.
- Recovery and portability panels no longer rely on unnecessary equal-height stretching.
- Permission boundary renders host permissions as `None`, content scripts as `None`, and private browsing as `Not allowed`.
- The build identity continues to report version `0.1.12` while release lifecycle truth is delegated to canonical release records.

### Popup

- The popup metrics render as a readable 2×2 grid for Open tabs, Tab Sets, Snoozed, and Duplicates.
- The primary `Save focused window` action is visually dominant.
- `Open sidebar` and `Open manager` remain secondary actions.
- Version `0.1.12`, local-first/no-host-permissions copy, and Refresh remain visible without crowding.

## Acceptance limited to observed conditions

The supplied evidence supports representative **normal-light rendered acceptance** for the specific observed Firefox 156/Linux conditions above.

It does not establish the following:

- full keyboard traversal and focus order;
- screen-reader/assistive-technology announcements;
- Forced Colors rendered acceptance;
- Reduced Transparency rendered acceptance;
- dark appearance rendered acceptance;
- reduced-motion behavior;
- high zoom or text scaling;
- every supported constrained window width;
- other operating systems or Firefox versions;
- signed-XPI behavior;
- persistent signed installation and full-browser-restart acceptance;
- Stable release qualification.

## Automated evidence paired with this review

For the exact reviewed revision `35c4d2dd8aa2a3fcd5742f430d8c8388ab85846a`:

- Firefox Repository run `35389864473`: passed.
- Advanced Tab Manager Release Qualification run `35389864508`: passed.
- Advanced Tab Manager Firefox Runtime run `35389864484`: passed.
- Deterministic unsigned XPI SHA-256: `bebcc35d97b3e4f6312b80a2f7eb89b4f16d81017a4c89a36b53ee9260115da0`.
- Release-qualification artifact: `10566070379`.
- Release artifact digest: `sha256:fcc4ec83164599d249995bfe2f0d559ea2346d443084ff93766081879cab596a`.
- Runtime artifact: `10566310103`.
- Glaze UI target: V1.5 / machine version 1.5.1.
- Glaze source/machine evidence reports `status: accepted-v1` and does not imply Stable or production eligibility.

## Remaining gates

Before 0.1.12 can replace Stable 0.1.11, remaining applicable work includes representative keyboard/assistive-technology acceptance, Forced Colors, Reduced Transparency, dark-appearance and other required environmental rendered review, any corrections and fresh exact-head requalification, Mozilla signing, signed-artifact parity/integrity, persistent signed installation, full Firefox restart acceptance, and separate governed Stable promotion.
