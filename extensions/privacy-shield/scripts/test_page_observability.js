"use strict";

const assert = require("node:assert/strict");

const messageListeners = [];
const removedListeners = [];
const updatedListeners = [];
const outbound = [];

global.browser = {
  runtime: {
    onMessage: { addListener(fn) { messageListeners.push(fn); } },
    sendMessage(message) { outbound.push(message); return Promise.resolve(true); }
  },
  tabs: {
    onRemoved: { addListener(fn) { removedListeners.push(fn); } },
    onUpdated: { addListener(fn) { updatedListeners.push(fn); } }
  }
};

require("../src/logger-privacy.js");
require("../src/page-observability-background.js");

async function invoke(message, sender = {}) {
  for (const listener of messageListeners) {
    const result = listener(message, sender);
    if (result !== undefined) return await result;
  }
  return undefined;
}

(async () => {
  const sender = {
    tab: { id: 7, url: "https://www.reddit.com/?token=secret-value&keep=1" },
    url: "https://www.reddit.com/?token=secret-value&keep=1"
  };

  const result = await invoke({ type: "page:filtered", reason: "cosmetic-content", amount: 3 }, sender);
  assert.deepEqual(result, { hidden: 3 });
  assert.deepEqual(await invoke({ type: "page:stats", tabId: 7 }), { hidden: 3 });

  const logs = await invoke({ type: "page:logger:get", limit: 10 });
  assert.equal(logs.length, 1);
  assert.equal(logs[0].type, "page");
  assert.equal(logs[0].verdict, "hidden");
  assert.equal(logs[0].reason, "cosmetic-content");
  assert.equal(logs[0].count, 3);
  assert.equal(logs[0].source, "page");
  assert.equal(logs[0].url.includes("secret-value"), false);
  assert.match(logs[0].url, /token=\[redacted\]/);

  assert.equal(outbound.length, 1);
  assert.equal(outbound[0].type, "logger:event");
  assert.equal(JSON.stringify(outbound[0]).toLowerCase().includes("selector"), false);
  assert.equal(JSON.stringify(outbound[0]).toLowerCase().includes("dom"), false);

  assert.equal(await invoke({ type: "page:filtered", reason: "untrusted-reason", amount: 99 }, sender), false);
  assert.deepEqual(await invoke({ type: "page:stats", tabId: 7 }), { hidden: 3 });

  updatedListeners.forEach((listener) => listener(7, { status: "loading" }));
  assert.deepEqual(await invoke({ type: "page:stats", tabId: 7 }), { hidden: 0 });

  await invoke({ type: "page:logger:clear" });
  assert.deepEqual(await invoke({ type: "page:logger:get", limit: 10 }), []);

  removedListeners.forEach((listener) => listener(7));
  assert.deepEqual(await invoke({ type: "page:stats", tabId: 7 }), { hidden: 0 });

  console.log("Privacy Shield page observability tests passed.");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
