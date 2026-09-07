# Firefox Engine Concurrency Acceptance — GoreeCloud Download Manager Extension

## Status

Accepted runtime evidence for the unsigned 0.2.3 source candidate on Mozilla Firefox 155.0.1 from Flathub Flatpak.

This document records the initial Firefox downloads-engine queue concurrency gate and completion-driven queue-slot promotion at a configured global managed-download limit of three. It does not yet accept browser-engine pause/resume slot behavior, completion notifications, mixed-engine concurrency, Mozilla signing, Release Candidate status, or Stable status.

## Controlled environment

The test used `extensions/download-manager/tests/concurrency_test_server.py` from canonical repository main. The server exposes deterministic 64 MiB HTTP endpoints and reports live request concurrency through `/status`.

Extension settings for the run were:

- Download engine: Firefox downloads — maximum compatibility
- Concurrent downloads: 3
- Controlled batch: `goreecloud-concurrency-01.bin` through `goreecloud-concurrency-05.bin`

## Initial managed queue evidence

Immediately after the five-URL batch was queued, the Manager showed:

- Active: 3
- Queued: 2
- Completed: 0
- active files `01`, `02`, and `03` with `Firefox` engine badges
- queued files `04` and `05`, also assigned to the Firefox engine

At the same observation point, `/status` reported:

```json
{
  "activePaths": {
    "/goreecloud-concurrency-01.bin": 1,
    "/goreecloud-concurrency-02.bin": 1,
    "/goreecloud-concurrency-03.bin": 1
  },
  "activeRequests": 3,
  "peakRequests": 3,
  "requestCounts": {
    "/goreecloud-concurrency-01.bin": 1,
    "/goreecloud-concurrency-02.bin": 1,
    "/goreecloud-concurrency-03.bin": 1
  }
}
```

The same three-request state was captured again while those initial jobs remained active.

## Completion-driven slot promotion evidence

A later Manager state showed:

- files `01`, `02`, and `03` complete at 64.0 MiB each;
- files `04` and `05` in progress with `Firefox` engine badges;
- no queued jobs remaining.

The corresponding later `/status` sample reported:

```json
{
  "activePaths": {
    "/goreecloud-concurrency-04.bin": 1,
    "/goreecloud-concurrency-05.bin": 1
  },
  "activeRequests": 2,
  "peakRequests": 3,
  "requestCounts": {
    "/goreecloud-concurrency-01.bin": 1,
    "/goreecloud-concurrency-02.bin": 1,
    "/goreecloud-concurrency-03.bin": 1,
    "/goreecloud-concurrency-04.bin": 1,
    "/goreecloud-concurrency-05.bin": 1
  }
}
```

This demonstrates that jobs `04` and `05` did not start until managed slots became available after earlier Firefox-engine jobs completed, and that the observed HTTP request peak remained three.

## Acceptance interpretation

This evidence accepts the following behavior for the tested environment:

- five Firefox-engine jobs can be queued as one managed batch;
- with `maxConcurrent = 3`, exactly three jobs become active while two remain queued;
- each active Firefox-engine job maps to one full-body server request in this controlled test;
- the controlled server observed `activeRequests = 3` and `peakRequests = 3` during the initial active phase;
- queued Firefox-engine jobs are promoted when active jobs complete; and
- the scheduler did not exceed the configured three-job ceiling in the captured Firefox-engine run.

## Not yet accepted by this evidence

This run does **not** yet establish:

- pausing an active Firefox-engine job promotes exactly one queued job;
- resuming a paused Firefox-engine job while all slots are occupied waits in the queue instead of exceeding the limit;
- browser-engine pause/resume final-file integrity;
- completion/failure notification acceptance;
- mixed Firefox/native global scheduler behavior;
- persistent signed installation or full-browser restart recovery;
- Mozilla signing, Release Candidate qualification, or Stable promotion.

Those remain separate acceptance gates.
