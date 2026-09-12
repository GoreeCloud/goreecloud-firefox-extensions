import { ensureBuiltinWebspaces } from "./containers.js";
import { evaluateRouting } from "./routing.js";
import { loadConfig, saveConfig } from "./storage.js";

const inFlight = new Map();
const REROUTE_TTL_MS = 8000;
let config = null;

function navigationKey(tabId, url) {
  return `${tabId}:${url}`;
}

function markInFlight(tabId, url) {
  const key = navigationKey(tabId, url);
  inFlight.set(key, Date.now() + REROUTE_TTL_MS);
  setTimeout(() => inFlight.delete(key), REROUTE_TTL_MS + 100);
}

function isInFlight(tabId, url) {
  const key = navigationKey(tabId, url);
  const expires = inFlight.get(key);
  if (!expires) return false;
  if (expires < Date.now()) {
    inFlight.delete(key);
    return false;
  }
  return true;
}

async function initialize() {
  const loaded = await loadConfig();
  const ensured = await ensureBuiltinWebspaces(loaded);
  await saveConfig(ensured);
  config = ensured;
}

async function reroute(details, targetCookieStoreId) {
  const source = await browser.tabs.get(details.tabId);
  if (source.cookieStoreId === targetCookieStoreId) return;

  markInFlight(source.id, details.url);
  const replacement = await browser.tabs.create({
    url: details.url,
    cookieStoreId: targetCookieStoreId,
    windowId: source.windowId,
    index: source.index,
    active: source.active,
    pinned: source.pinned
  });
  markInFlight(replacement.id, details.url);

  // Remove only after Firefox confirms the replacement tab was created.
  await browser.tabs.remove(source.id);
}

async function handleBeforeNavigate(details) {
  if (details.frameId !== 0 || isInFlight(details.tabId, details.url)) return;
  if (!config) await initialize();

  const decision = evaluateRouting(details.url, config);
  if (decision.action !== "webspace" || !decision.webspaceId) return;

  const target = config.webspaces?.[decision.webspaceId];
  if (!target?.cookieStoreId) {
    console.warn("GoreeCloud Webspaces: routing target is unavailable", decision);
    return;
  }

  try {
    await reroute(details, target.cookieStoreId);
  } catch (error) {
    // Fail open for ordinary navigation during the first development slice:
    // never destroy the original tab unless replacement creation succeeded.
    console.error("GoreeCloud Webspaces: reroute failed", error);
  }
}

browser.runtime.onInstalled.addListener(() => {
  initialize().catch((error) => console.error("GoreeCloud Webspaces initialization failed", error));
});

browser.runtime.onStartup.addListener(() => {
  initialize().catch((error) => console.error("GoreeCloud Webspaces startup failed", error));
});

browser.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "local" && changes.webspacesConfig?.newValue) {
    config = changes.webspacesConfig.newValue;
  }
});

browser.webNavigation.onBeforeNavigate.addListener((details) => {
  handleBeforeNavigate(details).catch((error) => console.error("GoreeCloud Webspaces navigation handler failed", error));
});

initialize().catch((error) => console.error("GoreeCloud Webspaces bootstrap failed", error));
