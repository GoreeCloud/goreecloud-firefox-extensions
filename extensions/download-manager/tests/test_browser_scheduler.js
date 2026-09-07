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
    addListener(fn) {
      listeners.push(fn);
    },
    async emit(...args) {
      for (const fn of listeners) await fn(...args);
    }
  };
}

function createHarness() {
  const storage = new Map();
  const downloadItems = new Map();
  const notifications = [];
  const downloadCalls = [];
  const resumeCalls = [];
  const pauseCalls = [];
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
        return {
          onMessage: event(),
          onDisconnect: event(),
          postMessage() {}
        };
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
        const item = downloadItems.get(id);
        if (item) {
          item.state = "interrupted";
          item.paused = false;
          item.error = "USER_CANCELED";
        }
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

  const context = vm.createContext({
    browser,
    URL,
    console,
    setTimeout,
    clearTimeout,
    Promise,
    performance: { now: () => Date.now() },
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
    for (let i = 0; i < 12; i += 1) await new Promise((resolve) => setTimeout(resolve, 0));
  }

  async function jobs() {
    await settle();
    return message({ type: "list-jobs" });
  }

  async function completeByJob(job) {
    const item = downloadItems.get(job.downloadId);
    assert(item, "job has no underlying mocked Firefox download");
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

  return {
    browser,
    storage,
    downloadItems,
    notifications,
    downloadCalls,
    resumeCalls,
    pauseCalls,
    message,
    jobs,
    settle,
    completeByJob
  };
}

function countStates(jobs) {
  return jobs.reduce((counts, job) => {
    counts[job.state] = (counts[job.state] || 0) + 1;
    return counts;
  }, {});
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
  let states = countStates(jobs);
  assert.equal(states.in_progress, 3, "initial scheduler should launch exactly three Firefox jobs");
  assert.equal(states.queued, 2, "initial scheduler should leave two Firefox jobs queued");
  assert.equal(h.downloadCalls.length, 3, "Firefox downloads API should receive exactly three initial launches");

  const job01 = jobs.find((job) => job.url.endsWith("goreecloud-concurrency-01.bin"));
  assert(job01, "job 01 missing");
  await h.message({ type: "pause-job", id: job01.id });
  await h.settle();

  jobs = await h.jobs();
  states = countStates(jobs);
  assert.equal(states.paused, 1, "one Firefox job should remain paused");
  assert.equal(states.in_progress, 3, "pausing one active job should promote one queued job");
  assert.equal(states.queued, 1, "one queued job should remain after pause-driven promotion");
  assert.equal(h.downloadCalls.length, 4, "pause-driven promotion should launch exactly one queued job");

  await h.message({ type: "resume-job", id: job01.id });
  await h.settle();
  jobs = await h.jobs();
  states = countStates(jobs);
  assert.equal(states.in_progress, 3, "resume while full must not create a fourth active job");
  assert.equal(states.queued, 2, "resumed Firefox job should wait in the managed queue while full");
  assert.equal(states.paused || 0, 0, "queued resumed Firefox job must not be reverted to paused by Firefox snapshot refresh");
  assert.equal(h.resumeCalls.length, 0, "underlying Firefox resume must wait until a scheduler slot opens");

  const waiting01 = jobs.find((job) => job.id === job01.id);
  assert.equal(waiting01.state, "queued");
  assert.equal(waiting01.paused, false);
  assert.equal(waiting01.error, null, "USER_CANCELED must not leak into a queued resume-waiting job");

  await h.browser.downloads.onChanged.emit({
    id: waiting01.downloadId,
    paused: { current: true },
    error: { current: "USER_CANCELED" }
  });
  await h.settle();
  jobs = await h.jobs();
  const afterSpuriousPausedDelta = jobs.find((job) => job.id === job01.id);
  assert.equal(afterSpuriousPausedDelta.state, "queued", "paused Firefox delta must not overwrite managed queued resume state");
  assert.equal(afterSpuriousPausedDelta.paused, false);
  assert.equal(afterSpuriousPausedDelta.error, null);

  const job02 = jobs.find((job) => job.url.endsWith("goreecloud-concurrency-02.bin"));
  assert(job02, "job 02 missing");
  await h.completeByJob(job02);

  jobs = await h.jobs();
  states = countStates(jobs);
  assert.equal(states.complete, 1);
  assert.equal(states.in_progress, 3, "slot opening should resume the oldest waiting Firefox job and retain the three-job ceiling");
  assert.equal(states.queued, 1);
  assert.equal(h.resumeCalls.length, 1, "waiting paused Firefox download should resume when a slot opens");
  assert.equal(h.resumeCalls[0], job01.downloadId, "oldest resume-waiting Firefox job should receive the freed slot first");
  assert.equal(h.downloadCalls.length, 4, "resuming an existing Firefox job must not create a replacement download");

  const resumed01 = jobs.find((job) => job.id === job01.id);
  assert.equal(resumed01.state, "in_progress");
  assert.equal(resumed01.paused, false);
  assert.equal(resumed01.error, null);

  assert.equal(h.notifications.length, 1, "completed Firefox job should emit one completion notification");

  console.log("BROWSER SCHEDULER HARDENING: PASS");
  console.log("- initial 3-active / 2-queued ceiling: PASS");
  console.log("- pause-driven queued-job promotion: PASS");
  console.log("- resume-while-full remains queued: PASS");
  console.log("- Firefox paused snapshot/delta cannot revert queued resume state: PASS");
  console.log("- USER_CANCELED suppression for paused/queued resume state: PASS");
  console.log("- freed slot resumes existing Firefox download without replacement: PASS");
  console.log("- completion notification: PASS");
}

main().catch((error) => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
