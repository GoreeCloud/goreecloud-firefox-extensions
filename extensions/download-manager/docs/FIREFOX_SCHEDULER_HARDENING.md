# Firefox Scheduler Hardening — GoreeCloud Download Manager Extension 0.2.4

## Status

Source-candidate hardening for the Firefox downloads-engine scheduler. This document records assistant-performed deterministic validation and does not represent Mozilla signing, persistent-install acceptance, Release Candidate promotion, or Stable promotion.

## Defect identified

During Firefox 155.0.1 / Flathub Flatpak runtime acceptance, a paused Firefox-engine job could be requeued by GoreeCloud while all managed scheduler slots were occupied. Firefox correctly kept the underlying browser download paused until `browser.downloads.resume()` was called, but GoreeCloud's browser snapshot refresh treated Firefox's paused flag as authoritative for the managed state and rewrote the requeued job back to `paused`.

Firefox also exposed `USER_CANCELED` while a managed browser download was intentionally paused, which produced misleading failure text even though the operation was user-controlled and recoverable.

## 0.2.4 hardening

`extensions/download-manager/scheduler_hardening.js` is loaded after the existing background and recovery scripts. It preserves the distinction between:

- Firefox's underlying paused download object; and
- GoreeCloud's managed `queued` state for an existing Firefox download waiting for a scheduler slot.

When an existing browser download is requeued for resume while the scheduler is full, Firefox remains paused at the browser API level until the managed queue grants a slot. Browser snapshot refresh and paused/error deltas no longer rewrite that managed queue state back to paused. `USER_CANCELED` is suppressed while the job is intentionally paused or waiting for a resume slot.

The actual `browser.downloads.resume(downloadId)` call still occurs only when `pumpQueue()` grants a managed slot. The existing Firefox download ID is reused; GoreeCloud does not create a replacement download.

## Deterministic automated regression

`extensions/download-manager/tests/test_browser_scheduler.js` executes the real background scripts in a Node VM with a mocked Firefox WebExtensions API and persistent in-memory extension storage. It validates:

1. A five-job Firefox batch with `maxConcurrent = 3` launches exactly three downloads and leaves two queued.
2. Pausing one active Firefox job promotes one queued job, preserving three active managed jobs.
3. Resuming the paused job while all three slots remain occupied leaves it queued and does not call Firefox resume yet.
4. A Firefox paused snapshot and `USER_CANCELED` delta cannot overwrite the managed queued-resume state.
5. When one active job completes, the oldest queued existing Firefox download receives the freed slot.
6. The existing Firefox download ID is resumed rather than replaced with a new download.
7. Managed active concurrency remains at three.
8. Completion notification emission remains functional for the completed Firefox job.

The regression is executed directly in the repository workflow as `Test Download Manager Firefox scheduler`.

## Release boundary

0.2.4 remains unsigned Active Development. The automated regression replaces the timing-sensitive manual race test as the authoritative source-level scheduler check. Final persistent signed-XPI installation, full Firefox restart behavior, signed native-host integration, and remaining release-governance gates still require later acceptance before RC or Stable promotion.
