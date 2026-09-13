#!/usr/bin/env python3
"""Persistent signed-install and full-restart acceptance for GoreeCloud Webspaces.

This gate deliberately requires a Mozilla-signed XPI. It installs the add-on
non-temporarily into an in-place Firefox profile, verifies the expected add-on
identity, confirms that the six built-in Firefox contextual identities exist,
fully quits Firefox, starts a second Firefox process against the same profile
without reinstalling the add-on, and verifies that the extension is still
registered and the built-in contextual identities persist.

The test does not claim to replace rendered/manual routing acceptance. It proves
the signed installation/restart boundary and persistence of Webspaces' Firefox
identity substrate; routing, popup rendering, and isolation-health semantics are
covered by the maintained source suite and release acceptance evidence.
"""

from __future__ import annotations

import json
import socket
import sys
import tempfile
import time
from pathlib import Path

from selenium import webdriver
from selenium.common.exceptions import TimeoutException
from selenium.webdriver.firefox.options import Options
from selenium.webdriver.support.ui import WebDriverWait

EXPECTED_ADDON_ID = "webspaces@goreecloud.com"
EXPECTED_NAME = "GoreeCloud Webspaces"
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


def read_extensions_registry(profile: Path) -> dict:
    path = profile / "extensions.json"
    require(path.is_file(), "Firefox extensions registry exists", str(path))
    return json.loads(path.read_text(encoding="utf-8"))


def assert_registered(profile: Path, phase: str) -> None:
    registry = read_extensions_registry(profile)
    addons = registry.get("addons", [])
    matches = [item for item in addons if item.get("id") == EXPECTED_ADDON_ID]
    require(len(matches) == 1, f"{phase} Webspaces registry entry", str(len(matches)))
    addon = matches[0]
    require(addon.get("active") is True, f"{phase} Webspaces active in Firefox registry")
    require(addon.get("type") == "extension", f"{phase} Webspaces registered as extension", str(addon.get("type")))


def read_container_identities(profile: Path) -> list[dict]:
    path = profile / "containers.json"
    require(path.is_file(), "Firefox contextual-identity registry exists", str(path))
    payload = json.loads(path.read_text(encoding="utf-8"))
    identities = payload.get("identities", [])
    require(isinstance(identities, list), "Firefox contextual-identity registry is readable")
    return identities


def assert_builtin_identities(profile: Path, phase: str) -> None:
    identities = read_container_identities(profile)
    names = {str(item.get("name", "")) for item in identities}
    missing = sorted(EXPECTED_BUILT_INS - names)
    require(not missing, f"{phase} six built-in Webspace identities persist", ", ".join(missing))
    managed = [item for item in identities if item.get("name") in EXPECTED_BUILT_INS]
    context_ids = [item.get("userContextId") for item in managed]
    require(len(context_ids) == 6, f"{phase} six built-in Firefox identities found", str(context_ids))
    require(len(set(context_ids)) == 6, f"{phase} built-in Firefox identities are distinct", str(context_ids))


def assert_about_debugging_registration(driver: webdriver.Firefox, phase: str) -> None:
    driver.get("about:debugging#/runtime/this-firefox")
    try:
        WebDriverWait(driver, 15).until(
            lambda d: EXPECTED_NAME in d.page_source and EXPECTED_ADDON_ID in d.page_source
        )
    except TimeoutException as exc:
        raise AssertionError(f"FAIL {phase} Webspaces visible in about:debugging") from exc
    require(True, f"{phase} Webspaces visible in about:debugging")


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
            time.sleep(2.0)
            assert_about_debugging_registration(first, "pre-restart")
            assert_registered(profile, "pre-restart")
            assert_builtin_identities(profile, "pre-restart")
            first.quit()
            first = None

            time.sleep(1.0)
            second = webdriver.Firefox(options=firefox_options(profile))
            # Deliberately do not call install_addon again. Everything observed in
            # this process must come from the add-on that persisted in the profile.
            time.sleep(2.0)
            assert_about_debugging_registration(second, "post-restart")
            assert_registered(profile, "post-restart")
            assert_builtin_identities(profile, "post-restart")
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
