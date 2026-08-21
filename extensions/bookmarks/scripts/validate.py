#!/usr/bin/env python3
import json
from pathlib import Path

root = Path(__file__).resolve().parents[1]
manifest = json.loads((root / 'manifest.json').read_text())
assert manifest['manifest_version'] == 3
assert manifest['name'] == 'GoreeCloud Bookmarks'
assert manifest['version'] == '0.1.1'
assert manifest['browser_specific_settings']['gecko']['id'] == 'goreecloud-bookmarks@goreecloud.com'
assert manifest['host_permissions'] == ['https://bookmarks.goreecloud.com/*']
assert set(manifest['permissions']) == {'activeTab', 'storage'}
assert manifest['options_ui']['page'] == 'options.html'
for required in [
    'popup.html', 'popup.js', 'options.html', 'options.js', 'styles.css',
    'README.md', 'PRIVACY.md', 'SECURITY.md'
]:
    assert (root / required).is_file(), required

popup = (root / 'popup.js').read_text()
assert '/api/v1/bookmarks/extension-capture' in popup
assert '/api/v1/collections' in popup
assert 'Authorization' in popup
assert 'credentials' in popup
assert 'collectionId' in popup

options = (root / 'options.js').read_text()
assert 'browser.storage.local' in options
assert 'goreecloudBookmarksAccessToken' in options

print('GoreeCloud Bookmarks Firefox source validation passed.')
