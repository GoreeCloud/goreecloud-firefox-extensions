# Native Concurrency Acceptance — GoreeCloud Download Manager Extension

## Status

Accepted runtime evidence for the unsigned 0.2.3 source candidate on Mozilla Firefox 155.0.1 from Flathub Flatpak.

This document records one narrow acceptance gate: native segmented batch scheduling at a configured global download-job concurrency limit of three. It does not represent Firefox-engine acceptance, mixed-engine acceptance, Mozilla signing, Release Candidate status, or Stable status.

## Controlled environment

The test used `extensions/download-manager/tests/concurrency_test_server.py` from canonical repository main. The server exposes eight deterministic 64 MiB payload URLs and records live HTTP request concurrency through `/status`.

The extension Manager was exercised against the first five controlled URLs. The completed Manager state showed all five controlled files as `complete`, each at `64.0 MB / 64.0 MB`, with the engine badge `native · 8 segments`.

## Captured server evidence

Before active transfer observation, `/status` reported an empty baseline:

```json
{
  "activePaths": {},
  "activeRequests": 0,
  "peakRequests": 0,
  "requestCounts": {}
}
```

During the controlled batch, `/status` reported:

```json
{
  "activePaths": {
    "/goreecloud-concurrency-01.bin": 8,
    "/goreecloud-concurrency-02.bin": 8,
    "/goreecloud-concurrency-03.bin": 8
  },
  "activeRequests": 24,
  "peakRequests": 24,
  "requestCounts": {
    "/goreecloud-concurrency-01.bin": 8,
    "/goreecloud-concurrency-02.bin": 8,
    "/goreecloud-concurrency-03.bin": 8
  }
}
```

No requests for controlled jobs 04 or 05 were present in that captured active sample.

## Acceptance interpretation

The captured server state establishes that exactly three native download jobs were active at the sampled point while each job used eight native range workers. The resulting 24 simultaneous HTTP requests therefore correspond to **3 active GoreeCloud jobs × 8 native segment workers**, not 24 scheduler jobs.

The absence of requests for jobs 04 and 05 in the active sample is consistent with the configured global `maxConcurrent = 3` scheduler holding later batch jobs until a job slot became available. The completed Manager state then showed controlled jobs 01 through 05 all finished successfully as native eight-segment jobs.

This accepts the following behavior for the tested environment:

- batch submission can progress through more jobs than the configured active-job limit;
- the global scheduler enforces a three-job active ceiling for the observed native batch;
- native segment workers do not each consume a global managed-job slot;
- three native jobs can each use eight concurrent segment workers at the same time; and
- the five observed controlled native jobs reached the complete state.

## Not accepted by this evidence

This run does **not** establish:

- Firefox downloads-engine queue concurrency;
- browser-engine pause, queue-slot promotion, and resume behavior;
- mixed Firefox/native global scheduler behavior;
- completion-notification acceptance;
- independent SHA-256 verification of the five 64 MiB outputs;
- persistent signed installation or full-browser restart recovery;
- Mozilla signing, Release Candidate qualification, or Stable promotion.

Those remain separate acceptance gates.
