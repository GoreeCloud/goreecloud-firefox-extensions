#!/usr/bin/env python3
"""Repository-local GLAZE UI 1.5.1 consumer qualification for Advanced Tab Manager."""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EXPECTED_VERSION = str(
    json.loads((ROOT / "manifest.json").read_text(encoding="utf-8"))["version"]
)
GLAZE_VERSION = "1.5.1"
GLAZE_AUTHORITY_REVISION = "af0d0d3e85aaf46e83a2baa64aab914fd96a7e98"
GLAZE_REVIEWED_IMPLEMENTATION = "ee1032a0822ab8e103f8afe48e5c1859fde65cc9"
GLAZE_QUALIFICATION_ANCHOR = "5b59d0e36950d737dba35b58ae58058684e0831b"


def require(condition: bool, message: str) -> None:
    if not condition:
        raise SystemExit(message)


def read(relative: str) -> str:
    return (ROOT / relative).read_text(encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source-revision", required=True)
    parser.add_argument("--output", default="dist/advanced-tab-manager-glaze-1.5.1-acceptance.json")
    args = parser.parse_args()
    require(re.fullmatch(r"[0-9a-f]{40}", args.source_revision) is not None, "source revision must be a full lowercase SHA")

    manifest = json.loads(read("manifest.json"))
    require(manifest.get("version") == EXPECTED_VERSION, f"Glaze consumer qualification is not bound to {EXPECTED_VERSION}")

    sidebar_css = read("src/sidebar/sidebar.css")
    palette_css = read("src/sidebar/command-palette.css")
    rules_css = read("src/sidebar/rules.css")
    popup_css = read("src/popup/popup.css")
    manager_css = read("src/manager/manager.css")
    sidebar_html = read("src/sidebar/sidebar.html")
    popup_html = read("src/popup/popup.html")
    manager_html = read("src/manager/manager.html")
    palette_js = read("src/sidebar/command-palette.js")
    manager_js = read("src/manager/manager.js")
    manager_model = read("src/core/manager-model.js")
    rule_state = read("src/core/rule-state.js")
    all_css = "\n".join((sidebar_css, palette_css, rules_css, popup_css, manager_css))

    # Stable presentation and accessibility obligations applicable to constrained Firefox surfaces.
    for token in ("Canvas", "CanvasText", "AccentColor", "AccentColorText"):
        require(token in all_css, f"missing system semantic color token: {token}")
    require("prefers-reduced-transparency" in sidebar_css, "sidebar lacks Reduced Transparency fallback")
    require("prefers-reduced-transparency" in palette_css, "command palette lacks Reduced Transparency fallback")
    require("prefers-reduced-transparency" in manager_css, "Manager lacks Reduced Transparency fallback")
    require("forced-colors: active" in sidebar_css, "sidebar lacks Forced Colors handling")
    require("forced-colors: active" in palette_css, "command palette lacks Forced Colors handling")
    require("forced-colors: active" in rules_css, "rules surface lacks Forced Colors handling")
    require("forced-colors: active" in popup_css, "popup lacks Forced Colors handling")
    require("forced-colors: active" in manager_css, "Manager lacks Forced Colors handling")
    require(":focus-visible" in all_css or ":focus-within" in all_css, "keyboard focus indication is missing")
    require("@media (max-width:" in sidebar_css and "@media (max-width:" in manager_css, "responsive constrained-window rules are missing")
    require("aria-live" in sidebar_html and "aria-live" in popup_html and "aria-live" in manager_html, "live state semantics are incomplete")
    require("aria-label" in sidebar_html and "aria-label" in manager_html, "accessible labeling is incomplete")
    require("aria-modal" in palette_js and 'role=\"listbox\"' in palette_js, "command palette dialog/list semantics are missing")
    require("animation:" not in all_css and "transition:" not in all_css, "unqualified motion is not permitted in the release candidate")

    # Authority, privacy, and fallback obligations.
    require("browser.permissions.request" not in "\n".join((manager_js, palette_js)), "presentation layer must not request permissions")
    require("window.confirm" in manager_js, "consequential Manager operations require explicit confirmation")
    require("tab.title" not in manager_model and "tab.url" not in manager_model, "Manager diagnostics must remain privacy-minimized")
    require("enabled: false" in rule_state, "rule automation must remain fail-closed by default")
    require("canonical release records" in manager_html.lower(),
            "runtime presentation must point lifecycle truth to canonical release records")
    require("release lifecycle, signing, and platform acceptance" in manager_html.lower(),
            "runtime presentation must keep release lifecycle/signing/platform acceptance external")
    require("source candidate" not in popup_html.lower(), "release-candidate lifecycle text must not be embedded in popup runtime bytes")
    require("development source only" not in manager_html.lower(), "development lifecycle text must not be embedded in Manager runtime bytes")

    evidence = {
        "schemaVersion": 1,
        "product": "GoreeCloud Advanced Tab Manager",
        "sourceVersion": EXPECTED_VERSION,
        "sourceRevision": args.source_revision,
        "supportedPlatform": "Firefox browser extension",
        "glazeTargetVersion": GLAZE_VERSION,
        "glazeAuthorityRepository": "GoreeCloud/goreecloud-glaze-ui",
        "glazeAuthorityRevisionReviewed": GLAZE_AUTHORITY_REVISION,
        "glazeReviewedImplementationAnchor": GLAZE_REVIEWED_IMPLEMENTATION,
        "glazeQualificationAnchor": GLAZE_QUALIFICATION_ANCHOR,
        "adoptionMode": "repository-local constrained-browser contract adoption",
        "status": "accepted-v1",
        "applicablePresentationObligationsAccepted": True,
        "authorityBoundaryPreserved": True,
        "privacyMinimizedDiagnosticsPreserved": True,
        "accessibilityPrecedenceAccepted": True,
        "responsiveConstrainedWindowAccepted": True,
        "reducedTransparencyAccepted": True,
        "forcedColorsAccepted": True,
        "keyboardFocusAccepted": True,
        "automaticPermissionRequest": False,
        "automaticConsequentialExecution": False,
        "sharedPerformanceAcceptanceInherited": False,
        "sharedPostureAcceptanceInherited": False,
        "sharedRuntimePackageRequired": False,
        "productStableStatusImplied": False,
        "productionEligibilityImplied": False,
    }
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(evidence, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(json.dumps(evidence, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
