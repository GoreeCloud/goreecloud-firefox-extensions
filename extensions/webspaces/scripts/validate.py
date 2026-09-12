#!/usr/bin/env python3
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
def fail(message: str) -> None: raise SystemExit(f"ERROR: {message}")
def main() -> None:
    manifest=json.loads((ROOT/"manifest.json").read_text(encoding="utf-8"))
    if manifest.get("manifest_version") != 3: fail("Manifest V3 is required")
    if manifest.get("name") != "GoreeCloud Webspaces": fail("unexpected extension name")
    if manifest.get("version") != "0.1.5": fail("source version must remain synchronized with canonical inventory")
    if manifest.get("browser_specific_settings",{}).get("gecko",{}).get("id") != "webspaces@goreecloud.com": fail("unexpected Firefox add-on ID")
    required_permissions={"activeTab","contextualIdentities","cookies","menus","storage","webNavigation"}
    permissions=set(manifest.get("permissions",[]))
    if permissions != required_permissions: fail(f"unexpected permission set: {sorted(permissions)}")
    if manifest.get("host_permissions"): fail("Webspaces must not require broad host permissions for this source candidate")
    action=manifest.get("action",{})
    if action.get("default_popup") != "ui/popup.html": fail("GoreeCloud Webspaces toolbar popup is required")
    if action.get("default_icon") != "icons/webspaces.svg": fail("first-party Webspaces toolbar identity mark is required")
    if manifest.get("options_ui",{}).get("page") != "ui/options.html": fail("GoreeCloud Webspaces management page is required")
    required_files=["README.md","SPECIFICATIONS.md","FEATURES.md","BENEFITS.md","COMPETITIVE-OBJECTIVES.md","SECURITY.md","PRIVACY.md","LICENSE","icons/webspaces.svg","src/background.js","src/constants.js","src/containers.js","src/context-menus.js","src/lifecycle.js","src/management.js","src/portability.js","src/provider-rules.js","src/routing.js","src/storage.js","src/tab-migration.js","ui/glaze-webspaces.css","ui/identity.js","ui/popup.html","ui/popup.css","ui/popup.js","ui/options.html","ui/options.css","ui/options.js","tests/routing.test.js","tests/routing-explain.test.js","tests/management.test.js","tests/management-expanded.test.js","tests/tab-migration.test.js","tests/context-menus.test.js","tests/lifecycle.test.js","tests/portability.test.js","tests/glaze-ui.test.js","tests/identity-ui.test.js","tests/ui-capabilities.test.js"]
    missing=[p for p in required_files if not (ROOT/p).is_file()]
    if missing: fail(f"missing required source files: {', '.join(missing)}")
    for relative in ["ui/popup.html","ui/options.html"]:
        text=(ROOT/relative).read_text(encoding="utf-8")
        if 'data-glaze-version="1.3"' not in text: fail(f"{relative} must declare the Glaze UI V1.3 adoption target")
        if "glaze-webspaces.css" not in text: fail(f"{relative} must load the local Webspaces Glaze adoption stylesheet")
        if "../icons/webspaces.svg" not in text: fail(f"{relative} must use the first-party Webspaces identity mark")
    popup=(ROOT/"ui/popup.html").read_text(encoding="utf-8"); options=(ROOT/"ui/options.html").read_text(encoding="utf-8")
    for token in ["why-panel","new-temporary","move-tab","close-forget"]:
        if token not in popup: fail(f"popup is missing required 0.1.5 control: {token}")
    for token in ["add-assignment","assignment-search","routing-tester","export-config","import-config"]:
        if token not in options: fail(f"manager is missing required 0.1.5 control: {token}")
    print("Validated GoreeCloud Webspaces 0.1.5 source-candidate management and portability slice.")
if __name__ == "__main__": main()
