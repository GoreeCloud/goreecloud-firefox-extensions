# Download Manager test scope

Automated tests cover native-helper core behavior, binary segmented assembly/publication, recovery/controller contracts, optional-permission contracts, installer behavior, controlled HTTP fixtures, Firefox downloads-engine scheduling, mixed Firefox/native scheduling, lifecycle-fault ordering, native protocol compatibility, persisted staging metadata trust, staging filesystem safety, and lifecycle-neutral packaged release labeling.

Target-environment acceptance remains separate when a real Firefox build, Native Messaging integration, persistent Mozilla-signed installation, or full browser-process restart is required.

## Stable 0.2.12 signed-runtime acceptance

GoreeCloud Download Manager Extension **0.2.12 is Stable**. Governed run `34176105690` exercised the exact Mozilla-signed artifact on Firefox 155.0.1 and accepted:

1. exact source revision `2cc6d3bbe6ec2c63d49bec338bd68f154747be70`;
2. deterministic candidate SHA-256 `779425b150921c1969462066a3e79cb345d976d11369a6891b5611c63a3d5537`;
3. Mozilla-signed XPI SHA-256 `4c02a152a258c4f8e76581ece2cb2a41f088463a4464354da0c374dfb2957f25`;
4. signed non-manifest payload byte parity with the candidate;
5. persistent non-temporary installation;
6. accepted native helper 0.2.11 / protocol 2 handshake;
7. a native eight-segment transfer with validated partial staging before browser exit;
8. full Firefox process termination and restart using the same profile without reinstalling;
9. signed extension survival after restart;
10. automatic same-job recovery through HTTP Range requests beginning inside preserved segments;
11. completion at 67,108,864 bytes;
12. source/recovered SHA-256 equality at `a4a99d83daaac4823006cd3b14df26d1a256042591ad7d2f83e7ecbb203c342f`;
13. cleanup of the original job staging directory;
14. post-restart native-helper reconnection; and
15. **zero manual Resume actions** after restart.

The retained signed artifact is `goreecloud-download-manager-0.2.12-mozilla-signed`, artifact ID `10037385022`, artifact ZIP SHA-256 `17ba5f469b04979f5405f618abae5fc461e4e5c583f10e2d6484fe9706b6e747`.

## Why 0.2.12 followed 0.2.11

Signed 0.2.10 proved persistent installation and same-job preserved-range recovery but failed final publication because `assembled.part` was opened as text while binary chunks were written.

Helper 0.2.11 corrected the path to binary-exclusive `xb` mode and gained a deterministic binary-publication regression. Signed extension 0.2.11 then passed the full restart/recovery gate, but its packaged Settings page still visibly identified itself as a `source candidate`. GoreeCloud withheld Stable promotion rather than modifying an already-signed release.

0.2.12 advances only the Firefox extension version and packaged Settings label. The label is lifecycle-neutral, and `test_native_protocol_contract.py` now rejects embedded `source candidate`, `not Stable`, or hard-coded Stable wording in the packaged Settings heading. The accepted native helper remains 0.2.11 / protocol 2.

## Accepted earlier target-runtime evidence

Firefox 155.0.1 / Flathub Flatpak testing also accepted:

- popup, Manager, Settings, and Manifest V3 background startup;
- Firefox WebExtensions portal native-host authorization;
- native segmented transfer with live pause/resume and exact integrity;
- same-job recovery after deliberate helper interruption;
- non-persistent background-context recreation recovery;
- collision-safe native destination naming;
- controlled cookie-authenticated native transfer and credential non-persistence;
- native batch scheduling with `maxConcurrent = 3` and five-file integrity; and
- the Firefox downloads-engine three-job queue ceiling and completion-driven promotion.

Detailed historical evidence is retained under `../docs/` and in the product changelog.

## Persisted staging metadata regressions

`test_native_core.py` verifies that staged partial bytes are not reusable without a trusted metadata record. Coverage includes missing metadata/orphaned parts, malformed/non-object JSON, unsupported schema versions, foreign job identity, invalid transport URL, invalid source-size/destination values, and valid same-job partial preservation when source identity still matches.

Separate staging-link tests cover symlink rejection, no-follow file handling, safe invalid-staging cleanup, and final-publication source validation.

## Scheduler and lifecycle regressions

Run the browser scheduler:

```bash
node extensions/download-manager/tests/test_browser_scheduler.js
```

Run the mixed Firefox/native scheduler:

```bash
node extensions/download-manager/tests/test_mixed_scheduler.js
```

Run lifecycle-fault coverage:

```bash
node extensions/download-manager/tests/test_lifecycle_faults.js
```

Run retry snapshot coverage:

```bash
node extensions/download-manager/tests/test_retry_snapshots.js
```

These suites cover concurrency ceilings, queue promotion, resume-while-full semantics, same-download-ID resume, cross-engine scheduling, deterministic ordering, cancellation finality, late-event/removed-job protection, launch-pending reconciliation, failure notification de-duplication, requested-filename normalization, configuration snapshot preservation, and queue-tail retry behavior.

## Evidence boundary

Passing deterministic source CI is necessary but does not replace signed runtime evidence. Stable 0.2.12 has separately passed Mozilla signing, persistent installation, full-browser restart/native same-job recovery, final integrity, staging cleanup, and release provenance gates. Future runtime versions must obtain their own evidence rather than inheriting 0.2.12 acceptance.
