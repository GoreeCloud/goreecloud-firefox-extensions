#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const extensionRoot = path.resolve(__dirname, "..");
const backgroundPath = path.join(extensionRoot, "background.js");
const hardeningPath = path.join(extensionRoot, "scheduler_hardening.js");

function event() {
  const listeners = [];
  return {
    listeners,
    addListener(fn) { listeners.push(fn); },
    async emit(...args) {
      const results = [];
      for (const fn of listeners) results.push(await fn(...args));
      return results;
    }
  };
}

function createHarness() {
  const storage = new Map();
  const downloadItems = new Map();
  const notifications = [];
  const downloadCalls = [];
  const cancelCalls = [];
  const pauseCalls = [];
  const resumeCalls = [];
  const nativePosts = [];
  let nativePort = null;
  let nextDownloadId = 1;
  let uuidCounter = 1;

  const onDownloadChanged = event();
  const onMessage = event();

  const local = {
    async get(query) {
      if (query == null) return Object.fromEntries(storage.entries());
      if (typeof query === "string") return storage.has(query) ? { [query]: storage.get(query) } : {};
      if (Array.isArray(query)) {
        const result = {};
        for (const key of query) if (storage.has(key)) result[key] = storage.get(key);
        return result;
      }
      if (typeof query === "object") {
        const result = {};
        for (const [key, fallback] of Object.entries(query)) {
          result[key] = storage.has(key) ? storage.get(key) : fallback;
        }
        return result;
      }
      return {};
    },
    async set(values) {
      for (const [key, value] of Object.entries(values)) storage.set(key, value);
    },
    async remove(key) {
      for (const item of Array.isArray(key) ? key : [key]) storage.delete(item);
    }
  };

  const browser = {
    storage: { local },
    runtime: {
      lastError: null,
      onInstalled: event(),
      onStartup: event(),
      onMessage,
      async sendMessage() { return undefined; },
      getURL(value) { return `moz-extension://test/${value}`; },
      connectNative() {
        const port = {
          onMessage: event(),
          onDisconnect: event(),
          postMessage(message) { nativePosts.push(message); }
        };
        nativePort = port;
        setTimeout(() => port.onMessage.emit({ type: "hello", version: "0.2.5" }), 0);
        return port;
      }
    },
    downloads: {
      onChanged: onDownloadChanged,
      async download(options) {
        const id = nextDownloadId++;
        downloadCalls.push({ id, options });
        downloadItems.set(id, {
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
        const item = downloadItems.get(id);
        return item ? [{ ...item }] : [];
      },
      async pause(id) {
        pauseCalls.push(id);
        const item = downloadItems.get(id);
        assert(item, `missing download ${id}`);
        item.paused = true;
        item.error = "USER_CANCELED";
        await onDownloadChanged.emit({
          id,
          paused: { current: true },
          error: { current: "USER_CANCELED" }
        });
      },
      async resume(id) {
        resumeCalls.push(id);
        const item = downloadItems.get(id);
        assert(item, `missing download ${id}`);
        item.paused = false;
        item.state = "in_progress";
        item.error = null;
        await onDownloadChanged.emit({
          id,
          paused: { current: false },
          state: { current: "in_progress" }
        });
      },
      async cancel(id) {
        cancelCalls.push(id);
        const item = downloadItems.get(id);
        assert(item, `missing download ${id}`);
        item.state = "interrupted";
        item.paused = false;
        item.error = "USER_CANCELED";
        // Deliberately emit synchronously before cancel() resolves. This models
        // the most hostile ordering for the managed cancellation race.
        await onDownloadChanged.emit({
          id,
          state: { current: "interrupted" },
          error: { current: "USER_CANCELED" }
        });
      }
    },
    notifications: {
      async create(...args) {
        notifications.push(args);
        return String(notifications.length);
      }
    },
    contextMenus: {
      onClicked: event(),
      async removeAll() {},
      create() {}
    },
    commands: { onCommand: event() },
    tabs: { async create() {} },
    permissions: {
      async contains() { return false; },
      async request() { return false; }
    },
    cookies: { async getAll() { return []; } }
  };

  const FixedDate = class extends Date {
    static now() { return 1_000_000; }
  };

  const context = vm.createContext({
    browser,
    URL,
    console,
    setTimeout,
    clearTimeout,
    Promise,
    Date: FixedDate,
    performance: { now: () => 1_000_000 },
    crypto: { randomUUID: () => `job-${uuidCounter++}` }
  });
  context.globalThis = context;

  vm.runInContext(fs.readFileSync(backgroundPath, "utf8"), context, { filename: backgroundPath });
  vm.runInContext(fs.readFileSync(hardeningPath, "utf8"), context, { filename: hardeningPath });

  const messageListener = onMessage.listeners.at(-1);
  assert.equal(typeof messageListener, "function", "background message listener was not registered");

  async function message(value) {
    return messageListener(value, {});
  }

  async function settle() {
    for (let i = 0; i < 16; i += 1) await new Promise((resolve) => setTimeout(resolve, 0));
  }

  async function jobs() {
    await settle();
    return message({ type: "list-jobs" });
  }

  return {
    browser,
    storage,
    downloadItems,
    notifications,
    downloadCalls,
    cancelCalls,
    pauseCalls,
    resumeCalls,
    nativePosts,
    get nativePort() { return nativePort; },
    message,
    jobs,
    settle
  };
}

function bySuffix(jobs, suffix) {
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
    ["goreecloud-concurrency-01.bin", "goreecloud-concurrency-02.bin", "goreecloud-concurrency-03.bin"],
    "equal-timestamp jobs must retain FIFO creation order"
  );
  const queueOrders = jobs.map((job) => job.queueOrder).filter(Boolean).sort((a, b) => a - b);
  assert.deepEqual(queueOrders, [1, 2, 3, 4, 5], "queue order must be durable and monotonic");

  const job01 = bySuffix(jobs, "goreecloud-concurrency-01.bin");
  assert(job01?.downloadId, "job 01 must be active before cancellation");
  await h.message({ type: "cancel-job", id: job01.id });
  await h.settle();

  jobs = await h.jobs();
  const cancelled01 = jobs.find((job) => job.id === job01.id);
  assert.equal(cancelled01.state, "cancelled", "explicit cancellation must remain the managed terminal state");
  assert.equal(cancelled01.error, null, "intentional USER_CANCELED must not surface as a failure");
  assert.equal(h.notifications.length, 0, "intentional cancellation must not produce a failure notification");
  assert.equal(h.cancelCalls.length, 1, "underlying Firefox download must be cancelled exactly once");
  assert.equal(jobs.filter((job) => ["starting", "in_progress", "downloading"].includes(job.state)).length, 3,
    "cancelling one active job must promote exactly one queued job");

  await h.browser.downloads.onChanged.emit({
    id: cancelled01.downloadId,
    state: { current: "interrupted" },
    error: { current: "USER_CANCELED" }
  });
  await h.settle();
  jobs = await h.jobs();
  assert.equal(jobs.find((job) => job.id === job01.id).state, "cancelled",
    "late Firefox cancellation events must not regress cancelled state");
  assert.equal(h.notifications.length, 0, "late cancellation events must remain silent");

  await h.message({ type: "remove-job", id: job01.id });
  await h.browser.downloads.onChanged.emit({
    id: cancelled01.downloadId,
    state: { current: "interrupted" },
    error: { current: "USER_CANCELED" }
  });
  await h.settle();
  jobs = await h.jobs();
  assert.equal(jobs.some((job) => job.id === job01.id), false,
    "late Firefox events must not resurrect a removed job");

  const job02 = bySuffix(jobs, "goreecloud-concurrency-02.bin");
  assert(job02?.downloadId, "job 02 must still be active");
  const absoluteFirefoxDestination = "/home/test/Downloads/goreecloud-concurrency-02.bin";
  const item02 = h.downloadItems.get(job02.downloadId);
  item02.filename = absoluteFirefoxDestination;
  item02.state = "interrupted";
  item02.error = "NETWORK_FAILED";
  await h.browser.downloads.onChanged.emit({
    id: job02.downloadId,
    filename: { current: absoluteFirefoxDestination },
    state: { current: "interrupted" },
    error: { current: "NETWORK_FAILED" }
  });
  await h.settle();
  assert.equal(h.notifications.length, 1, "a real Firefox interruption must notify once");

  const retry = await h.message({ type: "retry-job", id: job02.id });
  assert(retry?.id && retry.id !== job02.id, "ordinary retry must create a fresh managed job");
  assert.equal(retry.filename, "goreecloud-concurrency-02.bin",
    "retry must reduce a completed absolute Firefox destination to a safe relative filename");
  assert.equal(retry.requestedFilename, "goreecloud-concurrency-02.bin");
  assert(retry.queueOrder > 5, "retry must join the tail of the managed FIFO queue");

  jobs = await h.jobs();
  const job03 = bySuffix(jobs, "goreecloud-concurrency-03.bin");
  const item03 = h.downloadItems.get(job03.downloadId);
  item03.state = "complete";
  item03.bytesReceived = item03.totalBytes;
  await h.browser.downloads.onChanged.emit({
    id: job03.downloadId,
    state: { current: "complete" },
    bytesReceived: { current: item03.totalBytes },
    totalBytes: { current: item03.totalBytes }
  });
  await h.settle();
  assert.equal(h.downloadCalls.at(-1).options.filename, "goreecloud-concurrency-02.bin",
    "Firefox retry launch must never receive an absolute destination path");

  // Inject a native job to exercise terminal-notification de-duplication and
  // removed-job protection without depending on a real native helper process.
  h.storage.set("job:native-fault", {
    id: "native-fault",
    url: "http://127.0.0.1:8767/native-fault.bin",
    filename: "native-fault.bin",
    requestedFilename: null,
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

  const nativeStatusPromise = h.message({ type: "native-status" });
  await h.settle();
  const nativeStatus = await nativeStatusPromise;
  assert.equal(nativeStatus.available, true, "mock native helper handshake must succeed");
  assert(h.nativePort, "native port must be available");

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
  const notificationsAfterNativeFailure = h.notifications.length;
  assert.equal(notificationsAfterNativeFailure, 3,
    "Firefox failure, Firefox completion, and native failure should each notify once");

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
  assert.equal(h.notifications.length, notificationsAfterNativeFailure,
    "one failure incident must not emit both error and interrupted notifications");

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
  assert.equal(h.storage.has("job:native-fault"), false,
    "late native messages must not resurrect a removed terminal job");

  const api = h.browser && vm.runInContext("GoreeCloudDownloadSchedulerHardening", vm.createContext({}));
  void api;

  console.log("DOWNLOAD LIFECYCLE FAULT HARDENING: PASS");
  console.log("- durable FIFO tie ordering: PASS");
  console.log("- synchronous USER_CANCELED cancellation race: PASS");
  console.log("- late Firefox terminal-event regression protection: PASS");
  console.log("- removed Firefox job resurrection protection: PASS");
  console.log("- safe retry filename normalization and queue-tail placement: PASS");
  console.log("- one-notification-per-problem incident: PASS");
  console.log("- removed native job resurrection protection: PASS");
}

main().catch((error) => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
