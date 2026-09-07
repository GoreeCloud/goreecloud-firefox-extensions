#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HOST="$ROOT/scripts/native-host/goreecloud_download_manager_native.py"
TEMPLATE="$ROOT/scripts/native-host/goreecloud_download_manager.json.in"
TARGET_DIR="$HOME/.mozilla/native-messaging-hosts"
TARGET="$TARGET_DIR/goreecloud_download_manager.json"

mkdir -p "$TARGET_DIR"
python3 - "$TEMPLATE" "$TARGET" "$HOST" <<'PY'
import json
import sys
from pathlib import Path
source, target, host = map(Path, sys.argv[1:])
data = json.loads(source.read_text(encoding="utf-8"))
data["path"] = str(host.resolve())
target.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
PY
chmod 644 "$TARGET"
chmod +x "$HOST"
printf 'Installed native messaging manifest: %s\n' "$TARGET"
printf 'Native host: %s\n' "$HOST"
printf 'Firefox add-on ID: download-manager@goreecloud.com\n'
