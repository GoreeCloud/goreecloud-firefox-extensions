import { buildIsolationHealth } from "./isolation-health.js";
import { loadConfig } from "./storage.js";

browser.runtime.onMessage.addListener((message) => {
  if (message?.type !== "webspaces:get-isolation-health") return undefined;

  return Promise.all([
    loadConfig(),
    browser.contextualIdentities.query({})
  ]).then(([config, contexts]) => buildIsolationHealth(config, contexts));
});
