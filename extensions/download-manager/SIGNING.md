# Mozilla Signing — GoreeCloud Download Manager Extension

## Current state

GoreeCloud Download Manager Extension **0.2.11 is Stable**. The accepted Firefox artifact is Mozilla-signed and passed the governed persistent-install/full-browser-restart/native-recovery gate.

Canonical add-on ID: `download-manager@goreecloud.com`  
Native Messaging host: `goreecloud_download_manager`

## Accepted 0.2.11 release evidence

Stable acceptance is bound to the following immutable runtime evidence:

- exact signed source revision: `7a9c33e5e194a05b792c1aa902c72b72f9fdf1fe`;
- GitHub Actions signing/restart run: `34174320808`;
- Mozilla signing source: new unlisted submission;
- deterministic candidate SHA-256: `8dab36b259a2837b8218ef2b45af57f0698870a8e15424e66df54db528e34f7d`;
- Mozilla-signed XPI SHA-256: `074d901fa18d66ec5d5ee55bcacdfbf066567eec02902f5c6d2c43a361a75830`;
- retained artifact: `goreecloud-download-manager-0.2.11-mozilla-signed`, artifact ID `10036841722`;
- retained artifact ZIP SHA-256: `4b832680de6a7556c3ef9d3021e6d3b270e2f0639539757bbd531badcaca1358`.

The signed XPI contained Mozilla `META-INF/` signature material. Its non-manifest runtime payload matched the deterministic candidate byte-for-byte, and the only accepted manifest difference was governed JSON serialization normalization.

## Full-browser restart acceptance

Firefox 155.0.1 installed the Mozilla-signed XPI non-temporarily. The test started an eight-segment native transfer, captured the exact GoreeCloud job ID, confirmed validated partial staging, fully exited Firefox, then started a new Firefox process using the same profile without reinstalling the extension.

The signed extension and matching **0.2.11 / protocol 2** helper returned after restart. Startup recovery automatically resumed the same GoreeCloud job using preserved non-boundary HTTP Range offsets; no manual Resume action was required. The transfer reached 67,108,864 bytes, final segmented publication succeeded, the original staging directory was removed, and the helper reconnected after completion.

Source and recovered-output SHA-256 both equal:

`a4a99d83daaac4823006cd3b14df26d1a256042591ad7d2f83e7ecbb203c342f`

This directly closes the publication failure found in the signed 0.2.10 diagnostic run.

## Governed signing workflow

`.github/workflows/download-manager-mozilla-signing.yml` remains the release signing path. It binds the automated signing branch exactly to authoritative `main`, validates source and deterministic packaging, submits or retrieves the exact Mozilla-approved version, checks signed-payload parity, installs the matching helper, performs persistent signed installation and full-browser restart recovery, and retains the resulting provenance artifact.

Temporary unsigned loading through `about:debugging` remains development-only and must not be confused with the accepted Stable artifact.

## Future release boundary

Stable status applies specifically to **0.2.11** and the evidence above. Any later runtime change requires its own versioned source validation, applicable Platform-System review, Mozilla signing, persistent-install/restart acceptance when relevant, integrity evidence, and explicit lifecycle/documentation promotion. Source-only release metadata may reference the accepted artifact without altering its already-signed runtime bytes.
