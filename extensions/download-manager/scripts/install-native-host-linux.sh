#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SOURCE_HOST="$ROOT/scripts/native-host/goreecloud_download_manager_native.py"
TEMPLATE="$ROOT/scripts/native-host/goreecloud_download_manager.json.in"
INSTALL_DIR="${GOREECLOUD_DOWNLOAD_MANAGER_INSTALL_DIR:-$HOME/.local/lib/goreecloud-download-manager}"
HOST="$INSTALL_DIR/goreecloud_download_manager_native.py"
TARGET_DIR="${GOREECLOUD_DOWNLOAD_MANAGER_MANIFEST_DIR:-$HOME/.mozilla/native-messaging-hosts}"
TARGET="$TARGET_DIR/goreecloud_download_manager.json"

if [[ "${1:-}" == "--uninstall" ]]; then
  rm -f "$TARGET" "$HOST"
  rmdir "$INSTALL_DIR" 2>/dev/null || true
  printf 'Removed native messaging manifest: %s\n' "$TARGET"
  printf 'Removed native helper: %s\n' "$HOST"
  exit 0
fi

if [[ "${1:-}" != "" ]]; then
  printf 'Usage: %s [--uninstall]\n' "$0" >&2
  exit 2
fi

umask 022
mkdir -p "$INSTALL_DIR" "$TARGET_DIR"
install -m 0755 "$SOURCE_HOST" "$HOST"

TMP_MANIFEST="$(mktemp "$TARGET_DIR/.goreecloud_download_manager.json.XXXXXX")"
cleanup() {
  rm -f "$TMP_MANIFEST"
}
trap cleanup EXIT

python3 - "$TEMPLATE" "$TMP_MANIFEST" "$HOST" <<'PY'
import json
import sys
from pathlib import Path

source, target, host = map(Path, sys.argv[1:])
data = json.loads(source.read_text(encoding="utf-8"))
data["path"] = str(host.resolve())
target.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
PY

chmod 0644 "$TMP_MANIFEST"
mv -f "$TMP_MANIFEST" "$TARGET"
trap - EXIT

python3 -m py_compile "$HOST"

python3 - "$HOST" <<'PY'
import json
import struct
import subprocess
import sys

EXPECTED_VERSION = "0.2.10"
EXPECTED_PROTOCOL = 2
REQUIRED_CAPABILITIES = {
    "segmented-range-integrity",
    "same-job-recovery",
    "no-overwrite-publish",
    "ephemeral-request-headers",
    "staging-link-rejection",
}


def read_message(stream, label):
    header = stream.read(4)
    if len(header) != 4:
        raise SystemExit(f"{label} did not provide a complete Native Messaging frame header")
    length = struct.unpack("=I", header)[0]
    if length <= 0 or length > 16 * 1024 * 1024:
        raise SystemExit(f"{label} returned an invalid Native Messaging payload length: {length}")
    payload = stream.read(length)
    if len(payload) != length:
        raise SystemExit(f"{label} returned a truncated Native Messaging payload")
    try:
        return json.loads(payload.decode("utf-8"))
    except Exception as exc:
        raise SystemExit(f"{label} returned invalid JSON: {exc}") from exc


def validate_hello(value, label):
    if not isinstance(value, dict) or value.get("type") != "hello":
        raise SystemExit(f"Unexpected {label}: {value!r}")
    if value.get("version") != EXPECTED_VERSION:
        raise SystemExit(
            f"{label} version mismatch: expected {EXPECTED_VERSION}, got {value.get('version')!r}"
        )
    if value.get("protocolVersion") != EXPECTED_PROTOCOL:
        raise SystemExit(
            f"{label} protocol mismatch: expected {EXPECTED_PROTOCOL}, got {value.get('protocolVersion')!r}"
        )
    capabilities = {str(item) for item in value.get("capabilities", []) if item}
    missing = sorted(REQUIRED_CAPABILITIES - capabilities)
    if missing:
        raise SystemExit(f"{label} is missing required native capabilities: {', '.join(missing)}")


host = sys.argv[1]
process = subprocess.Popen(
    [host],
    stdin=subprocess.PIPE,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
)
try:
    try:
        hello = read_message(process.stdout, "Native host startup handshake")
    except SystemExit as exc:
        stderr = process.stderr.read().decode(errors="replace")
        if stderr:
            raise SystemExit(f"{exc}; helper stderr: {stderr}") from exc
        raise
    validate_hello(hello, "Native host startup handshake")

    payload = json.dumps({"type": "ping"}).encode()
    process.stdin.write(struct.pack("=I", len(payload)))
    process.stdin.write(payload)
    process.stdin.flush()

    reply = read_message(process.stdout, "Native host ping reply")
    validate_hello(reply, "Native host ping reply")
finally:
    process.terminate()
    try:
        process.wait(timeout=2)
    except subprocess.TimeoutExpired:
        process.kill()
PY

printf 'Installed native messaging manifest: %s\n' "$TARGET"
printf 'Native host: %s\n' "$HOST"
printf 'Firefox add-on ID: download-manager@goreecloud.com\n'
printf 'Native host version/protocol self-test: PASS (0.2.10 / protocol 2)\n'

if command -v flatpak >/dev/null 2>&1 && flatpak info org.mozilla.firefox >/dev/null 2>&1; then
  printf '\nFirefox Flatpak detected: org.mozilla.firefox\n'
  if command -v gdbus >/dev/null 2>&1 && gdbus introspect \
      --session \
      --dest org.freedesktop.portal.Desktop \
      --object-path /org/freedesktop/portal/desktop 2>/dev/null \
      | grep -q 'org.freedesktop.portal.WebExtensions'; then
    printf 'WebExtensions XDG portal: PASS\n'
  else
    printf 'WebExtensions XDG portal: NOT DETECTED\n' >&2
  fi
  printf '%s\n' 'If Firefox still cannot discover the helper, open about:config and set widget.use-xdg-desktop-portal.native-messaging to 1, then restart Firefox and approve the WebExtensions portal prompt.'
fi
