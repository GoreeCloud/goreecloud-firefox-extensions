#!/usr/bin/env python3
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def fail(message: str) -> None:
    raise SystemExit(f"ERROR: {message}")


def main() -> None:
    manifest = json.loads((ROOT / "manifest.json").read_text(encoding="utf-8"))
    if manifest.get("manifest_version") != 3:
        fail("Manifest V3 is required")
    if manifest.get("name") != "GoreeCloud Webspaces":
        fail("unexpected extension name")
    if manifest.get("version") != "0.1.14":
        fail("source version must remain synchronized with canonical inventory")
    if manifest.get("browser_specific_settings", {}).get("gecko", {}).get("id") != "webspaces@goreecloud.com":
        fail("unexpected Firefox add-on ID")

    required_permissions = {"activeTab", "contextualIdentities", "cookies", "menus", "storage", "webNavigation"}
    permissions = set(manifest.get("permissions", []))
    if permissions != required_permissions:
        fail(f"unexpected permission set: {sorted(permissions)}")
    if manifest.get("host_permissions"):
        fail("Webspaces must not require broad host permissions for this release candidate")

    action = manifest.get("action", {})
    if action.get("default_popup") != "ui/popup.html":
        fail("GoreeCloud Webspaces toolbar popup is required")
    if action.get("default_icon") != "icons/webspaces.svg":
        fail("first-party Webspaces toolbar identity mark is required")
    if manifest.get("options_ui", {}).get("page") != "ui/options.html":
        fail("GoreeCloud Webspaces management page is required")

    background = manifest.get("background", {})
    if background.get("type") != "module":
        fail("Firefox background scripts must remain ES modules")
    if background.get("scripts") != [
        "src/background.js",
        "src/routing-settings-background.js",
        "src/commands-background.js",
        "src/isolation-health-background.js",
    ]:
        fail("0.1.14 background modules are not registered in the required order")

    expected_commands = {
        "open-webspaces-launcher",
        "open-standard-webspace",
        "open-goreecloud-webspace",
        "open-google-webspace",
        "open-microsoft-webspace",
        "open-meta-webspace",
        "open-proton-webspace",
        "toggle-routing-pause",
        "open-webspaces-manager",
    }
    if set(manifest.get("commands", {})) != expected_commands:
        fail("unexpected Webspaces command registry")
    for command in manifest.get("commands", {}).values():
        if command.get("suggested_key"):
            fail("0.1.14 must leave shortcut assignment under explicit Firefox/user control")

    required_files = [
        "README.md",
        "SPECIFICATIONS.md",
        "FEATURES.md",
        "BENEFITS.md",
        "COMPETITIVE-OBJECTIVES.md",
        "SECURITY.md",
        "PRIVACY.md",
        "LICENSE",
        "icons/webspaces.svg",
        "icons/providers/standard.svg",
        "icons/providers/goreecloud.svg",
        "icons/providers/google.svg",
        "icons/providers/microsoft.svg",
        "icons/providers/meta.svg",
        "icons/providers/proton.svg",
        "vendor/THIRD_PARTY_NOTICES.md",
        "src/background.js",
        "src/constants.js",
        "src/containers.js",
        "src/context-menus.js",
        "src/current-webspace.js",
        "src/lifecycle.js",
        "src/management.js",
        "src/portability.js",
        "src/provider-rules.js",
        "src/routing.js",
        "src/routing-controls.js",
        "src/routing-settings-background.js",
        "src/bulk-rules.js",
        "src/commands.js",
        "src/commands-background.js",
        "src/isolation-health.js",
        "src/isolation-health-background.js",
        "src/storage.js",
        "src/tab-migration.js",
        "ui/glaze-webspaces.css",
        "ui/identity.js",
        "ui/provider-logos.js",
        "ui/provider-logos.css",
        "ui/popup.html",
        "ui/popup.css",
        "ui/popup.js",
        "ui/current-webspace-ui.js",
        "ui/options.html",
        "ui/options.css",
        "ui/options.js",
        "ui/routing-controls.css",
        "ui/routing-controls-ui.js",
        "ui/routing-settings-ui.js",
        "ui/shortcuts.css",
        "ui/shortcuts-ui.js",
        "ui/isolation-health.css",
        "ui/isolation-health-ui.js",
        "tests/routing.test.js",
        "tests/routing-explain.test.js",
        "tests/management.test.js",
        "tests/management-expanded.test.js",
        "tests/tab-migration.test.js",
        "tests/context-menus.test.js",
        "tests/current-webspace.test.js",
        "tests/lifecycle.test.js",
        "tests/portability.test.js",
        "tests/glaze-ui.test.js",
        "tests/identity-ui.test.js",
        "tests/provider-logos.test.js",
        "tests/ui-capabilities.test.js",
        "tests/locked-assignment-guard.test.js",
        "tests/routing-controls.test.js",
        "tests/commands.test.js",
        "tests/storage-migration.test.js",
        "tests/isolation-invariant.test.js",
        "tests/isolation-health.test.js",
        "tests/signed_restart_smoke.py",
    ]
    missing = [p for p in required_files if not (ROOT / p).is_file()]
    if missing:
        fail(f"missing required source files: {', '.join(missing)}")

    for relative in ["ui/popup.html", "ui/options.html"]:
        text = (ROOT / relative).read_text(encoding="utf-8")
        if 'data-glaze-version="1.3"' not in text:
            fail(f"{relative} must declare the Glaze UI V1.3 adoption target")
        if "glaze-webspaces.css" not in text:
            fail(f"{relative} must load the local Webspaces Glaze adoption stylesheet")
        if "routing-controls.css" not in text:
            fail(f"{relative} must load routing-controls.css")
        if "provider-logos.css" not in text or "provider-logos.js" not in text:
            fail(f"{relative} must load local built-in provider logo assets")
        if "../icons/webspaces.svg" not in text:
            fail(f"{relative} must use the first-party Webspaces identity mark")

    popup = (ROOT / "ui/popup.html").read_text(encoding="utf-8")
    options = (ROOT / "ui/options.html").read_text(encoding="utf-8")
    for token in ["why-panel", "new-temporary", "move-tab", "close-forget", "routing-controls-ui.js", "current-webspace-ui.js"]:
        if token not in popup:
            fail(f"popup is missing required control or module: {token}")
    for token in [
        "add-assignment",
        "assignment-search",
        "routing-tester",
        "export-config",
        "import-config",
        "routing-settings-ui.js",
        "shortcuts-ui.js",
        "shortcuts.css",
        "isolation-health-panel",
        "isolation-health-ui.js",
        "isolation-health.css",
        "provider-logos.js",
        "GoreeCloud Webspaces 0.1.14",
    ]:
        if token not in options:
            fail(f"manager is missing required 0.1.14 control or module: {token}")
    if "source candidate" in options.lower():
        fail("release-quality manager UI must use a lifecycle-neutral version label")

    constants = (ROOT / "src/constants.js").read_text(encoding="utf-8")
    provider_rules = (ROOT / "src/provider-rules.js").read_text(encoding="utf-8")
    routing = (ROOT / "src/routing.js").read_text(encoding="utf-8")
    storage = (ROOT / "src/storage.js").read_text(encoding="utf-8")
    containers = (ROOT / "src/containers.js").read_text(encoding="utf-8")
    settings_ui = (ROOT / "ui/routing-settings-ui.js").read_text(encoding="utf-8")
    provider_logos = (ROOT / "ui/provider-logos.js").read_text(encoding="utf-8")
    isolation = (ROOT / "src/isolation-health.js").read_text(encoding="utf-8")
    isolation_background = (ROOT / "src/isolation-health-background.js").read_text(encoding="utf-8")
    isolation_ui = (ROOT / "ui/isolation-health-ui.js").read_text(encoding="utf-8")
    current_identity = (ROOT / "src/current-webspace.js").read_text(encoding="utf-8")
    current_identity_ui = (ROOT / "ui/current-webspace-ui.js").read_text(encoding="utf-8")

    if 'STANDARD_WEBSPACE_ID = "standard"' not in constants or 'name: "Standard"' not in constants:
        fail("0.1.14 must retain the built-in Standard Webspace")
    if 'id: "proton"' not in constants or 'name: "Proton"' not in constants:
        fail("0.1.14 must include the built-in Proton Webspace")
    for domain in ["proton.me", "protonmail.com", "protonvpn.com"]:
        if domain not in provider_rules:
            fail(f"Proton provider routing is missing {domain}")
    for provider in ["standard", "goreecloud", "google", "microsoft", "meta", "proton"]:
        if f"icons/providers/{provider}.svg" not in provider_logos:
            fail(f"built-in provider logo map is missing {provider}")
    if 'reason: "standard-fallback"' not in routing:
        fail("unassigned HTTP(S) routing must use the Standard fallback reason")
    if "defaultWebspaceId: STANDARD_WEBSPACE_ID" not in storage:
        fail("configuration migration must normalize the Standard fallback")
    if "Standard Webspace" not in settings_ui:
        fail("manager must explain the fixed Standard fallback")
    if "assertDistinctCookieStores" not in containers or "share Firefox cookie store" not in containers:
        fail("Webspaces must enforce one distinct Firefox cookie store per managed Webspace")
    if "shared-cookie-store" not in isolation or "missing-firefox-identity" not in isolation:
        fail("isolation health must detect shared stores and missing Firefox identities")
    if "cookieStoreId" not in current_identity or "tabIds.includes(tabId)" not in current_identity:
        fail("current Webspace resolver must use direct cookie-store identity with Firefox tab-membership fallback")
    if "browser.cookies.getAllCookieStores" not in current_identity_ui or "resolveCurrentWebspace" not in current_identity_ui:
        fail("popup current identity UI must reconcile against Firefox cookie-store membership")

    health_message = "webspaces-health:get-isolation-health"
    legacy_health_message = "webspaces:get-isolation-health"
    if health_message not in isolation_background or health_message not in isolation_ui:
        fail("isolation health UI and background must share the dedicated runtime-message namespace")
    if legacy_health_message in isolation_background or legacy_health_message in isolation_ui:
        fail("isolation health must not collide with the main webspaces:* background message router")

    controls = (ROOT / "ui/routing-controls.css").read_text(encoding="utf-8")
    control_ui = (ROOT / "ui/routing-controls-ui.js").read_text(encoding="utf-8")
    if "[hidden]" not in controls or "display: none !important" not in controls:
        fail("routing controls must preserve semantic hidden states")
    if 'document.createElement("details")' not in control_ui or "routing-pause-summary" not in control_ui:
        fail("popup routing controls must use the compact disclosure model")

    shortcuts = (ROOT / "ui/shortcuts-ui.js").read_text(encoding="utf-8")
    if "openShortcutSettings" not in shortcuts or "commands.getAll" not in shortcuts or "open-proton-webspace" not in shortcuts:
        fail("shortcut manager must use Firefox command APIs and expose Proton")

    print(
        "Validated GoreeCloud Webspaces 0.1.14 release candidate: current-identity reconciliation, "
        "provider branding, Proton routing, Standard fallback, per-Webspace isolation, and lifecycle-neutral packaged UI."
    )


if __name__ == "__main__":
    main()
