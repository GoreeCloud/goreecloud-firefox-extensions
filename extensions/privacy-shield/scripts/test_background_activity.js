"use strict";

const assert = require("node:assert/strict");

const messageListeners = [];
const updatedListeners = [];
const outbound = [];
const badgeWrites = [];
const badgeColors = [];

function listenerSlot() {
  return { addListener() {} };
}

global.browser = {
  storage: {
    local: {
      async get() { return {}; },
      async set() { return true; }
    }
  },
  runtime: {
    getURL(path) { return `moz-extension://privacy-shield/${path}`; },
    async sendMessage(message) { outbound.push(message); return true; },
    onMessage: { addListener(fn) { messageListeners.push(fn); } },
    onInstalled: listenerSlot()
  },
  action: {
    async setBadgeText(details) { badgeWrites.push(details); },
    async setBadgeBackgroundColor(details) { badgeColors.push(details); }
  },
  webRequest: {
    onBeforeRequest: listenerSlot(),
    onBeforeSendHeaders: listenerSlot(),
    onHeadersReceived: listenerSlot()
  },
  scripting: { async executeScript() { return true; } },
  tabs: {
    onRemoved: listenerSlot(),
    onUpdated: { addListener(fn) { updatedListeners.push(fn); } },
    async reload() { return true; },
    async sendMessage() { return true; }
  },
  alarms: { create() {}, onAlarm: listenerSlot() },
  menus: { create() {}, onClicked: listenerSlot() }
};

global.fetch = async () => ({
  async json() { return { ads: [], trackers: [], miners: [], malicious: [] }; }
});

require("../src/core.js");
require("../src/logger-privacy.js");
require("../src/background.js");

assert.equal(messageListeners.length, 1, "background should register one message authority");
assert.equal(updatedListeners.length, 1, "background should register one tab update listener");
const onMessage = messageListeners[0];

async function invoke(message, sender = {}) {
  return await onMessage(message, sender);
}

function lastBadgeText(tabId) {
  return badgeWrites.filter((item) => item.tabId === tabId).at(-1)?.text;
}

(async () => {
  await new Promise((resolve) => setTimeout(resolve, 0));

  const sender = {
    tab: { id: 19, url: "https://www.reddit.com/?token=raw-secret&keep=1" },
    url: "https://www.reddit.com/?token=raw-secret&keep=1"
  };

  const counters = await invoke({ type: "page:filtered", reason: "cosmetic-content", amount: 3 }, sender);
  assert.equal(counters.hidden, 3);
  assert.equal(counters.blocked, 0);
  assert.equal(lastBadgeText(19), "3", "badge should show the combined This tab total");
  assert.equal(badgeColors.at(-1)?.color, "#356DC7");

  await invoke({ type: "content:stat", stat: "cleaned", amount: 2 }, sender);
  assert.equal((await invoke({ type: "tab:stats", tabId: 19 })).cleaned, 2);
  assert.equal(lastBadgeText(19), "5", "badge should combine cleaned and hidden counters");

  const tabStats = await invoke({ type: "tab:stats", tabId: 19 });
  assert.equal(tabStats.hidden, 3);

  const logs = await invoke({ type: "logger:get", limit: 20 });
  const pageEvent = logs.find((entry) => entry.type === "page" && entry.reason === "cosmetic-content");
  assert.ok(pageEvent, "page filtering event should enter unified logger");
  assert.equal(pageEvent.verdict, "hidden");
  assert.equal(pageEvent.count, 3);
  assert.equal(pageEvent.source, "page");
  assert.equal(pageEvent.url.includes("raw-secret"), false);
  assert.match(pageEvent.url, /token=\[redacted\]/);

  const live = outbound.find((message) => message.type === "logger:event" && message.entry?.reason === "cosmetic-content");
  assert.ok(live, "page filtering event should be broadcast to open logger views");
  assert.equal(JSON.stringify(live).toLowerCase().includes("selector"), false);
  assert.equal(JSON.stringify(live).toLowerCase().includes("dom"), false);

  const rejected = await invoke({ type: "page:filtered", reason: "arbitrary-page-text", amount: 50 }, sender);
  assert.equal(rejected, false);
  assert.equal((await invoke({ type: "tab:stats", tabId: 19 })).hidden, 3);
  assert.equal(lastBadgeText(19), "5", "rejected page events must not change the badge");

  await invoke({ type: "page:filtered", reason: "annoyance-overlay", amount: 2 }, sender);
  assert.equal((await invoke({ type: "tab:stats", tabId: 19 })).hidden, 5);
  assert.equal(lastBadgeText(19), "7");

  await invoke({ type: "page:filtered", reason: "cosmetic-content", amount: 500 }, sender);
  await invoke({ type: "page:filtered", reason: "cosmetic-content", amount: 500 }, sender);
  assert.equal(lastBadgeText(19), "999+", "large combined totals should stay compact");

  updatedListeners[0](19, { status: "loading" });
  assert.deepEqual(await invoke({ type: "tab:stats", tabId: 19 }), { blocked: 0, cleaned: 0, hidden: 0, local: 0 });
  assert.equal(lastBadgeText(19), "", "badge should clear when a new navigation starts");

  await invoke({ type: "logger:clear" });
  assert.deepEqual(await invoke({ type: "logger:get", limit: 20 }), []);

  console.log("Privacy Shield background activity tests passed.");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
