const HOST_NAME = "goreecloud_download_manager";
const DEFAULTS = Object.freeze({
  mode: "browser",
  segments: 8,
  maxConcurrent: 3,
  retryCount: 3,
  nativeDirectory: "",
  forwardCookies: false,
  completionNotifications: true
});

const ACTIVE_STATES = new Set(["starting", "in_progress", "downloading"]);
const TERMINAL_STATES = new Set(["complete", "cancelled", "error", "interrupted"]);
const telemetry = new Map();
const browserJobByDownloadId = new Map();

let nativePort = null;
let nativeReady = false;
let nativeReadyPromise = null;
let nativeReadyResolve = null;
let nativeReadyReject = null;
let pumping = false;
let pumpAgain = false;

function clamp(value, min, max, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(min, Math.min(max, Math.trunc(n))) : fallback;
}

function normalizeSettings(value = {}) {
  return {
    mode: value.mode === "native" ? "native" : "browser",
    segments: clamp(value.segments, 1, 32, DEFAULTS.segments),
    maxConcurrent: clamp(value.maxConcurrent, 1, 12, DEFAULTS.maxConcurrent),
    retryCount: clamp(value.retryCount, 0, 10, DEFAULTS.retryCount),
    nativeDirectory: String(value.nativeDirectory || "").trim(),
    forwardCookies: Boolean(value.forwardCookies),
    completionNotifications: value.completionNotifications !== false
  };
}

function validateUrl(raw) {
  const url = new URL(String(raw || "").trim());
  if (!new Set(["http:", "https:"]).has(url.protocol)) {
    throw new Error("Only HTTP and HTTPS download URLs are supported.");
  }
  return url.href;
}

async function getSettings() {
  const stored = await browser.storage.local.get("settings");
  return normalizeSettings({ ...DEFAULTS, ...(stored.settings || {}) });
}

async function getJob(id) {
  const key = `job:${id}`;
  return (await browser.storage.local.get(key))[key] || null;
}

async function updateJob(id, patch) {
  const key = `job:${id}`;
  const current = (await browser.storage.local.get(key))[key] || { id };
  const next = { ...current, ...patch, updatedAt: Date.now() };
  await browser.storage.local.set({ [key]: next });
  if (next.downloadId != null) browserJobByDownloadId.set(next.downloadId, next.id);
  await browser.runtime.sendMessage({ type: "job-update", job: next }).catch(() => {});
  return next;
}

async function removeJob(id) {
  const job = await getJob(id);
  if (!job) return false;
  if (!TERMINAL_STATES.has(job.state)) return false;
  if (job.downloadId != null) browserJobByDownloadId.delete(job.downloadId);
  telemetry.delete(job.id);
  await browser.storage.local.remove(`job:${id}`);
  await browser.runtime.sendMessage({ type: "job-remove", id }).catch(() => {});
  return true;
}

async function rawJobs() {
  const all = await browser.storage.local.get(null);
  return Object.entries(all)
    .filter(([key]) => key.startsWith("job:"))
    .map(([, value]) => value)
    .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
}

function updateBrowserTelemetry(job) {
  if (job.native || !ACTIVE_STATES.has(job.state) || job.paused) return job;
  const now = performance.now();
  const bytes = Number(job.bytesReceived || 0);
  const sample = telemetry.get(job.id);
  let speedBps = Number(job.speedBps || 0);
  if (sample && now > sample.time && bytes >= sample.bytes) {
    const instant = ((bytes - sample.bytes) * 1000) / (now - sample.time);
    speedBps = sample.speed > 0 ? sample.speed * 0.65 + instant * 0.35 : instant;
  }
  telemetry.set(job.id, { time: now, bytes, speed: speedBps });
  return { ...job, speedBps: Math.max(0, Math.round(speedBps)) };
}

async function refreshBrowserJob(job) {
  if (job.native || job.downloadId == null) return job;
  try {
    const [item] = await browser.downloads.search({ id: job.downloadId });
    if (!item) return job;
    const state = item.paused ? "paused" : item.state;
    const next = {
      ...job,
      state,
      paused: Boolean(item.paused),
      bytesReceived: item.bytesReceived,
      totalBytes: item.totalBytes,
      filename: item.filename || job.filename,
      error: item.error || null
    };
    await browser.storage.local.set({ [`job:${job.id}`]: next });
    browserJobByDownloadId.set(job.downloadId, job.id);
    return next;
  } catch (_) {
    return job;
  }
}

async function listJobs() {
  let jobs = await rawJobs();
  jobs = await Promise.all(jobs.map(refreshBrowserJob));
  jobs = jobs.map(updateBrowserTelemetry);

  const queued = jobs.filter((job) => job.state === "queued");
  const queueIndex = new Map(queued.map((job, index) => [job.id, index + 1]));

  return jobs
    .map((job) => {
      const speed = Number(job.speedBps || 0);
      const remaining = Number(job.totalBytes || -1) - Number(job.bytesReceived || 0);
      return {
        ...job,
        queuePosition: queueIndex.get(job.id) || null,
        etaSeconds: speed > 0 && remaining > 0 ? Math.ceil(remaining / speed) : null
      };
    })
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

async function findBrowserJob(downloadId) {
  const cached = browserJobByDownloadId.get(downloadId);
  if (cached) return getJob(cached);
  const jobs = await rawJobs();
  const job = jobs.find((candidate) => candidate.downloadId === downloadId) || null;
  if (job) browserJobByDownloadId.set(downloadId, job.id);
  return job;
}

async function notifyJob(job) {
  const settings = await getSettings();
  if (!settings.completionNotifications) return;
  if (!new Set(["complete", "error", "interrupted"]).has(job.state)) return;
  if (job.notifiedTerminalState === job.state) return;

  const filename = String(job.filename || "Download").split(/[\\/]/).pop();
  const message = job.state === "complete"
    ? `${filename} finished downloading.`
    : `${filename} ${job.state === "error" ? "failed" : "was interrupted"}.`;

  await browser.notifications.create(`download:${job.id}:${job.state}`, {
    type: "basic",
    iconUrl: browser.runtime.getURL("icons/app-icon-96.png"),
    title: "GoreeCloud Download Manager Extension",
    message
  }).catch(() => {});
  await updateJob(job.id, { notifiedTerminalState: job.state });
}

async function markNativeDisconnected() {
  const jobs = await rawJobs();
  for (const job of jobs) {
    if (job.native && ACTIVE_STATES.has(job.state)) {
      await updateJob(job.id, {
        state: "interrupted",
        paused: false,
        error: "Native helper disconnected before the download completed."
      });
    }
  }
}

function ensureNativePort() {
  if (nativePort) return nativePort;
  nativeReady = false;
  nativeReadyPromise = new Promise((resolve, reject) => {
    nativeReadyResolve = resolve;
    nativeReadyReject = reject;
  });
  nativePort = browser.runtime.connectNative(HOST_NAME);
  nativePort.onMessage.addListener(onNativeMessage);
  nativePort.onDisconnect.addListener(() => {
    const error = browser.runtime.lastError?.message || "Native helper disconnected";
    if (nativeReadyReject) nativeReadyReject(new Error(error));
    nativePort = null;
    nativeReady = false;
    nativeReadyPromise = null;
    nativeReadyResolve = null;
    nativeReadyReject = null;
    markNativeDisconnected().catch(() => {});
  });
  return nativePort;
}

async function readyNativePort(timeoutMs = 1800) {
  const port = ensureNativePort();
  if (nativeReady) return port;
  const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error("Native helper did not complete its handshake")), timeoutMs));
  await Promise.race([nativeReadyPromise, timeout]);
  return port;
}

async function onNativeMessage(msg) {
  if (!msg || !msg.type) return;
  if (msg.type === "hello") {
    nativeReady = true;
    if (nativeReadyResolve) nativeReadyResolve(true);
    return;
  }
  if (!msg.jobId) return;

  const patch = {
    state: msg.state,
    paused: msg.state === "paused",
    bytesReceived: msg.bytesReceived,
    totalBytes: msg.totalBytes,
    speedBps: msg.speedBps,
    filename: msg.filename,
    error: msg.error || null,
    destination: msg.destination,
    effectiveSegments: msg.effectiveSegments,
    native: true
  };
  Object.keys(patch).forEach((key) => patch[key] === undefined && delete patch[key]);
  const job = await updateJob(msg.jobId, patch);

  if (TERMINAL_STATES.has(job.state)) {
    await notifyJob(job);
    pumpQueue().catch(() => {});
  }
}

async function getEphemeralNativeHeaders(url, settings) {
  if (!settings.forwardCookies) return {};
  try {
    const hasPermission = await browser.permissions.contains({
      permissions: ["cookies"],
      origins: ["<all_urls>"]
    });
    if (!hasPermission) return {};
    const cookies = await browser.cookies.getAll({ url });
    if (!cookies.length) return {};
    return { Cookie: cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join("; ") };
  } catch (_) {
    return {};
  }
}

async function launchBrowserJob(job) {
  if (job.downloadId != null) {
    await browser.downloads.resume(job.downloadId);
    return updateJob(job.id, { state: "in_progress", paused: false, error: null });
  }

  const options = { url: job.url, saveAs: false };
  if (job.filename) options.filename = job.filename;
  const downloadId = await browser.downloads.download(options);
  browserJobByDownloadId.set(downloadId, job.id);
  return updateJob(job.id, {
    downloadId,
    state: "in_progress",
    paused: false,
    native: false,
    engine: "browser",
    error: null
  });
}

async function launchNativeJob(job, settings) {
  const headers = await getEphemeralNativeHeaders(job.url, settings);
  const port = await readyNativePort();
  await updateJob(job.id, { state: "starting", paused: false, error: null });
  port.postMessage({
    type: job.nativeStarted ? "resume" : "start",
    jobId: job.id,
    url: job.url,
    filename: job.filename || null,
    directory: job.directory || settings.nativeDirectory || null,
    segments: job.segments || settings.segments,
    retryCount: job.retryCount ?? settings.retryCount,
    headers
  });
  return updateJob(job.id, { nativeStarted: true, native: true, engine: "native" });
}

async function launchJob(job, settings) {
  if (job.engine === "native") {
    try {
      return await launchNativeJob(job, settings);
    } catch (error) {
      const fallback = await updateJob(job.id, {
        engine: "browser",
        native: false,
        nativeStarted: false,
        fallbackReason: `Native helper unavailable: ${String(error)}`,
        state: "starting"
      });
      await browser.notifications.create({
        type: "basic",
        iconUrl: browser.runtime.getURL("icons/app-icon-96.png"),
        title: "GoreeCloud Download Manager Extension",
        message: "Native helper unavailable. This download is using Firefox's download engine."
      }).catch(() => {});
      return launchBrowserJob(fallback);
    }
  }
  return launchBrowserJob(job);
}

async function pumpQueue() {
  if (pumping) {
    pumpAgain = true;
    return;
  }
  pumping = true;
  try {
    do {
      pumpAgain = false;
      const settings = await getSettings();
      const jobs = await rawJobs();
      let active = jobs.filter((job) => ACTIVE_STATES.has(job.state) && !job.paused).length;
      const queued = jobs.filter((job) => job.state === "queued");

      for (const job of queued) {
        if (active >= settings.maxConcurrent) break;
        try {
          await launchJob(job, settings);
          active += 1;
        } catch (error) {
          const failed = await updateJob(job.id, { state: "error", error: String(error), paused: false });
          await notifyJob(failed);
        }
      }
    } while (pumpAgain);
  } finally {
    pumping = false;
  }
}

async function queueDownload(payload, deferPump = false) {
  const settings = await getSettings();
  const url = validateUrl(payload.url);
  const id = crypto.randomUUID();
  const job = {
    id,
    url,
    filename: payload.filename ? String(payload.filename) : null,
    state: "queued",
    paused: false,
    bytesReceived: 0,
    totalBytes: -1,
    createdAt: Date.now(),
    engine: settings.mode,
    native: settings.mode === "native",
    nativeStarted: false,
    segments: settings.segments,
    retryCount: settings.retryCount,
    directory: settings.nativeDirectory || null
  };
  await browser.storage.local.set({ [`job:${id}`]: job });
  await browser.runtime.sendMessage({ type: "job-update", job }).catch(() => {});
  if (!deferPump) pumpQueue().catch(() => {});
  return job;
}

async function queueBatch(urls) {
  const unique = [...new Set((urls || []).map((url) => String(url).trim()).filter(Boolean))].slice(0, 100);
  const jobs = [];
  for (const url of unique) jobs.push(await queueDownload({ url }, true));
  pumpQueue().catch(() => {});
  return jobs;
}

async function pauseJob(job, shouldPump = true) {
  if (!job || TERMINAL_STATES.has(job.state) || job.state === "paused") return false;
  try {
    if (job.state === "queued") {
      await updateJob(job.id, { state: "paused", paused: true });
    } else if (job.native) {
      ensureNativePort().postMessage({ type: "pause", jobId: job.id });
      await updateJob(job.id, { state: "paused", paused: true });
    } else if (job.downloadId != null) {
      await browser.downloads.pause(job.downloadId);
      await updateJob(job.id, { state: "paused", paused: true });
    }
  } catch (error) {
    await updateJob(job.id, { error: String(error) });
    return false;
  }
  if (shouldPump) pumpQueue().catch(() => {});
  return true;
}

async function resumeJob(job) {
  if (!job || job.state !== "paused") return false;
  await updateJob(job.id, { state: "queued", paused: false, error: null });
  pumpQueue().catch(() => {});
  return true;
}

async function cancelJob(job, shouldPump = true) {
  if (!job || TERMINAL_STATES.has(job.state)) return false;
  try {
    if (job.native && job.nativeStarted) {
      ensureNativePort().postMessage({ type: "cancel", jobId: job.id });
    } else if (!job.native && job.downloadId != null) {
      await browser.downloads.cancel(job.downloadId);
    }
  } catch (_) {}
  await updateJob(job.id, { state: "cancelled", paused: false, speedBps: 0 });
  if (shouldPump) pumpQueue().catch(() => {});
  return true;
}

browser.runtime.onInstalled.addListener(async () => {
  const stored = await browser.storage.local.get("settings");
  if (!stored.settings) await browser.storage.local.set({ settings: DEFAULTS });

  await browser.contextMenus.removeAll().catch(() => {});
  browser.contextMenus.create({
    id: "goreecloud-download",
    title: "Download with GoreeCloud Download Manager Extension",
    contexts: ["link", "image", "video", "audio"]
  });
});

browser.runtime.onStartup.addListener(() => {
  pumpQueue().catch(() => {});
});

browser.contextMenus.onClicked.addListener(async (info) => {
  if (info.menuItemId !== "goreecloud-download") return;
  const url = info.linkUrl || info.srcUrl;
  if (!url) return;
  try {
    await queueDownload({ url });
  } catch (error) {
    await browser.notifications.create({
      type: "basic",
      iconUrl: browser.runtime.getURL("icons/app-icon-96.png"),
      title: "GoreeCloud Download Manager Extension",
      message: String(error.message || error)
    }).catch(() => {});
  }
});

browser.downloads.onChanged.addListener(async (delta) => {
  const job = await findBrowserJob(delta.id);
  if (!job) return;
  const patch = {};
  if (delta.state?.current) patch.state = delta.state.current;
  if (delta.paused) {
    patch.paused = delta.paused.current;
    if (delta.paused.current) patch.state = "paused";
    else if (!delta.state?.current) patch.state = "in_progress";
  }
  if (delta.error?.current) patch.error = delta.error.current;
  if (delta.filename?.current) patch.filename = delta.filename.current;
  if (delta.totalBytes?.current !== undefined) patch.totalBytes = delta.totalBytes.current;
  if (delta.bytesReceived?.current !== undefined) patch.bytesReceived = delta.bytesReceived.current;

  const next = Object.keys(patch).length ? await updateJob(job.id, patch) : job;
  if (TERMINAL_STATES.has(next.state)) {
    await notifyJob(next);
    pumpQueue().catch(() => {});
  }
});

browser.commands.onCommand.addListener(async (command) => {
  if (command === "open-manager") {
    await browser.tabs.create({ url: browser.runtime.getURL("ui/manager.html") });
  }
});

browser.runtime.onMessage.addListener(async (message) => {
  switch (message?.type) {
    case "start-download":
      return queueDownload({ url: message.url, filename: message.filename });
    case "start-batch":
      return queueBatch(message.urls);
    case "list-jobs":
      return listJobs();
    case "get-settings":
      return getSettings();
    case "save-settings": {
      const settings = normalizeSettings({ ...DEFAULTS, ...(message.settings || {}) });
      await browser.storage.local.set({ settings });
      pumpQueue().catch(() => {});
      return settings;
    }
    case "request-cookie-permission": {
      const granted = await browser.permissions.request({ permissions: ["cookies"], origins: ["<all_urls>"] });
      return { granted };
    }
    case "cookie-permission-status": {
      const granted = await browser.permissions.contains({ permissions: ["cookies"], origins: ["<all_urls>"] });
      return { granted };
    }
    case "open-manager":
      await browser.tabs.create({ url: browser.runtime.getURL("ui/manager.html") });
      return true;
    case "pause-job":
      return pauseJob(await getJob(message.id));
    case "resume-job":
      return resumeJob(await getJob(message.id));
    case "cancel-job":
      return cancelJob(await getJob(message.id));
    case "retry-job": {
      const job = await getJob(message.id);
      if (!job) return false;
      return queueDownload({ url: job.url, filename: job.filename });
    }
    case "remove-job":
      return removeJob(message.id);
    case "pause-all": {
      const jobs = await rawJobs();
      for (const job of jobs) await pauseJob(job, false);
      pumpQueue().catch(() => {});
      return true;
    }
    case "resume-all": {
      const jobs = await rawJobs();
      for (const job of jobs.filter((candidate) => candidate.state === "paused")) {
        await updateJob(job.id, { state: "queued", paused: false, error: null });
      }
      pumpQueue().catch(() => {});
      return true;
    }
    case "clear-completed": {
      const jobs = await rawJobs();
      for (const job of jobs.filter((candidate) => candidate.state === "complete")) await removeJob(job.id);
      return true;
    }
    case "native-status":
      try {
        const port = await readyNativePort();
        port.postMessage({ type: "ping" });
        return { available: true, ready: true };
      } catch (error) {
        return { available: false, ready: false, error: String(error) };
      }
    default:
      return undefined;
  }
});

pumpQueue().catch(() => {});
