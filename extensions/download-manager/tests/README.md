# Download Manager test scope

Automated tests under this directory cover native helper core behavior, recovery/controller contracts, optional-permission contracts, source-level installer behavior, controlled HTTP fixtures, and the Firefox downloads-engine scheduler regression. Target-environment acceptance remains manual only where a real Firefox build, Flatpak/XDG portal authorization, persistent signed installation, or other inaccessible local runtime state is required.

## Accepted Firefox 155.0.1 / Flathub Flatpak evidence

The tested target environment has already accepted:

1. temporary unsigned XPI loading with add-on ID `download-manager@goreecloud.com`;
2. popup, Manager, Settings, and Manifest V3 background startup;
3. Linux native-host protocol self-test and Firefox WebExtensions portal authorization;
4. native 8-segment HTTP range transfer, live pause/resume, exact SHA-256 integrity, and staging cleanup;
5. same-job recovery after deliberate native-helper interruption;
6. non-persistent Firefox background-context recreation recovery;
7. collision-safe native destination naming;
8. the controlled cookie-authenticated native path, including eight authenticated HTTP 206 ranges, exact final integrity, and controlled credential non-persistence checks in both native staging and `browser.storage.local`;
9. native batch scheduler concurrency with `maxConcurrent = 3`: a captured `/status` sample showed exactly three active native jobs, each with eight HTTP Range workers, for 24 active requests total, while controlled jobs 04 and 05 had not yet issued requests;
10. exact integrity for all five completed controlled native-concurrency outputs; and
11. the initial Firefox downloads-engine three-job queue ceiling and completion-driven queue promotion.

Detailed evidence is recorded under `../docs/`.

Full-browser restart recovery remains gated on a persistent signed installation.

## Automated Firefox scheduler regression

Run the browser-engine scheduler regression directly with Node:

```bash
node extensions/download-manager/tests/test_browser_scheduler.js
```

The test evaluates the real extension background scripts in a Node VM with a mocked Firefox WebExtensions API and in-memory extension storage. It validates:

- five Firefox jobs at `maxConcurrent = 3` produce three active jobs and two queued jobs;
- pausing one active Firefox job promotes exactly one queued job;
- resuming that paused job while all three slots are occupied leaves it queued instead of creating a fourth active job;
- Firefox's underlying paused snapshot and `USER_CANCELED` delta cannot overwrite GoreeCloud's managed queued-resume state;
- opening a scheduler slot resumes the existing Firefox download ID rather than creating a replacement download; and
- Firefox completion notification emission remains functional.

The repository workflow executes this automatically as **Test Download Manager Firefox scheduler**.

## Controlled queue/concurrency server

Use `concurrency_test_server.py` for observable Firefox/native runtime concurrency testing. It exposes eight deterministic 64 MiB downloads with distinct filenames on `127.0.0.1:8767` by default.

Full Firefox-engine GET requests and native HTTP Range requests use separate throttling so jobs stay active long enough to inspect queue behavior. The server records active request counts and exposes them at `/status`.

Start it with:

```bash
python3 extensions/download-manager/tests/concurrency_test_server.py
```

Inspect live request state from a second terminal:

```bash
curl -s http://127.0.0.1:8767/status
```

Reset only the in-memory counters between test phases with:

```bash
curl -s http://127.0.0.1:8767/reset
```

### Native-engine acceptance already observed

With a configured global managed-download limit of three, the controlled native batch produced an active server sample containing only jobs 01, 02, and 03, with eight HTTP Range workers per job. `activeRequests` and `peakRequests` were both 24. This accepts the job-level scheduler ceiling for the observed native batch and confirms native segment workers do not each consume a global managed-job slot.

All five resulting 64 MiB native outputs matched the deterministic source SHA-256 exactly.

### Firefox-engine acceptance and source-level hardening

Runtime evidence established the initial Firefox-engine 3-active / 2-queued ceiling and completion-driven slot promotion. Subsequent manual timing attempts exposed a managed-state defect: a resumed Firefox job waiting for a full scheduler could be rewritten from GoreeCloud `queued` back to Firefox `paused` by snapshot refresh.

0.2.4 hardens that state boundary and moves the timing-sensitive pause/resume scheduler check into the automated mocked-Firefox regression described above.

### Mixed-engine acceptance target

After the 0.2.4 scheduler hardening is accepted in source CI, mixed native/Firefox jobs remain a separate stress gate. The global scheduler must enforce the configured **download-job** limit across both engines; native segment workers do not each consume a global job slot. The Manager engine badges remain the authoritative UI evidence for which engine each managed job uses.

Passing source CI does not replace Mozilla signing, persistent signed installation, or full-browser restart acceptance.
