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

host = sys.argv[1]
process = subprocess.Popen(
    [host],
    stdin=subprocess.PIPE,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
)
try:
    header = process.stdout.read(4)
    if len(header) != 4:
        stderr = process.stderr.read().decode(errors="replace")
        raise SystemExit(f"Native host handshake failed: {stderr}")
    length = struct.unpack("<I", header)[0]
    hello = json.loads(process.stdout.read(length))
    if hello.get("type") != "hello":
        raise SystemExit(f"Unexpected native host handshake: {hello!r}")

    payload = json.dumps({"type": "ping"}).encode()
    process.stdin.write(struct.pack("<I", len(payload)))
    process.stdin.write(payload)
    process.stdin.flush()

    header = process.stdout.read(4)
    if len(header) != 4:
        raise SystemExit("Native host did not answer ping")
    length = struct.unpack("<I", header)[0]
    reply = json.loads(process.stdout.read(length))
    if reply.get("type") != "hello":
        raise SystemExit(f"Unexpected native host ping reply: {reply!r}")
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
printf 'Native host protocol self-test: PASS\n'

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
