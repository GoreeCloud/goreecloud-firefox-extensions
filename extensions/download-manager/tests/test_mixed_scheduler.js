#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const extensionRoot = path.resolve(__dirname, "..");
const NATIVE_CAPABILITIES = [
  "segmented-range-integrity",
  "same-job-recovery",
  "no-overwrite-publish",
  "ephemeral-request-headers"
];

function event() {
  const listeners = [];
  return {
    listeners,
    addListener(fn) { listeners.push(fn); },
    async emit(...args) { for (const fn of listeners) await fn(...args); }
  };
}

function createHarness() {
  const storage = new Map();
  const downloadItems = new Map();
  const downloadCalls = [];
  const resumeCalls = [];
  const pauseCalls = [];
  const nativeMessages = [];
  const notifications = [];
  const onDownloadChanged = event();
  const onRuntimeMessage = event();
  const nativeOnMessage = event();
  const nativeOnDisconnect = event();
  let nextDownloadId = 1;
  let uuidCounter = 1;

  const local = {
    async get(query) {
      if (query == null) return Object.fromEntries(storage.entries());
      if (typeof query === "string") return storage.has(query) ? { [query]: storage.get(query) } : {};
      if (Array.isArray(query)) {
        const result = {};
        for (const key of query) if (storage.has(key)) result[key] = storage.get(key);
        return result;
      }
      const result = {};
      for (const [key, fallback] of Object.entries(query || {})) {
        result[key] = storage.has(key) ? storage.get(key) : fallback;
      }
      return result;
    },
    async set(values) { for (const [key, value] of Object.entries(values)) storage.set(key, value); },
    async remove(keys) { for (const key of Array.isArray(keys) ? keys : [keys]) storage.delete(key); }
  };

  const nativePort = {
    onMessage: nativeOnMessage,
    onDisconnect: nativeOnDisconnect,
    disconnect() {},
    postMessage(message) {
      nativeMessages.push(message);
      if (message.type === "start" || message.type === "resume") {
        setTimeout(() => {
          nativeOnMessage.emit({
            type: "progress",
            jobId: message.jobId,
            state: "downloading",
            bytesReceived: 1024,
            totalBytes: 64 * 1024 * 1024,
            speedBps: 1024 * 1024,
            effectiveSegments: 8,
            filename: path.basename(new URL(message.url).pathname)
          }).catch((error) => { throw error; });
        }, 0);
      }
    }
  };

  const browser = {
    storage: { local },
    runtime: {
      lastError: null,
      onInstalled: event(),
      onStartup: event(),
      onMessage: onRuntimeMessage,
      async sendMessage() { return undefined; },
      getURL(value) { return `moz-extension://test/${value}`; },
      connectNative() {
        setTimeout(() => nativeOnMessage.emit({
          type: "hello",
          version: "0.2.8",
          protocolVersion: 2,
          capabilities: [...NATIVE_CAPABILITIES]
        }), 0);
        return nativePort;
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
          filename: `/tmp/${path.basename(new URL(options.url).pathname)}`,
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
        assert(item);
        item.paused = true;
        item.error = "USER_CANCELED";
        await onDownloadChanged.emit({ id, paused: { current: true }, error: { current: "USER_CANCELED" } });
      },
      async resume(id) {
        resumeCalls.push(id);
        const item = downloadItems.get(id);
        assert(item);
        item.paused = false;
        item.state = "in_progress";
        item.error = null;
        await onDownloadChanged.emit({ id, paused: { current: false }, state: { current: "in_progress" } });
      },
      async cancel(id) {
        const item = downloadItems.get(id);
        if (item) {
          item.state = "interrupted";
          item.paused = false;
          item.error = "USER_CANCELED";
        }
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

  const context = vm.createContext({
    browser,
    URL,
    console,
    setTimeout,
    clearTimeout,
    Promise,
    performance: { now: () => Date.now() },
    crypto: { randomUUID: () => `mixed-job-${uuidCounter++}` }
  });
  context.globalThis = context;

  for (const filename of ["native_protocol.js", "background.js", "scheduler_hardening.js"]) {
    vm.runInContext(fs.readFileSync(path.join(extensionRoot, filename), "utf8"), context, { filename });
  }

  const messageListener = onRuntimeMessage.listeners.at(-1);
  assert.equal(typeof messageListener, "function");

  async function message(value) { return messageListener(value, {}); }
  async function settle() { for (let i = 0; i < 16; i += 1) await new Promise((resolve) => setTimeout(resolve, 0)); }
  async function jobs() { await settle(); return message({ type: "list-jobs" }); }

  async function completeBrowser(job) {
    const item = downloadItems.get(job.downloadId);
    assert(item);
    item.state = "complete";
    item.paused = false;
    item.bytesReceived = item.totalBytes;
    item.error = null;
    await onDownloadChanged.emit({
      id: job.downloadId,
      state: { current: "complete" },
      bytesReceived: { current: item.totalBytes },
      totalBytes: { current: item.totalBytes }
    });
    await settle();
  }

  async function completeNative(job) {
    await nativeOnMessage.emit({
      type: "complete",
      jobId: job.id,
      state: "complete",
      bytesReceived: 64 * 1024 * 1024,
      totalBytes: 64 * 1024 * 1024,
      speedBps: 0,
      effectiveSegments: 8,
      filename: path.basename(new URL(job.url).pathname),
      destination: `/tmp/${path.basename(new URL(job.url).pathname)}`
    });
    await settle();
  }

  return {
    message,
    settle,
    jobs,
    completeBrowser,
    completeNative,
    downloadCalls,
    resumeCalls,
    pauseCalls,
    nativeMessages,
    notifications
  };
}

function stateCounts(jobs) {
  return jobs.reduce((result, job) => {
    result[job.state] = (result[job.state] || 0) + 1;
    return result;
  }, {});
}

async function setSettings(h, mode) {
  await h.message({
    type: "save-settings",
    settings: {
      mode,
      segments: 8,
      maxConcurrent: 3,
      retryCount: 3,
      nativeDirectory: "",
      forwardCookies: false,
      completionNotifications: true
    }
  });
  await h.settle();
}

async function main() {
  const h = createHarness();

  await setSettings(h, "browser");
  await h.message({
    type: "start-batch",
    urls: [
      "http://127.0.0.1:8767/mixed-browser-01.bin",
      "http://127.0.0.1:8767/mixed-browser-02.bin"
    ]
  });
  await h.settle();

  await setSettings(h, "native");
  await h.message({
    type: "start-batch",
    urls: [
      "http://127.0.0.1:8767/mixed-native-01.bin",
      "http://127.0.0.1:8767/mixed-native-02.bin",
      "http://127.0.0.1:8767/mixed-native-03.bin"
    ]
  });
  await h.settle();

  let jobs = await h.jobs();
  let counts = stateCounts(jobs);
  assert.equal((counts.in_progress || 0) + (counts.downloading || 0) + (counts.starting || 0), 3,
    "mixed scheduler should cap managed active jobs at three");
  assert.equal(counts.queued, 2, "two mixed jobs should remain queued");
  assert.equal(h.downloadCalls.length, 2, "two browser jobs should have launched");
  assert.equal(h.nativeMessages.filter((message) => message.type === "start").length, 1,
    "only one native job should launch while two browser slots are occupied");

  const browser01 = jobs.find((job) => job.url.endsWith("mixed-browser-01.bin"));
  const browser02 = jobs.find((job) => job.url.endsWith("mixed-browser-02.bin"));
  let native01 = jobs.find((job) => job.url.endsWith("mixed-native-01.bin"));
  assert(browser01 && browser02 && native01);

  await h.message({ type: "pause-job", id: browser01.id });
  await h.settle();
  jobs = await h.jobs();
  counts = stateCounts(jobs);
  assert.equal(counts.paused, 1);
  assert.equal((counts.in_progress || 0) + (counts.downloading || 0) + (counts.starting || 0), 3,
    "pausing a browser job should promote a queued native job and retain the mixed ceiling");
  assert.equal(counts.queued, 1);
  assert.equal(h.nativeMessages.filter((message) => message.type === "start").length, 2,
    "pause-driven promotion should launch the second native job");

  await h.message({ type: "resume-job", id: browser01.id });
  await h.settle();
  jobs = await h.jobs();
  counts = stateCounts(jobs);
  assert.equal((counts.in_progress || 0) + (counts.downloading || 0) + (counts.starting || 0), 3,
    "resume while a mixed scheduler is full must not create a fourth active job");
  assert.equal(counts.queued, 2);
  assert.equal(h.resumeCalls.length, 0, "underlying Firefox resume must wait for a mixed-engine slot");

  native01 = jobs.find((job) => job.url.endsWith("mixed-native-01.bin"));
  await h.completeNative(native01);
  jobs = await h.jobs();
  counts = stateCounts(jobs);
  assert.equal(counts.complete, 1);
  assert.equal((counts.in_progress || 0) + (counts.downloading || 0) + (counts.starting || 0), 3,
    "native completion should promote the oldest queued mixed job without exceeding the ceiling");
  assert.equal(counts.queued, 1);
  assert.equal(h.resumeCalls.length, 1, "native completion should free a slot for the waiting Firefox resume");
  assert.equal(h.resumeCalls[0], browser01.downloadId);

  await h.completeBrowser(browser02);
  jobs = await h.jobs();
  counts = stateCounts(jobs);
  assert.equal(counts.complete, 2);
  assert.equal((counts.in_progress || 0) + (counts.downloading || 0) + (counts.starting || 0), 3,
    "browser completion should promote the remaining native job and preserve the mixed ceiling");
  assert.equal(counts.queued || 0, 0);
  assert.equal(h.nativeMessages.filter((message) => message.type === "start").length, 3,
    "all three native jobs should eventually launch through shared slots");

  const engines = jobs.reduce((result, job) => {
    result[job.engine] = (result[job.engine] || 0) + 1;
    return result;
  }, {});
  assert.equal(engines.browser, 2);
  assert.equal(engines.native, 3);
  assert.ok(h.notifications.length >= 2, "mixed completion paths should emit notifications when enabled");

  console.log("MIXED FIREFOX/NATIVE SCHEDULER: PASS");
  console.log("- shared maxConcurrent=3 ceiling: PASS");
  console.log("- protocol-compatible native helper handshake: PASS");
  console.log("- browser pause promotes native queued job: PASS");
  console.log("- browser resume while mixed scheduler full remains queued: PASS");
  console.log("- native completion frees slot for same Firefox download ID: PASS");
  console.log("- browser completion promotes remaining native job: PASS");
  console.log("- engine snapshot assignment retained: PASS");
}

main().catch((error) => {
  console.error(error.stack || error);
  process.exitCode = 1;
});