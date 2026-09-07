#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");

function event() {
  const listeners = [];
  return {
    listeners,
    addListener(fn) { listeners.push(fn); },
    async emit(...args) {
      for (const fn of listeners) await fn(...args);
    }
  };
}

function createHarness() {
  const storage = new Map();
  const downloads = new Map();
  const notifications = [];
  const downloadCalls = [];
  const cancelCalls = [];
  const nativePosts = [];
  const onDownloadChanged = event();
  const onMessage = event();
  let nativePort = null;
  let nextDownloadId = 1;
  let uuid = 1;

  const browser = {
    storage: {
      local: {
        async get(query) {
          if (query == null) return Object.fromEntries(storage.entries());
          if (typeof query === "string") return storage.has(query) ? { [query]: storage.get(query) } : {};
          if (Array.isArray(query)) {
            const out = {};
            for (const key of query) if (storage.has(key)) out[key] = storage.get(key);
            return out;
          }
          const out = {};
          for (const [key, fallback] of Object.entries(query || {})) out[key] = storage.has(key) ? storage.get(key) : fallback;
          return out;
        },
        async set(values) { for (const [key, value] of Object.entries(values)) storage.set(key, value); },
        async remove(keys) { for (const key of Array.isArray(keys) ? keys : [keys]) storage.delete(key); }
      }
    },
    runtime: {
      lastError: null,
      onInstalled: event(),
      onStartup: event(),
      onMessage,
      async sendMessage() { return undefined; },
      getURL(value) { return `moz-extension://test/${value}`; },
      connectNative() {
        nativePort = {
          onMessage: event(),
          onDisconnect: event(),
          postMessage(message) { nativePosts.push(message); }
        };
        setTimeout(() => nativePort.onMessage.emit({ type: "hello", version: "0.2.5" }), 0);
        return nativePort;
      }
    },
    downloads: {
      onChanged: onDownloadChanged,
      async download(options) {
        const id = nextDownloadId++;
        downloadCalls.push({ id, options });
        downloads.set(id, {
          id,
          state: "in_progress",
          paused: false,
          bytesReceived: 0,
          totalBytes: 64 * 1024 * 1024,
          filename: `/home/test/Downloads/${path.basename(new URL(options.url).pathname)}`,
          error: null
        });
        return id;
      },
      async search({ id }) {
        const item = downloads.get(id);
        return item ? [{ ...item }] : [];
      },
      async pause(id) {
        const item = downloads.get(id);
        item.paused = true;
        item.error = "USER_CANCELED";
        await onDownloadChanged.emit({ id, paused: { current: true }, error: { current: "USER_CANCELED" } });
      },
      async resume(id) {
        const item = downloads.get(id);
        item.paused = false;
        item.state = "in_progress";
        item.error = null;
        await onDownloadChanged.emit({ id, paused: { current: false }, state: { current: "in_progress" } });
      },
      async cancel(id) {
        cancelCalls.push(id);
        const item = downloads.get(id);
        item.state = "interrupted";
        item.paused = false;
        item.error = "USER_CANCELED";
        // Hostile ordering: Firefox emits USER_CANCELED before cancel() resolves.
        await onDownloadChanged.emit({ id, state: { current: "interrupted" }, error: { current: "USER_CANCELED" } });
      }
    },
    notifications: {
      async create(...args) { notifications.push(args); return String(notifications.length); }
    },
    contextMenus: { onClicked: event(), async removeAll() {}, create() {} },
    commands: { onCommand: event() },
    tabs: { async create() {} },
    permissions: { async contains() { return false; }, async request() { return false; } },
    cookies: { async getAll() { return []; } }
  };

  class FixedDate extends Date { static now() { return 1_000_000; } }
  const context = vm.createContext({
    browser,
    URL,
    console,
    setTimeout,
    clearTimeout,
    Promise,
    Date: FixedDate,
    performance: { now: () => 1_000_000 },
    crypto: { randomUUID: () => `job-${uuid++}` }
  });
  context.globalThis = context;
  vm.runInContext(fs.readFileSync(path.join(root, "background.js"), "utf8"), context);
  vm.runInContext(fs.readFileSync(path.join(root, "scheduler_hardening.js"), "utf8"), context);

  const messageListener = onMessage.listeners.at(-1);
  async function message(value) { return messageListener(value, {}); }
  async function settle() { for (let i = 0; i < 16; i += 1) await new Promise((r) => setTimeout(r, 0)); }
  async function jobs() { await settle(); return message({ type: "list-jobs" }); }

  return {
    browser,
    storage,
    downloads,
    notifications,
    downloadCalls,
    cancelCalls,
    nativePosts,
    get nativePort() { return nativePort; },
    message,
    settle,
    jobs
  };
}

function findBySuffix(jobs, suffix) {
  return jobs.find((job) => job.url?.endsWith(suffix));
}

async function main() {
  const h = createHarness();
  await h.message({
    type: "save-settings",
    settings: {
      mode: "browser",
      segments: 8,
      maxConcurrent: 3,
      retryCount: 3,
      nativeDirectory: "",
      forwardCookies: false,
      completionNotifications: true
    }
  });

  const urls = Array.from({ length: 5 }, (_, i) =>
    `http://127.0.0.1:8767/goreecloud-concurrency-${String(i + 1).padStart(2, "0")}.bin`
  );
  await h.message({ type: "start-batch", urls });
  await h.settle();

  let jobs = await h.jobs();
  assert.deepEqual(
    h.downloadCalls.slice(0, 3).map((call) => path.basename(new URL(call.options.url).pathname)),
    ["goreecloud-concurrency-01.bin", "goreecloud-concurrency-02.bin", "goreecloud-concurrency-03.bin"]
  );
  assert.deepEqual(
    jobs.map((job) => job.queueOrder).filter(Boolean).sort((a, b) => a - b),
    [1, 2, 3, 4, 5],
    "equal-timestamp jobs must receive durable FIFO tie-breakers"
  );

  const job01 = findBySuffix(jobs, "goreecloud-concurrency-01.bin");
  await h.message({ type: "cancel-job", id: job01.id });
  await h.settle();
  jobs = await h.jobs();
  const cancelled01 = jobs.find((job) => job.id === job01.id);
  assert.equal(cancelled01.state, "cancelled");
  assert.equal(cancelled01.error, null);
  assert.equal(h.notifications.length, 0, "intentional cancellation must not notify as failure");
  assert.equal(h.cancelCalls.length, 1);
  assert.equal(jobs.filter((job) => ["starting", "in_progress", "downloading"].includes(job.state)).length, 3,
    "cancellation must promote one queued job without exceeding maxConcurrent");

  await h.browser.downloads.onChanged.emit({
    id: cancelled01.downloadId,
    state: { current: "interrupted" },
    error: { current: "USER_CANCELED" }
  });
  await h.settle();
  jobs = await h.jobs();
  assert.equal(jobs.find((job) => job.id === job01.id).state, "cancelled",
    "late Firefox terminal events must not regress explicit cancellation");
  assert.equal(h.notifications.length, 0);

  await h.message({ type: "remove-job", id: job01.id });
  await h.browser.downloads.onChanged.emit({
    id: cancelled01.downloadId,
    state: { current: "interrupted" },
    error: { current: "USER_CANCELED" }
  });
  await h.settle();
  assert.equal(h.storage.has(`job:${job01.id}`), false, "late Firefox events must not resurrect a removed job");

  jobs = await h.jobs();
  const job02 = findBySuffix(jobs, "goreecloud-concurrency-02.bin");
  const absolutePath = "/home/test/Downloads/goreecloud-concurrency-02.bin";
  const item02 = h.downloads.get(job02.downloadId);
  item02.filename = absolutePath;
  item02.state = "interrupted";
  item02.error = "NETWORK_FAILED";
  await h.browser.downloads.onChanged.emit({
    id: job02.downloadId,
    filename: { current: absolutePath },
    state: { current: "interrupted" },
    error: { current: "NETWORK_FAILED" }
  });
  await h.settle();
  assert.equal(h.notifications.length, 1, "real Firefox interruption must notify once");

  const retry = await h.message({ type: "retry-job", id: job02.id });
  assert(retry?.id && retry.id !== job02.id);
  assert.equal(retry.filename, "goreecloud-concurrency-02.bin",
    "retry must not feed an absolute completed destination back to Firefox");
  assert.equal(retry.requestedFilename, "goreecloud-concurrency-02.bin");
  assert(retry.queueOrder > 5, "retry must join the queue tail");

  jobs = await h.jobs();
  const job03 = findBySuffix(jobs, "goreecloud-concurrency-03.bin");
  const item03 = h.downloads.get(job03.downloadId);
  item03.state = "complete";
  item03.bytesReceived = item03.totalBytes;
  await h.browser.downloads.onChanged.emit({
    id: job03.downloadId,
    state: { current: "complete" },
    bytesReceived: { current: item03.totalBytes },
    totalBytes: { current: item03.totalBytes }
  });
  await h.settle();
  assert.equal(h.downloadCalls.at(-1).options.filename, "goreecloud-concurrency-02.bin");

  h.storage.set("job:native-fault", {
    id: "native-fault",
    url: "http://127.0.0.1:8767/native-fault.bin",
    filename: "native-fault.bin",
    state: "downloading",
    paused: false,
    bytesReceived: 1024,
    totalBytes: 4096,
    createdAt: 1_000_000,
    queueOrder: 100,
    engine: "native",
    native: true,
    nativeStarted: true,
    segments: 8,
    retryCount: 3,
    directory: null
  });

  const statusPromise = h.message({ type: "native-status" });
  await h.settle();
  assert.equal((await statusPromise).available, true);
  await h.nativePort.onMessage.emit({
    type: "progress",
    jobId: "native-fault",
    state: "error",
    error: "controlled native failure",
    bytesReceived: 1024,
    totalBytes: 4096,
    effectiveSegments: 8
  });
  await h.settle();
  const afterNativeFailure = h.notifications.length;
  assert.equal(afterNativeFailure, 3, "Firefox failure, Firefox completion, and native failure must each notify once");

  await h.nativePort.onMessage.emit({
    type: "progress",
    jobId: "native-fault",
    state: "interrupted",
    error: "controlled follow-up interruption",
    bytesReceived: 1024,
    totalBytes: 4096,
    effectiveSegments: 8
  });
  await h.settle();
  assert.equal(h.notifications.length, afterNativeFailure,
    "error and interrupted states from one unresolved failure incident must not double-notify");

  await h.message({ type: "remove-job", id: "native-fault" });
  await h.nativePort.onMessage.emit({
    type: "progress",
    jobId: "native-fault",
    state: "downloading",
    bytesReceived: 2048,
    totalBytes: 4096,
    effectiveSegments: 8
  });
  await h.settle();
  assert.equal(h.storage.has("job:native-fault"), false, "late native messages must not resurrect removed jobs");

  console.log("DOWNLOAD LIFECYCLE FAULT HARDENING: PASS");
  console.log("- equal-timestamp FIFO queue ordering: PASS");
  console.log("- synchronous USER_CANCELED race: PASS");
  console.log("- late Firefox terminal-event protection: PASS");
  console.log("- removed Firefox job protection: PASS");
  console.log("- retry path normalization and tail placement: PASS");
  console.log("- failure notification de-duplication: PASS");
  console.log("- removed native job protection: PASS");
}

main().catch((error) => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
