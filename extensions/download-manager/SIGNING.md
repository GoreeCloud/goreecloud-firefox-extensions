# Mozilla Signing — GoreeCloud Download Manager Extension

## Current state

GoreeCloud Download Manager Extension **0.2.12 is Stable** for Mozilla unlisted/self-distribution. The canonical add-on ID is `download-manager@goreecloud.com`; the Linux Native Messaging host manifest authorizes that same ID.

The accepted extension release uses native helper **0.2.11 / protocol 2**. The helper version intentionally remains 0.2.11 because 0.2.12 changes only the Firefox extension version and packaged lifecycle-neutral Settings label; the already-accepted binary segmented-publication, recovery, filesystem-safety, and protocol behavior of helper 0.2.11 is unchanged.

## Accepted 0.2.12 signing evidence

Governed GitHub Actions run `34176105690` signed exact source revision `2cc6d3bbe6ec2c63d49bec338bd68f154747be70` as a **new Mozilla submission**.

- deterministic candidate SHA-256: `779425b150921c1969462066a3e79cb345d976d11369a6891b5611c63a3d5537`;
- Mozilla-signed XPI SHA-256: `4c02a152a258c4f8e76581ece2cb2a41f088463a4464354da0c374dfb2957f25`;
- retained artifact ID: `10037385022`;
- retained artifact ZIP SHA-256: `17ba5f469b04979f5405f618abae5fc461e4e5c583f10e2d6484fe9706b6e747`;
- signed non-manifest runtime payload: byte-for-byte equal to candidate;
- governed manifest normalization: JSON serialization only;
- persistent non-temporary installation: accepted;
- full Firefox 155.0.1 process restart without reinstalling: accepted;
- same-job native preserved-range recovery: accepted;
- binary-safe final publication: accepted;
- final output size: 67,108,864 bytes;
- source and recovered output SHA-256: `a4a99d83daaac4823006cd3b14df26d1a256042591ad7d2f83e7ecbb203c342f`;
- original job staging cleanup: accepted;
- post-restart helper reconnect: accepted;
- manual Resume actions after restart: `0`.

The pre-promotion run correctly recorded `sourceState: source-candidate`, `acceptedStableVersion: null`, and `stablePromoted: false`. After repository lifecycle promotion, the canonical inventory records `source_state: stable` and `accepted_stable_version: 0.2.12`. The final governed rerun is expected to recover the exact already-approved 0.2.12 artifact, repeat signed-runtime acceptance, and record `stablePromoted: true` against the final Stable main revision.

## Why 0.2.11 was not promoted

Mozilla-signed 0.2.11 passed full restart/native recovery acceptance in run `34174320808`, but the final packaged-runtime audit found that its Settings page still visibly called itself a `source candidate`. GoreeCloud deliberately withheld Stable promotion rather than modifying an already-signed version in place.

0.2.12 advances the Firefox manifest and changes the packaged Settings label to lifecycle-neutral `GoreeCloud Download Manager Extension 0.2.12`. A source regression prevents lifecycle claims from being embedded in that packaged label. No native-helper behavior changed.

## Governed signing workflow

The repository maintains `.github/workflows/download-manager-mozilla-signing.yml`. The automated signing branch `release/download-manager-signing` must point **exactly** at authoritative `main` before signing proceeds.

The workflow:

1. validates the canonical inventory, Download Manager source contracts, Python/native sources, browser/native schedulers, lifecycle faults, retry snapshots, and JavaScript syntax;
2. builds a deterministic unsigned XPI from the manifest-declared version;
3. records exact candidate SHA-256 and source revision;
4. submits the exact candidate to Mozilla's unlisted signing channel, or retrieves the exact already-approved version only when Mozilla reports that same version already exists;
5. verifies Mozilla signature material, add-on ID/version, payload inventory, non-manifest byte parity, and governed manifest normalization;
6. installs the compatible native helper from the same repository revision;
7. installs the signed XPI persistently into Firefox;
8. starts a throttled native segmented transfer, exits the complete Firefox process while validated partial staging exists, and starts a new Firefox process against the same profile without reinstalling;
9. requires signed extension survival, same-job preserved-range recovery, final exact SHA-256 integrity, staging cleanup, and helper reconnect; and
10. writes a machine-readable evidence record whose `sourceState`, `acceptedStableVersion`, and `stablePromoted` fields are derived from the canonical extension inventory.

## Release boundary

Temporary unsigned loading and deterministic packaging remain development evidence only. Stable status is version-specific and requires the accepted signed runtime plus explicit canonical lifecycle promotion. Any later Download Manager version must obtain its own applicable signing, restart/recovery, integrity, review, and promotion evidence before replacing 0.2.12 as Stable.
