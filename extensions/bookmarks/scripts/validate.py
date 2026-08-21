#!/usr/bin/env python3
import json
from pathlib import Path

root = Path(__file__).resolve().parents[1]
manifest = json.loads((root / 'manifest.json').read_text())
assert manifest['manifest_version'] == 3
assert manifest['name'] == 'GoreeCloud Bookmarks'
assert manifest['browser_specific_settings']['gecko']['id'] == 'goreecloud-bookmarks@goreecloud.com'
assert manifest['host_permissions'] == ['https://bookmarks.goreecloud.com/*']
assert manifest['permissions'] == ['activeTab']
for required in ['popup.html','popup.js','styles.css','README.md','PRIVACY.md','SECURITY.md']:
    assert (root / required).is_file(), required
print('GoreeCloud Bookmarks Firefox source validation passed.')
