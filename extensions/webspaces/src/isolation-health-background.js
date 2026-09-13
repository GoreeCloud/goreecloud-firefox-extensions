import { buildIsolationHealth } from "./isolation-health.js";
import { loadConfig } from "./storage.js";

const ISOLATION_HEALTH_MESSAGE = "webspaces-health:get-isolation-health";

browser.runtime.onMessage.addListener((message) => {
  if (message?.type !== ISOLATION_HEALTH_MESSAGE) return undefined;

  return Promise.all([
    loadConfig(),
    browser.contextualIdentities.query({})
  ]).then(([config, contexts]) => buildIsolationHealth(config, contexts));
});
