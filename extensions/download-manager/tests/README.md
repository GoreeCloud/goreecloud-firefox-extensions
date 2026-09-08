# Download Manager test scope

Automated tests under this directory cover native-helper core behavior, binary segmented assembly/publication, recovery/controller contracts, optional-permission contracts, installer behavior, controlled HTTP fixtures, Firefox downloads-engine scheduling, mixed Firefox/native scheduling, lifecycle-fault ordering, native protocol compatibility, persisted staging metadata trust, and staging filesystem safety.

Target-environment acceptance is kept separate when a real Firefox build, Native Messaging integration, persistent Mozilla-signed installation, or full browser-process restart is required.

## Accepted Firefox 155.0.1 / Flathub Flatpak evidence

The tested target environment has accepted:

1. temporary unsigned XPI loading with add-on ID `download-manager@goreecloud.com`;
2. popup, Manager, Settings, and Manifest V3 background startup;
3. Linux native-host protocol self-test and Firefox WebExtensions portal authorization;
4. native 8-segment HTTP range transfer, live pause/resume, exact SHA-256 integrity, and staging cleanup;
5. same-job recovery after deliberate native-helper interruption;
6. non-persistent Firefox background-context recreation recovery;
7. collision-safe native destination naming;
8. the controlled cookie-authenticated native path, including eight authenticated HTTP 206 ranges, exact final integrity, and controlled credential non-persistence checks in both native staging and `browser.storage.local`;
9. native batch scheduler concurrency with `maxConcurrent = 3`;
10. exact integrity for all five completed controlled native-concurrency outputs; and
11. the initial Firefox downloads-engine three-job queue ceiling and completion-driven queue promotion.

Detailed target-runtime evidence is recorded under `../docs/`.

## Signed full-browser restart evidence and 0.2.11 regression

The governed Mozilla-signed 0.2.10 restart run established several important runtime facts but did **not** pass the release gate. It proved persistent signed installation, survival across a new Firefox process without reinstalling, preservation of the exact GoreeCloud job identity and partial staging, startup recovery dispatch, resumed HTTP Range requests inside preserved segments, and recovery of all 67,108,864 source bytes.

Final segmented publication then failed with:

```text
TypeError: write() argument must be str, not bytes
```

The root cause was the native helper opening `assembled.part` in text-exclusive mode while writing binary segment chunks. 0.2.11 changes that assembly stream to binary-exclusive `xb` mode while retaining exclusive-create and no-follow protections.

`test_native_core.py` now includes a deterministic regression that prebuilds completed binary segments, exercises the actual assembly/publication path, and verifies byte-for-byte committed output. The 0.2.11 helper is the minimum compatible protocol-2 helper, so 0.2.10 is rejected despite speaking the same protocol.

A fresh Mozilla-signed 0.2.11 full-browser restart run remains mandatory before Stable promotion.

## Persisted staging metadata regressions

`test_native_core.py` verifies that staged partial bytes are not reusable without a trusted metadata record. Coverage includes:

- missing `metadata.json` with orphaned partial files;
- malformed or non-object JSON;
- unsupported metadata schema version;
- metadata for a different GoreeCloud job ID;
- invalid persisted transport URL;
- invalid source-size or destination-field types; and
- valid same-job metadata preserving reusable partial bytes when current source identity still matches.

These tests validate the structural trust boundary before URL, known source length, ETag, and Last-Modified source-identity comparisons. Separate filesystem tests cover staging symlink/no-follow behavior.

## Automated Firefox scheduler regression

Run:

```bash
node extensions/download-manager/tests/test_browser_scheduler.js
```

The test evaluates the real extension background scripts in a Node VM with a mocked Firefox WebExtensions API and in-memory extension storage. It validates the three-active ceiling, queued promotion, resume-while-full behavior, protection from stale paused snapshots and `USER_CANCELED` noise, reuse of the existing Firefox download ID, and completion notifications.

## Automated mixed-engine scheduler regression

Run:

```bash
node extensions/download-manager/tests/test_mixed_scheduler.js
```

This deterministic harness exercises Firefox and native jobs under the same managed `maxConcurrent` ceiling. It verifies cross-engine slot promotion, resume-while-full queue retention, same-Firefox-download-ID resume, native promotion when a browser slot is released, engine assignment preservation, protocol-compatible native-helper handshake, and notification behavior. Native segment workers remain internal to their managed native job rather than consuming the global job slots individually.

## Automated lifecycle-fault regression

Run:

```bash
node extensions/download-manager/tests/test_lifecycle_faults.js
```

The harness uses the real background scripts with mocked Firefox and Native Messaging APIs and deliberately hostile asynchronous ordering. It verifies deterministic FIFO tie ordering, explicit cancellation finality, late-event protection, removed-job protection, retry normalization and queue placement, compatible native-status behavior, failure-notification de-duplication, and stale Native Messaging event suppression.

## Automated retry-snapshot regression

Run:

```bash
node extensions/download-manager/tests/test_retry_snapshots.js
```

The retry suite verifies safe requested-filename normalization, absolute/traversal/UNC reduction, clean relative-subdirectory preservation, engine/configuration snapshot preservation across Settings drift, native segment/retry/directory snapshot preservation, legacy destination compatibility, and queue-tail sequencing.

## Controlled queue/concurrency server

Use `concurrency_test_server.py` for observable Firefox/native runtime concurrency testing. It exposes deterministic 64 MiB downloads with distinct filenames on `127.0.0.1:8767` by default and records active request counts at `/status`.

```bash
python3 extensions/download-manager/tests/concurrency_test_server.py
curl -s http://127.0.0.1:8767/status
```

With a configured global managed-download limit of three, the controlled native batch produced an active sample containing only jobs 01, 02, and 03, with eight HTTP Range workers per job. All five resulting native outputs matched the deterministic source SHA-256 exactly.

## Evidence boundary

Passing deterministic source CI is necessary but does not replace Mozilla signing, persistent signed installation, full-browser restart/native-host recovery, exact final-file integrity, or another target-runtime gate that genuinely requires the packaged signed system. Diagnostic failures remain recorded as failures rather than being reclassified as acceptance.
