(function () {
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

  function sanitizeJobPatch(current, patch = {}) {
    const next = { ...patch };
    const waiting = isBrowserResumeWaiting(current);
    const userCancelled = next.error === "USER_CANCELED";

    if (waiting) {
      if (next.state === "paused") delete next.state;
      if (next.state === "interrupted" && userCancelled) delete next.state;
      if (next.paused === true) delete next.paused;
      if (userCancelled) next.error = null;
    } else if ((next.state === "paused" || next.paused === true) && userCancelled) {
      next.error = null;
    }

    return next;
  }

  function mergeBrowserSnapshot(job, item) {
    const waiting = isBrowserResumeWaiting(job) && Boolean(item?.paused);
    const paused = waiting ? false : Boolean(item?.paused);
    const state = waiting ? "queued" : (paused ? "paused" : item?.state);
    const error = waiting || paused ? null : (item?.error || null);

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

  const api = {
    isBrowserResumeWaiting,
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
    typeof browser === "object"
  ) {
    const originalUpdateJob = updateJob;

    updateJob = async function hardenedUpdateJob(id, patch) {
      const current = await getJob(id);
      return originalUpdateJob(id, sanitizeJobPatch(current, patch));
    };

    refreshBrowserJob = async function hardenedRefreshBrowserJob(job) {
      if (job.native || job.downloadId == null) return job;
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
  }
})();
