# GoreeCloud Advanced Tab Manager — GLAZE UI 1.5.1 Consumer Adoption

## Status

**Product:** GoreeCloud Advanced Tab Manager  
**Accepted release:** Stable 0.1.11  
**Platform:** Firefox browser extension  
**Target:** GLAZE UI V1.5 / machine version 1.5.1 Stable  
**Shared authority reviewed:** `GoreeCloud/goreecloud-glaze-ui` main `af0d0d3e85aaf46e83a2baa64aab914fd96a7e98`  
**Reviewed shared implementation anchor:** `ee1032a0822ab8e103f8afe48e5c1859fde65cc9`  
**Shared V1.5.1 qualification anchor:** `5b59d0e36950d737dba35b58ae58058684e0831b`

This is repository-local consumer adoption for the constrained Firefox surfaces. It does not inherit shared Glaze performance, foldable/posture, deployment, production, or other consumer-specific acceptance automatically.

## Applicable acceptance

Advanced Tab Manager adopts the current Stable presentation contract through its local Firefox surfaces rather than by embedding a separate Glaze runtime package.

The accepted Stable 0.1.11 qualification proves:

- truthful system/source/permission state;
- presentation-only adaptation without inferred authorization;
- explicit user initiation for consequential actions;
- privacy-minimized diagnostics;
- semantic system colors and dark/light compatibility;
- keyboard-visible focus;
- responsive narrow-window behavior;
- Reduced Transparency fallback where translucent presentation is used;
- Forced Colors support across sidebar, rules, command palette, popup, and Manager;
- semantic labels, live regions, command-dialog/list semantics, and accessible control naming;
- no unqualified motion in the candidate surfaces;
- fail-closed disabled-by-default rule automation;
- no automatic permission request introduced by presentation code;
- lifecycle/signing truth sourced from canonical release records rather than hard-coded Stable/source-candidate claims inside the packaged UI.

## Shared-only obligations not inherited

The shared 1.5.1 performance qualification and Pixel Fold posture qualification remain evidence for the shared design system only. They are not reclassified as Advanced Tab Manager Firefox performance or posture evidence.

Advanced Tab Manager has its own deterministic large-session core qualification and real-Firefox runtime acceptance. Those remain separate from shared Glaze qualification.

## Machine evidence

`scripts/glaze_consumer_qualification.py` validates the applicable source boundary and writes exact-revision evidence to:

`dist/advanced-tab-manager-glaze-1.5.1-acceptance.json`

The accepted evidence is bound to the exact qualified 0.1.11 release lineage. Governed signing/restart run `35350654198` re-ran this qualification on authoritative source revision `34c27805c3b56f3ba858794c785f6b68d1f7b8f3`. A later material presentation or authority change requires requalification.


## 0.1.12 candidate requalification

Version 0.1.12 is a material presentation change and therefore does not inherit the accepted 0.1.11 consumer result as proof for the new runtime bytes.

The 0.1.12 source candidate retains GLAZE UI V1.5 / machine version 1.5.1 as its current Stable target. Its popup, sidebar, and Manager have been reworked for stronger hierarchy, action priority, density, responsive composition, lifecycle-truth separation, and accessible interaction semantics while preserving the existing browser-authority and privacy boundary.

Fresh qualification must be bound to the exact 0.1.12 candidate revision. Source/machine validation through `scripts/glaze_consumer_qualification.py` is necessary but is not, by itself, a substitute for representative rendered Firefox visual, keyboard, accessibility, narrow-window, Forced Colors, and Reduced Transparency review.

Exact-revision source/machine qualification passed on candidate revision `d00a552a18934b261e6aec190bd6ffb71fd81745` in Advanced Tab Manager Release Qualification run `35357010882`. The retained evidence reports `status: accepted-v1`, `productStableStatusImplied: false`, no inherited shared performance/posture acceptance, and preservation of the authority/privacy/accessibility source obligations.

This machine/source result does not substitute for the outstanding representative rendered Firefox visual and accessibility review. Until those rendered acceptance steps and the later signing/release gates pass:

- source version: `0.1.12`;
- source lifecycle: Development / source candidate;
- accepted Stable release: `0.1.11`;
- 0.1.12 Glaze source/machine qualification: passed at `d00a552a18934b261e6aec190bd6ffb71fd81745`;
- representative rendered/accessibility acceptance: pending;
- 0.1.12 Stable status: not established.

The lack of an approved Advanced Tab Manager product icon in the canonical branding catalog remains separate from Glaze source qualification. This candidate does not invent or substitute an unofficial product identity asset.


### Representative Firefox review note — 2026-09-18

A Firefox 156 representative screenshot of the 0.1.12 temporary installation identified two presentation/runtime-quality issues before acceptance:

- Firefox reported that Manifest V3 does not support the `background.persistent` property.
- The dynamically inserted command-palette trigger caused the narrow sidebar toolbar to wrap Refresh onto a separate row.

The candidate source removes the unsupported manifest property and integrates a compact `⌘K` command trigger into the same no-wrap toolbar layout. These corrections require fresh exact-head qualification and a new representative rendered check; this note is not itself rendered acceptance.


### Representative Firefox review note — Manager follow-up

A second owner-supplied Firefox 156 review confirms that the prior Manifest V3 warning is no longer present and the narrow sidebar toolbar remains on one row with the compact `⌘K` trigger.

The same review exposed a separate Manager presentation bug: the session-snapshot retention field appeared empty and the empty snapshot state was not rendered, even though the privacy-minimized Manager model already carried both retention and snapshot metadata. The candidate now explicitly renders `model.snapshots`, adds configured snapshot retention to Saved workspace metrics, presents a visible no-snapshot empty state, renders zero content scripts as `None`, and prevents the recovery card from stretching solely to match the taller portability card.

These source changes require fresh exact-head qualification and a new rendered check before Manager visual acceptance is complete.
