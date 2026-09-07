(function () {
  const IMMUTABLE_TERMINAL_STATES = new Set(["complete", "cancelled"]);
  const PROBLEM_TERMINAL_STATES = new Set(["error", "interrupted"]);
  const QUEUE_SEQUENCE_KEY = "download-manager:queue-sequence";
  let queueOrderLock = Promise.resolve();

  function isBrowserResumeWaiting(job) {
    return Boolean(
      job &&
      !job.native &&
      job.engine === "browser" &&
      job.downloadId != null &&
      job.state === "queued" &&
      job.paused === false
    );
  }

  function isImmutableTerminal(job) {
    return Boolean(job && IMMUTABLE_TERMINAL_STATES.has(job.state));
  }

  function sanitizeFilenameSegment(value) {
    let segment = String(value || "")
      .replace(/[\x00-\x1f\x7f<>:"|?*]/g, "_")
      .replace(/[ .]+$/g, "");
    if (!segment || segment === "." || segment === "..") return null;
    if (/^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/i.test(segment)) {
      segment = `_${segment}`;
    }
    return segment;
  }

  function sanitizeRequestedFilename(value) {
    if (value == null || value === "") return null;
    const filename = String(value).trim();
    if (!filename) return null;

    // Firefox accepts a path relative to the download directory. Preserve clean
    // relative subdirectories, but never replay an absolute/completed path or a
    // traversal path into a new download. Backslashes are normalized first so
    // the same policy applies to Unix, Windows drive, and UNC-style inputs.
    const normalized = filename.replace(/\\/g, "/");
    const absolute = normalized.startsWith("/") || normalized.startsWith("~/") || /^[A-Za-z]:\//.test(normalized);
    const rawParts = normalized.split("/").filter(Boolean);
    const hasTraversal = rawParts.some((part) => part === "..");
    const candidateParts = absolute || hasTraversal
      ? rawParts.filter((part) => part !== "." && part !== "..").slice(-1)
      : rawParts.filter((part) => part !== ".");
    const sanitizedParts = candidateParts.map(sanitizeFilenameSegment).filter(Boolean);
    return sanitizedParts.length ? sanitizedParts.join("/") : null;
  }

  function sanitizeJobPatch(current, patch = {}) {
    const next = { ...patch };
    if (!current) return next;

    // Completion and explicit cancellation are final managed states. Late browser
    // or native progress/error events must not regress them into active/problem
    // states. The notification marker is still allowed to be recorded.
    if (isImmutableTerminal(current)) {
      const allowed = {};
      if (Object.prototype.hasOwnProperty.call(next, "notifiedTerminalState")) {
        allowed.notifiedTerminalState = next.notifiedTerminalState;
      }
      return allowed;
    }

    const waiting = isBrowserResumeWaiting(current);
    const userCancelled = next.error === "USER_CANCELED";

    if (current.cancelRequested) {
      if (next.state === "paused") delete next.state;
      if (next.state === "interrupted" && userCancelled) delete next.state;
      if (next.paused === true) delete next.paused;
      if (userCancelled) next.error = null;

      // If completion wins the race with a requested cancellation, completion
      // is authoritative and clears transient lifecycle flags.
      if (next.state === "complete") {
        next.cancelRequested = false;
        next.pauseRequested = false;
        next.launchPending = false;
      }
    }

    if (waiting) {
      if (next.state === "paused") delete next.state;
      if (next.state === "interrupted" && userCancelled) delete next.state;
      if (next.paused === true) delete next.paused;
      if (userCancelled) next.error = null;
    } else if ((next.state === "paused" || next.paused === true) && userCancelled) {
      next.error = null;
    }

    if (next.state && ["complete", "cancelled", "error", "interrupted"].includes(next.state)) {
      next.launchPending = false;
      next.pauseRequested = false;
      if (next.state !== "cancelled") next.cancelRequested = false;
    }

    return next;
  }

  function mergeBrowserSnapshot(job, item) {
    if (isImmutableTerminal(job)) return { ...job };

    const waiting = isBrowserResumeWaiting(job) && Boolean(item?.paused);
    const cancelling = Boolean(job?.cancelRequested);
    const userCancelled = item?.error === "USER_CANCELED";
    const preserveCancellation = cancelling && Boolean(item?.paused || (item?.state === "interrupted" && userCancelled));
    const paused = waiting || preserveCancellation ? false : Boolean(item?.paused);
    const state = waiting
      ? "queued"
      : (preserveCancellation ? job.state : (paused ? "paused" : item?.state));
    const error = waiting || preserveCancellation || paused ? null : (item?.error || null);

    return {
      ...job,
      state,
      paused,
      bytesReceived: item?.bytesReceived,
      totalBytes: item?.totalBytes,
      filename: item?.filename || job.filename,
      error
    };
  }

  async function allocateQueueOrder() {
    const previous = queueOrderLock;
    let release;
    queueOrderLock = new Promise((resolve) => { release = resolve; });
    await previous;
    try {
      const stored = await browser.storage.local.get(QUEUE_SEQUENCE_KEY);
      const prior = Number(stored[QUEUE_SEQUENCE_KEY]);
      let baseline = Number.isFinite(prior) && prior >= 0 ? Math.trunc(prior) : 0;

      // A profile upgraded from an older source candidate can contain jobs with
      // queueOrder values while the sequence key itself is absent/stale. Never
      // allocate an order behind persisted history; reconcile to the highest
      // managed order before assigning the next queue-tail position.
      const all = await browser.storage.local.get(null);
      for (const [key, value] of Object.entries(all)) {
        if (!key.startsWith("job:")) continue;
        const order = Number(value?.queueOrder);
        if (Number.isFinite(order) && order >= 0) baseline = Math.max(baseline, Math.trunc(order));
      }

      const next = baseline + 1;
      await browser.storage.local.set({ [QUEUE_SEQUENCE_KEY]: next });
      return next;
    } finally {
      release();
    }
  }

  const api = {
    isBrowserResumeWaiting,
    isImmutableTerminal,
    sanitizeRequestedFilename,
    sanitizeJobPatch,
    mergeBrowserSnapshot
  };

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }

  if (typeof globalThis === "object") {
    globalThis.GoreeCloudDownloadSchedulerHardening = api;
  }

  if (
    typeof updateJob === "function" &&
    typeof getJob === "function" &&
    typeof refreshBrowserJob === "function" &&
    typeof rawJobs === "function" &&
    typeof queueDownload === "function" &&
    typeof launchBrowserJob === "function" &&
    typeof pauseJob === "function" &&
    typeof resumeJob === "function" &&
    typeof cancelJob === "function" &&
    typeof notifyJob === "function" &&
    typeof onNativeMessage === "function" &&
    typeof browser === "object"
  ) {
    const originalUpdateJob = updateJob;
    const originalRawJobs = rawJobs;
    const originalPauseJob = pauseJob;
    const originalNotifyJob = notifyJob;
    const originalOnNativeMessage = onNativeMessage;

    updateJob = async function hardenedUpdateJob(id, patch) {
      const current = await getJob(id);
      if (!current) return null;
      return originalUpdateJob(id, sanitizeJobPatch(current, patch));
    };

    refreshBrowserJob = async function hardenedRefreshBrowserJob(job) {
      if (job.native || job.downloadId == null || isImmutableTerminal(job)) return job;
      try {
        const [item] = await browser.downloads.search({ id: job.downloadId });
        if (!item) return job;
        const next = mergeBrowserSnapshot(job, item);
        await browser.storage.local.set({ [`job:${job.id}`]: next });
        browserJobByDownloadId.set(job.downloadId, job.id);
        return next;
      } catch (_) {
        return job;
      }
    };

    rawJobs = async function hardenedRawJobs() {
      const jobs = await originalRawJobs();
      return jobs.sort((a, b) => {
        const createdDifference = Number(a.createdAt || 0) - Number(b.createdAt || 0);
        if (createdDifference) return createdDifference;

        const aOrder = Number(a.queueOrder || 0);
        const bOrder = Number(b.queueOrder || 0);
        if (aOrder && bOrder && aOrder !== bOrder) return aOrder - bOrder;
        if (aOrder !== bOrder) return aOrder ? 1 : -1;
        return String(a.id || "").localeCompare(String(b.id || ""));
      });
    };

    queueDownload = async function hardenedQueueDownload(payload = {}, deferPump = false) {
      const settings = await getSettings();
      const url = validateUrl(payload.url);
      const id = crypto.randomUUID();
      const requestedFilename = sanitizeRequestedFilename(payload.requestedFilename ?? payload.filename);
      const engine = payload.engine === "native" || payload.engine === "browser" ? payload.engine : settings.mode;
      const segments = clamp(payload.segments, 1, 32, settings.segments);
      const retryCount = clamp(payload.retryCount, 0, 10, settings.retryCount);
      const directory = Object.prototype.hasOwnProperty.call(payload, "directory")
        ? String(payload.directory || "").trim()
        : settings.nativeDirectory;
      const queueOrder = await allocateQueueOrder();
      const job = {
        id,
        url,
        filename: requestedFilename,
        requestedFilename,
        state: "queued",
        paused: false,
        bytesReceived: 0,
        totalBytes: -1,
        createdAt: Date.now(),
        queueOrder,
        engine,
        native: engine === "native",
        nativeStarted: false,
        segments,
        retryCount,
        directory: directory || null
      };
      await browser.storage.local.set({ [`job:${id}`]: job });
      await browser.runtime.sendMessage({ type: "job-update", job }).catch(() => {});
      if (!deferPump) pumpQueue().catch(() => {});
      return job;
    };

    launchBrowserJob = async function hardenedLaunchBrowserJob(job) {
      if (job.downloadId != null) {
        await browser.downloads.resume(job.downloadId);
        return updateJob(job.id, {
          state: "in_progress",
          paused: false,
          error: null,
          pauseRequested: false,
          cancelRequested: false
        });
      }

      const starting = await updateJob(job.id, {
        state: "starting",
        paused: false,
        error: null,
        launchPending: true
      });
      if (!starting) return null;

      const options = { url: starting.url, saveAs: false };
      const requestedFilename = sanitizeRequestedFilename(starting.requestedFilename ?? starting.filename);
      if (requestedFilename) options.filename = requestedFilename;

      const downloadId = await browser.downloads.download(options);
      browserJobByDownloadId.set(downloadId, starting.id);

      const current = await getJob(starting.id);
      if (!current) {
        await browser.downloads.cancel(downloadId).catch(() => {});
        browserJobByDownloadId.delete(downloadId);
        return null;
      }

      if (current.state === "cancelled" || current.cancelRequested) {
        await browser.downloads.cancel(downloadId).catch(() => {});
        browserJobByDownloadId.delete(downloadId);
        if (current.state === "cancelled") return current;
        return updateJob(current.id, {
          state: "cancelled",
          paused: false,
          speedBps: 0,
          error: null,
          cancelRequested: false,
          launchPending: false
        });
      }

      if (current.state === "paused" || current.pauseRequested) {
        await updateJob(current.id, {
          downloadId,
          native: false,
          engine: "browser",
          launchPending: false
        });
        await browser.downloads.pause(downloadId).catch(() => {});
        return updateJob(current.id, {
          state: "paused",
          paused: true,
          error: null,
          pauseRequested: false,
          launchPending: false
        });
      }

      return updateJob(current.id, {
        downloadId,
        state: "in_progress",
        paused: false,
        native: false,
        engine: "browser",
        error: null,
        pauseRequested: false,
        cancelRequested: false,
        launchPending: false
      });
    };

    pauseJob = async function hardenedPauseJob(job, shouldPump = true) {
      if (
        job &&
        !job.native &&
        job.downloadId == null &&
        job.state === "starting"
      ) {
        await updateJob(job.id, {
          state: "paused",
          paused: true,
          pauseRequested: true,
          error: null
        });
        if (shouldPump) pumpQueue().catch(() => {});
        return true;
      }
      return originalPauseJob(job, shouldPump);
    };

    resumeJob = async function hardenedResumeJob(job) {
      if (!job || job.state !== "paused") return false;
      await updateJob(job.id, {
        state: "queued",
        paused: false,
        error: null,
        pauseRequested: false
      });
      pumpQueue().catch(() => {});
      return true;
    };

    cancelJob = async function hardenedCancelJob(job, shouldPump = true) {
      if (!job || TERMINAL_STATES.has(job.state)) return false;

      if (job.state === "queued") {
        await updateJob(job.id, {
          state: "cancelled",
          paused: false,
          speedBps: 0,
          error: null,
          cancelRequested: false,
          launchPending: false
        });
        if (shouldPump) pumpQueue().catch(() => {});
        return true;
      }

      await updateJob(job.id, { cancelRequested: true, error: null });
      let cancelError = null;
      try {
        if (job.native && job.nativeStarted) {
          ensureNativePort().postMessage({ type: "cancel", jobId: job.id });
        } else if (!job.native && job.downloadId != null) {
          await browser.downloads.cancel(job.downloadId);
        }
      } catch (error) {
        cancelError = error;
      }

      const current = await getJob(job.id);
      if (!current) {
        if (shouldPump) pumpQueue().catch(() => {});
        return true;
      }

      if (current.state === "complete") {
        if (shouldPump) pumpQueue().catch(() => {});
        return false;
      }

      if (cancelError && !job.native && job.downloadId != null) {
        await updateJob(job.id, {
          cancelRequested: false,
          error: `Cancellation failed: ${String(cancelError)}`
        });
        return false;
      }

      await updateJob(job.id, {
        state: "cancelled",
        paused: false,
        speedBps: 0,
        error: null,
        cancelRequested: false,
        launchPending: false,
        pauseRequested: false
      });
      if (shouldPump) pumpQueue().catch(() => {});
      return true;
    };

    notifyJob = async function hardenedNotifyJob(job) {
      const current = job?.id ? await getJob(job.id) : null;
      if (!current) return;
      if (
        current.notifiedTerminalState &&
        PROBLEM_TERMINAL_STATES.has(current.notifiedTerminalState) &&
        PROBLEM_TERMINAL_STATES.has(current.state)
      ) {
        return;
      }
      return originalNotifyJob(current);
    };

    onNativeMessage = async function hardenedOnNativeMessage(msg) {
      if (msg?.jobId) {
        const current = await getJob(msg.jobId);
        if (!current || isImmutableTerminal(current)) return;
      }
      return originalOnNativeMessage(msg);
    };
  }
})();
