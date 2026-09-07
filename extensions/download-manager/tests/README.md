# Download Manager test scope

Automated tests under this directory cover native helper core behavior, recovery/controller contracts, optional-permission contracts, and source-level installer behavior. Target-environment acceptance remains manual where Firefox, Flatpak/XDG portal authorization, notifications, and real browser/native transfer behavior are involved.

## Accepted Firefox 155.0.1 / Flathub Flatpak evidence

The tested target environment has already accepted:

1. temporary unsigned XPI loading with add-on ID `download-manager@goreecloud.com`;
2. popup, Manager, Settings, and Manifest V3 background startup;
3. Linux native-host protocol self-test and Firefox WebExtensions portal authorization;
4. native 8-segment HTTP range transfer, live pause/resume, exact SHA-256 integrity, and staging cleanup;
5. same-job recovery after deliberate native-helper interruption;
6. non-persistent Firefox background-context recreation recovery;
7. collision-safe native destination naming; and
8. the 0.2.3 controlled cookie-authenticated native path, including eight authenticated HTTP 206 ranges, exact final integrity, and controlled credential non-persistence checks in both native staging and `browser.storage.local`.

Full-browser restart recovery remains gated on a persistent signed installation.

## Controlled queue/concurrency server

Use `concurrency_test_server.py` for browser-engine queue/pause/resume/notification acceptance and later mixed-engine concurrency stress. It exposes eight deterministic 64 MiB downloads with distinct filenames on `127.0.0.1:8767` by default.

Full Firefox-engine GET requests and native HTTP Range requests use separate throttling so jobs stay active long enough to inspect queue behavior. The server records active request counts and exposes them at `/status`.

Start it with:

```bash
python3 extensions/download-manager/tests/concurrency_test_server.py
```

The server prints eight URLs:

```text
http://127.0.0.1:8767/goreecloud-concurrency-01.bin
...
http://127.0.0.1:8767/goreecloud-concurrency-08.bin
```

Inspect live request state from a second terminal:

```bash
curl -s http://127.0.0.1:8767/status
```

Reset only the in-memory counters between test phases with:

```bash
curl -s http://127.0.0.1:8767/reset
```

### Browser-engine acceptance target

With **Firefox downloads** selected and **Concurrent downloads = 3**, batch-queue five controlled URLs. Before any completes, the Manager must show exactly three active jobs and two queued jobs. `/status` should normally show three active full-body requests.

Pause one active browser job. The paused job must relinquish its scheduler slot and one previously queued job must become active. Resume the paused job while all three slots are occupied; it must remain queued until a slot becomes available, then resume the existing Firefox download rather than creating a duplicate managed job.

Allow all jobs to finish. Confirm the Manager reaches five completed jobs, Firefox completion notifications appear when enabled, and all five destination files have the server-reported SHA-256.

### Mixed-engine acceptance target

After browser-only behavior is accepted, queue native and Firefox jobs in separate phases so each job snapshots its intended engine. The global scheduler must enforce the configured **download-job** limit across both engines; native segment workers do not each consume a global job slot. The Manager engine badges are the authoritative UI evidence for which engine each managed job uses.

Passing source CI does not replace target-environment acceptance or Mozilla signing.
