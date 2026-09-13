#!/usr/bin/env python3
"""Persistent signed-install and full-restart acceptance for GoreeCloud Webspaces.

This gate deliberately requires a Mozilla-signed XPI. It installs the add-on
non-temporarily into an in-place Firefox profile, verifies the expected add-on
identity, confirms that the six built-in Firefox contextual identities exist,
fully quits Firefox, starts a second Firefox process against the same profile
without reinstalling the add-on, and verifies that the extension registration
and built-in contextual identities persist.

Marionette/WebDriver deliberately blocks navigation to privileged pages such as
about:debugging, so this test uses Firefox's on-disk profile registries after each
browser process has exited. That avoids treating a WebDriver restriction as an
extension failure while still proving persistent installation and same-profile
restart survival.

The test does not replace rendered/manual routing acceptance. It proves the
signed installation/restart boundary and persistence of Webspaces' Firefox
identity substrate; routing, popup rendering, and Isolation Health semantics are
covered by the maintained source suite and direct Firefox acceptance evidence.
"""

from __future__ import annotations

import json
import socket
import sys
import tempfile
import time
from pathlib import Path

from selenium import webdriver
from selenium.webdriver.firefox.options import Options

EXPECTED_ADDON_ID = "webspaces@goreecloud.com"
EXPECTED_BUILT_INS = {"Standard", "GoreeCloud", "Google", "Microsoft", "Meta", "Proton"}


def require(condition: bool, name: str, detail: str = "") -> None:
    if not condition:
        suffix = f": {detail}" if detail else ""
        raise AssertionError(f"FAIL {name}{suffix}")
    print(f"PASS {name}")


def free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.bind(("127.0.0.1", 0))
        return int(sock.getsockname()[1])


def firefox_options(profile: Path) -> Options:
    options = Options()
    options.add_argument("-headless")
    options.add_argument("--profile")
    options.add_argument(str(profile))
    options.add_argument("--marionette-port")
    options.add_argument(str(free_port()))
    options.set_preference("browser.shell.checkDefaultBrowser", False)
    options.set_preference("browser.startup.page", 0)
    options.set_preference("datareporting.policy.dataSubmissionEnabled", False)
    options.set_preference("toolkit.telemetry.reportingpolicy.firstRun", False)
    return options


def read_json(path: Path, label: str) -> dict:
    require(path.is_file(), f"{label} exists", str(path))
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise AssertionError(f"FAIL {label} is readable JSON: {exc}") from exc


def registered_addon(profile: Path) -> dict:
    registry = read_json(profile / "extensions.json", "Firefox extensions registry")
    matches = [item for item in registry.get("addons", []) if item.get("id") == EXPECTED_ADDON_ID]
    require(len(matches) == 1, "Webspaces has one Firefox registry entry", str(len(matches)))
    return matches[0]


def assert_registered(profile: Path, phase: str) -> dict:
    addon = registered_addon(profile)
    require(addon.get("active") is True, f"{phase} Webspaces active in Firefox registry")
    require(addon.get("type") == "extension", f"{phase} Webspaces registered as extension", str(addon.get("type")))
    require(addon.get("version") == "0.1.14", f"{phase} Webspaces registry version", str(addon.get("version")))
    path_value = str(addon.get("path") or addon.get("rootURI") or "")
    require(bool(path_value), f"{phase} Webspaces registry records installed location")
    return addon


def assert_persistent_extension_file(profile: Path, phase: str) -> Path:
    candidates = [
        profile / "extensions" / f"{EXPECTED_ADDON_ID}.xpi",
        profile / "extensions" / EXPECTED_ADDON_ID,
    ]
    existing = [path for path in candidates if path.exists()]
    require(bool(existing), f"{phase} persistent Webspaces install exists in profile", str(candidates))
    return existing[0]


def read_container_identities(profile: Path) -> list[dict]:
    payload = read_json(profile / "containers.json", "Firefox contextual-identity registry")
    identities = payload.get("identities", [])
    require(isinstance(identities, list), "Firefox contextual-identity registry is readable")
    return identities


def assert_builtin_identities(profile: Path, phase: str) -> dict[str, int]:
    identities = read_container_identities(profile)
    by_name = {
        str(item.get("name", "")): item
        for item in identities
        if str(item.get("name", "")) in EXPECTED_BUILT_INS
    }
    missing = sorted(EXPECTED_BUILT_INS - set(by_name))
    require(not missing, f"{phase} six built-in Webspace identities persist", ", ".join(missing))
    require(len(by_name) == 6, f"{phase} six built-in Firefox identities found", str(sorted(by_name)))

    context_ids: dict[str, int] = {}
    for name in sorted(EXPECTED_BUILT_INS):
        raw = by_name[name].get("userContextId")
        require(isinstance(raw, int) and raw > 0, f"{phase} {name} has valid Firefox userContextId", str(raw))
        context_ids[name] = raw
    require(
        len(set(context_ids.values())) == 6,
        f"{phase} built-in Firefox identities are distinct",
        str(context_ids),
    )
    return context_ids


def main() -> int:
    if len(sys.argv) != 2:
        raise SystemExit("usage: signed_restart_smoke.py /path/to/mozilla-signed-goreecloud-webspaces.xpi")

    xpi = Path(sys.argv[1]).resolve()
    require(xpi.is_file(), "signed XPI exists", str(xpi))

    with tempfile.TemporaryDirectory(prefix="webspaces-signed-profile-") as profile_tmp:
        profile = Path(profile_tmp)
        first: webdriver.Firefox | None = None
        second: webdriver.Firefox | None = None
        try:
            first = webdriver.Firefox(options=firefox_options(profile))
            addon_id = first.install_addon(str(xpi), temporary=False)
            require(addon_id == EXPECTED_ADDON_ID, "persistent signed installation", str(addon_id))
            # Give the extension background event page time to reconcile built-ins
            # and Firefox time to flush profile state before the full process exit.
            time.sleep(3.0)
            first.quit()
            first = None

            pre_addon = assert_registered(profile, "pre-restart")
            pre_install_path = assert_persistent_extension_file(profile, "pre-restart")
            pre_context_ids = assert_builtin_identities(profile, "pre-restart")

            time.sleep(1.0)
            second = webdriver.Firefox(options=firefox_options(profile))
            # Deliberately do not call install_addon here. Everything observed after
            # this process exits must come from the signed add-on already persisted
            # in the same Firefox profile.
            time.sleep(3.0)
            second.quit()
            second = None

            post_addon = assert_registered(profile, "post-restart")
            post_install_path = assert_persistent_extension_file(profile, "post-restart")
            post_context_ids = assert_builtin_identities(profile, "post-restart")

            require(
                pre_context_ids == post_context_ids,
                "built-in Firefox contextual identities survive restart unchanged",
                f"before={pre_context_ids} after={post_context_ids}",
            )
            require(
                pre_install_path == post_install_path,
                "persistent Webspaces install path survives restart",
                f"before={pre_install_path} after={post_install_path}",
            )
            require(
                str(pre_addon.get("path") or pre_addon.get("rootURI"))
                == str(post_addon.get("path") or post_addon.get("rootURI")),
                "Firefox registry installation location survives restart",
            )
            require(True, "signed GoreeCloud Webspaces survived full Firefox restart")
        finally:
            if first is not None:
                first.quit()
            if second is not None:
                second.quit()

    print("Signed GoreeCloud Webspaces persistent-install restart acceptance passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
