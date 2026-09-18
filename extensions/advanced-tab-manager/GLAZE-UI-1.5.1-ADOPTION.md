# GoreeCloud Advanced Tab Manager — GLAZE UI 1.5.1 Consumer Adoption

## Status

**Product:** GoreeCloud Advanced Tab Manager  
**Candidate:** 0.1.11  
**Platform:** Firefox browser extension  
**Target:** GLAZE UI V1.5 / machine version 1.5.1 Stable  
**Shared authority reviewed:** `GoreeCloud/goreecloud-glaze-ui` main `af0d0d3e85aaf46e83a2baa64aab914fd96a7e98`  
**Reviewed shared implementation anchor:** `ee1032a0822ab8e103f8afe48e5c1859fde65cc9`  
**Shared V1.5.1 qualification anchor:** `5b59d0e36950d737dba35b58ae58058684e0831b`

This is repository-local consumer adoption for the constrained Firefox surfaces. It does not inherit shared Glaze performance, foldable/posture, deployment, production, or other consumer-specific acceptance automatically.

## Applicable acceptance

Advanced Tab Manager adopts the current Stable presentation contract through its local Firefox surfaces rather than by embedding a separate Glaze runtime package.

The release-candidate qualification must prove:

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

The evidence is bound to the exact candidate revision supplied by CI. A later material presentation or authority change requires requalification.
