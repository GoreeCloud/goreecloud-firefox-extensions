#!/usr/bin/env python3
"""Recover an already-approved unlisted AMO version for signed restart acceptance.

This helper is source-only validation/release infrastructure. It authenticates to AMO,
resolves the exact requested unlisted version, then uses Mozilla's authenticated signed
file API to retrieve the XPI without leaking the developer JWT to a redirect target.
The caller still performs archive signature-metadata and exact runtime-payload parity
checks before Firefox installation.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import re
import sys
import time
import uuid
from pathlib import Path
from urllib.error import HTTPError
from urllib.parse import quote, urlparse
from urllib.request import HTTPRedirectHandler, Request, build_opener, urlopen

ADDON_ID = "download-manager@goreecloud.com"
AMO_ORIGIN = "https://addons.mozilla.org"
USER_AGENT = "GoreeCloud-Download-Manager-Signing-Acceptance/1.0"
HEX_SHA256 = re.compile(r"^[0-9a-fA-F]{64}$")


class NoRedirect(HTTPRedirectHandler):
    """Return 30x responses to the caller instead of forwarding auth headers."""

    def redirect_request(self, req, fp, code, msg, headers, newurl):  # noqa: ANN001
        return None


def b64url(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).rstrip(b"=").decode("ascii")


def make_jwt(issuer: str, secret: str) -> str:
    now = int(time.time())
    header = {"alg": "HS256", "typ": "JWT"}
    payload = {
        "iss": issuer,
        "jti": str(uuid.uuid4()),
        "iat": now,
        "exp": now + 60,
    }
    encoded_header = b64url(json.dumps(header, separators=(",", ":")).encode("utf-8"))
    encoded_payload = b64url(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
    signing_input = f"{encoded_header}.{encoded_payload}".encode("ascii")
    signature = b64url(hmac.new(secret.encode("utf-8"), signing_input, hashlib.sha256).digest())
    return f"{encoded_header}.{encoded_payload}.{signature}"


def api_json(url: str, token: str) -> dict:
    request = Request(
        url,
        headers={
            "Authorization": f"JWT {token}",
            "Accept": "application/json",
            "User-Agent": USER_AGENT,
        },
    )
    with urlopen(request, timeout=60) as response:
        value = json.load(response)
    if not isinstance(value, dict):
        raise SystemExit(f"AMO API returned a non-object response for {url}")
    return value


def normalize_sha256(value: str | None) -> str:
    if not isinstance(value, str) or not value.lower().startswith("sha256:"):
        raise SystemExit(f"AMO existing file is missing a SHA-256 hash: {value!r}")
    digest = value.split(":", 1)[1]
    if not HEX_SHA256.fullmatch(digest):
        raise SystemExit(f"AMO existing file has malformed SHA-256 hash: {value!r}")
    return digest.lower()


def read_authenticated_signed_file(file_id: int, version: str, token: str) -> tuple[bytes, str | None, str]:
    # Mozilla's documented signed-file endpoint requires JWT authentication for
    # unlisted files. The filename is only a convenience, so use a deterministic
    # GoreeCloud label rather than trusting a provider-supplied path.
    filename = f"goreecloud-download-manager-{version}.xpi"
    api_url = f"{AMO_ORIGIN}/api/v4/file/{file_id}/{quote(filename, safe='')}"
    request = Request(
        api_url,
        headers={
            "Authorization": f"JWT {token}",
            "User-Agent": USER_AGENT,
        },
    )
    opener = build_opener(NoRedirect)
    try:
        response = opener.open(request, timeout=120)
    except HTTPError as exc:
        if exc.code not in {301, 302, 303, 307, 308}:
            raise SystemExit(f"authenticated AMO signed-file download failed: HTTP {exc.code}") from exc
        location = exc.headers.get("Location")
        target_digest = exc.headers.get("X-Target-Digest")
        if not location:
            raise SystemExit("AMO signed-file redirect omitted Location") from exc
        parsed = urlparse(location)
        if parsed.scheme != "https" or not parsed.netloc:
            raise SystemExit(f"AMO signed-file redirect is not a valid HTTPS URL: {location!r}") from exc
        # Fetch the mirror without the developer Authorization header.
        mirror_request = Request(location, headers={"User-Agent": USER_AGENT})
        with urlopen(mirror_request, timeout=120) as mirror_response:
            return mirror_response.read(), target_digest, api_url
    else:
        with response:
            return response.read(), response.headers.get("X-Target-Digest"), api_url


def verify_optional_target_digest(header_value: str | None, actual_hex: str) -> None:
    if not header_value:
        return
    value = header_value.strip()
    lowered = value.lower()
    if lowered.startswith("sha256:"):
        expected = lowered.split(":", 1)[1]
    elif HEX_SHA256.fullmatch(value):
        expected = lowered
    else:
        # The provider may use another documented representation for this auxiliary
        # redirect header. The authoritative AMO version object's sha256: hash remains
        # mandatory and is always checked by main(). Preserve the header as evidence.
        return
    if expected != actual_hex:
        raise SystemExit(
            f"AMO redirect X-Target-Digest mismatch: header={header_value!r} downloaded=sha256:{actual_hex}"
        )


def main() -> int:
    if len(sys.argv) != 3:
        raise SystemExit("usage: amo_signed_version_recovery.py VERSION OUTPUT_DIRECTORY")

    version = sys.argv[1]
    output_dir = Path(sys.argv[2])
    output_dir.mkdir(parents=True, exist_ok=True)

    issuer = os.environ.get("AMO_JWT_ISSUER", "")
    secret = os.environ.get("AMO_JWT_SECRET", "")
    if not issuer or not secret:
        raise SystemExit("AMO_JWT_ISSUER and AMO_JWT_SECRET are required")
    token = make_jwt(issuer, secret)

    detail_url = (
        f"{AMO_ORIGIN}/api/v5/addons/addon/{quote(ADDON_ID, safe='')}/"
        f"versions/{quote(version, safe='')}/"
    )
    detail = api_json(detail_url, token)
    if detail.get("version") != version:
        raise SystemExit(f"AMO version mismatch: {detail.get('version')!r}")
    if detail.get("channel") != "unlisted":
        raise SystemExit(f"AMO version is not unlisted: {detail.get('channel')!r}")

    file_info = detail.get("file") or {}
    if not isinstance(file_info, dict):
        raise SystemExit("AMO version file metadata is not an object")
    if str(file_info.get("status", "")).lower() != "public":
        raise SystemExit(f"AMO existing file is not approved/public: {file_info.get('status')!r}")
    file_id = file_info.get("id")
    if not isinstance(file_id, int) or file_id <= 0:
        raise SystemExit(f"AMO existing file has invalid id: {file_id!r}")

    expected_hash = normalize_sha256(file_info.get("hash"))
    internal_certificate = file_info.get("is_mozilla_signed_extension")
    print(f"AMO internal-certificate flag (informational): {internal_certificate!r}")

    signed_bytes, target_digest, download_api_url = read_authenticated_signed_file(
        file_id, version, token
    )
    actual_hash = hashlib.sha256(signed_bytes).hexdigest()
    if expected_hash != actual_hash:
        raise SystemExit(
            f"AMO signed-file hash mismatch: api=sha256:{expected_hash} downloaded=sha256:{actual_hash}"
        )
    verify_optional_target_digest(target_digest, actual_hash)

    target = output_dir / f"existing-{version}.xpi"
    target.write_bytes(signed_bytes)
    Path("dist/mozilla-signing-source.txt").write_text("existing-version\n", encoding="utf-8")
    Path("dist/amo-existing-version-metadata.json").write_text(
        json.dumps(
            {
                "version": version,
                "channel": detail.get("channel"),
                "fileId": file_id,
                "fileStatus": file_info.get("status"),
                "fileHash": f"sha256:{expected_hash}",
                "internalCertificateFlag": internal_certificate,
                "authenticatedDownloadApi": download_api_url,
                "redirectTargetDigest": target_digest,
            },
            indent=2,
            sort_keys=True,
        )
        + "\n",
        encoding="utf-8",
    )
    print(f"Retrieved existing approved AMO version {version}: sha256:{actual_hash}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
