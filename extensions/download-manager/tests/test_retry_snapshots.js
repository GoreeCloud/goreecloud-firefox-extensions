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
    addListener(fn) { listeners.push(fn); }
  };
}

function createHarness() {
  const storage = new Map();
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
          for (const [key, fallback] of Object.entries(query || {})) {
            out[key] = storage.has(key) ? storage.get(key) : fallback;
          }
          return out;
        },
        async set(values) {
          for (const [key, value] of Object.entries(values)) storage.set(key, value);
        },
        async remove(keys) {
          for (const key of Array.isArray(keys) ? keys : [keys]) storage.delete(key);
        }
      }
    },
    runtime: {
      lastError: null,
      onInstalled: event(),
      onStartup: event(),
      onMessage: event(),
      async sendMessage() { return undefined; },
      getURL(value) { return `moz-extension://test/${value}`; },
      connectNative() { throw new Error("native helper must not launch while scheduler is intentionally full"); }
    },
    downloads: {
      onChanged: event(),
      async search() { return []; },
      async download() { throw new Error("Firefox download must not launch while scheduler is intentionally full"); },
      async pause() {},
      async resume() {},
      async cancel() {}
    },
    notifications: { async create() { return "notification"; } },
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
    Date,
    performance: { now: () => 1_000_000 },
    crypto: { randomUUID: () => `retry-job-${uuid++}` }
  });
  context.globalThis = context;

  vm.runInContext(fs.readFileSync(path.join(root, "background.js"), "utf8"), context, { filename: "background.js" });
  vm.runInContext(fs.readFileSync(path.join(root, "scheduler_hardening.js"), "utf8"), context, { filename: "scheduler_hardening.js" });

  const messageListener = browser.runtime.onMessage.listeners.at(-1);
  assert.equal(typeof messageListener, "function", "background message listener must be registered");

  return {
    storage,
    api: context.GoreeCloudDownloadSchedulerHardening,
    async message(value) { return messageListener(value, {}); },
    async settle() {
      for (let i = 0; i < 12; i += 1) await new Promise((resolve) => setTimeout(resolve, 0));
    }
  };
}

async function main() {
  const h = createHarness();
  const sanitize = h.api.sanitizeRequestedFilename;

  assert.equal(sanitize("safe/subdir/report.bin"), "safe/subdir/report.bin");
  assert.equal(sanitize("safe/./subdir/report.bin"), "safe/subdir/report.bin");
  assert.equal(sanitize("../secret/report.bin"), "report.bin");
  assert.equal(sanitize("safe/../secret/report.bin"), "report.bin");
  assert.equal(sanitize("/home/user/Downloads/report.bin"), "report.bin");
  assert.equal(sanitize("C:\\Users\\name\\Downloads\\report.bin"), "report.bin");
  assert.equal(sanitize("\\\\server\\share\\report.bin"), "report.bin");
  assert.equal(sanitize("~/Downloads/report.bin"), "report.bin");
  assert.equal(sanitize("safe/CON"), "safe/_CON");
  assert.equal(sanitize("safe/bad<name>?.bin"), "safe/bad_name__.bin");
  assert.equal(sanitize("safe/trailing...   /report.bin"), "safe/trailing/report.bin");

  await h.message({
    type: "save-settings",
    settings: {
      mode: "browser",
      segments: 2,
      maxConcurrent: 1,
      retryCount: 1,
      nativeDirectory: "/tmp/current-settings",
      forwardCookies: false,
      completionNotifications: true
    }
  });

  // Keep the managed scheduler full so retries can be inspected before either
  // engine launches. This isolates queue metadata from transport behavior.
  h.storage.set("job:blocker", {
    id: "blocker",
    url: "http://127.0.0.1:8767/blocker.bin",
    state: "downloading",
    paused: false,
    createdAt: 1,
    queueOrder: 1,
    engine: "native",
    native: true,
    nativeStarted: true
  });

  h.storage.set("job:cancelled-native", {
    id: "cancelled-native",
    url: "http://127.0.0.1:8767/original-native.bin",
    filename: "/home/test/Downloads/final-native.bin",
    requestedFilename: "archives/team/report?.bin",
    state: "cancelled",
    paused: false,
    createdAt: 2,
    queueOrder: 2,
    engine: "native",
    native: true,
    nativeStarted: true,
    segments: 5,
    retryCount: 7,
    directory: "/tmp/original-native-directory"
  });

  const nativeRetry = await h.message({ type: "retry-job", id: "cancelled-native" });
  await h.settle();
  assert(nativeRetry?.id && nativeRetry.id !== "cancelled-native");
  assert.equal(nativeRetry.state, "queued");
  assert.equal(nativeRetry.engine, "native", "retry must preserve the original effective engine snapshot");
  assert.equal(nativeRetry.native, true);
  assert.equal(nativeRetry.segments, 5, "retry must preserve the original segment snapshot despite Settings drift");
  assert.equal(nativeRetry.retryCount, 7, "retry must preserve the original retry-count snapshot despite Settings drift");
  assert.equal(nativeRetry.directory, "/tmp/original-native-directory",
    "retry must preserve the original native destination snapshot despite Settings drift");
  assert.equal(nativeRetry.requestedFilename, "archives/team/report_.bin",
    "retry must prefer and sanitize the original requested relative filename");
  assert.equal(nativeRetry.filename, "archives/team/report_.bin");
  assert(nativeRetry.queueOrder > 2, "retry must receive a fresh queue-tail sequence");

  // Verify backwards compatibility for an older job without requestedFilename.
  // Its completed absolute Firefox destination must collapse to a safe basename,
  // while its original browser-engine/configuration snapshot remains authoritative.
  h.storage.set("job:legacy-browser", {
    id: "legacy-browser",
    url: "http://127.0.0.1:8767/legacy-browser.bin",
    filename: "C:\\Users\\test\\Downloads\\legacy-browser.bin",
    state: "cancelled",
    paused: false,
    createdAt: 3,
    queueOrder: 3,
    engine: "browser",
    native: false,
    nativeStarted: false,
    segments: 11,
    retryCount: 4,
    directory: "/tmp/legacy-directory"
  });

  const browserRetry = await h.message({ type: "retry-job", id: "legacy-browser" });
  await h.settle();
  assert.equal(browserRetry.engine, "browser");
  assert.equal(browserRetry.native, false);
  assert.equal(browserRetry.segments, 11);
  assert.equal(browserRetry.retryCount, 4);
  assert.equal(browserRetry.directory, "/tmp/legacy-directory");
  assert.equal(browserRetry.requestedFilename, "legacy-browser.bin");
  assert.equal(browserRetry.filename, "legacy-browser.bin");
  assert(browserRetry.queueOrder > nativeRetry.queueOrder, "subsequent retry must remain FIFO at the queue tail");

  console.log("DOWNLOAD RETRY SNAPSHOT HARDENING: PASS");
  console.log("- requested filename normalization: PASS");
  console.log("- absolute/traversal/UNC path reduction: PASS");
  console.log("- clean relative subdirectory preservation: PASS");
  console.log("- engine snapshot preservation across Settings drift: PASS");
  console.log("- native segment/retry/directory snapshot preservation: PASS");
  console.log("- legacy absolute Firefox destination retry compatibility: PASS");
  console.log("- retry queue-tail sequencing: PASS");
}

main().catch((error) => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
