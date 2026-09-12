import { ensureBuiltinWebspaces } from "./containers.js";
import { evaluateRouting } from "./routing.js";
import { loadConfig, saveConfig } from "./storage.js";
import { upsertDomainAssignment, validateWebspaceInput } from "./management.js";

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

async function readyConfig() {
  if (!config) await initialize();
  return config;
}

async function persist(next) {
  await saveConfig(next);
  config = next;
  return config;
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

  await browser.tabs.remove(source.id);
}

async function handleBeforeNavigate(details) {
  if (details.frameId !== 0 || isInFlight(details.tabId, details.url)) return;
  const current = await readyConfig();

  const decision = evaluateRouting(details.url, current);
  if (decision.action !== "webspace" || !decision.webspaceId) return;

  const target = current.webspaces?.[decision.webspaceId];
  if (!target?.cookieStoreId) {
    console.warn("GoreeCloud Webspaces: routing target is unavailable", decision);
    return;
  }

  try {
    await reroute(details, target.cookieStoreId);
  } catch (error) {
    console.error("GoreeCloud Webspaces: reroute failed", error);
  }
}

async function createCustomWebspace(input) {
  const definition = validateWebspaceInput(input);
  const context = await browser.contextualIdentities.create(definition);
  const current = await readyConfig();
  const id = `custom-${crypto.randomUUID()}`;
  const next = structuredClone(current);
  next.webspaces[id] = {
    id,
    name: definition.name,
    color: definition.color,
    icon: definition.icon,
    builtIn: false,
    cookieStoreId: context.cookieStoreId
  };
  await persist(next);
  return next.webspaces[id];
}

async function handleMessage(message) {
  const current = await readyConfig();

  switch (message.type) {
    case "webspaces:get-state":
      return { config: structuredClone(current) };

    case "webspaces:set-routing": {
      const next = { ...structuredClone(current), routingEnabled: Boolean(message.enabled) };
      await persist(next);
      return { config: structuredClone(next) };
    }

    case "webspaces:open": {
      const webspace = current.webspaces?.[message.webspaceId];
      if (!webspace?.cookieStoreId) throw new Error("Unknown or unavailable Webspace.");
      await browser.tabs.create({
        url: message.url || "about:blank",
        cookieStoreId: webspace.cookieStoreId
      });
      return { ok: true };
    }

    case "webspaces:create": {
      const webspace = await createCustomWebspace(message.webspace);
      return { webspace, config: structuredClone(config) };
    }

    case "webspaces:assign-site": {
      if (!current.webspaces?.[message.webspaceId]) throw new Error("Unknown Webspace.");
      const next = structuredClone(current);
      next.userRules = upsertDomainAssignment(
        next.userRules,
        message.hostname,
        message.webspaceId
      );
      await persist(next);
      return { config: structuredClone(next) };
    }

    case "webspaces:remove-assignment": {
      const next = structuredClone(current);
      next.userRules = (next.userRules ?? []).filter((rule) => rule.id !== message.ruleId);
      await persist(next);
      return { config: structuredClone(next) };
    }

    default:
      throw new Error(`Unknown GoreeCloud Webspaces message: ${message.type}`);
  }
}

browser.runtime.onInstalled.addListener(() => {
  initialize().catch((error) => console.error("GoreeCloud Webspaces initialization failed", error));
});

browser.runtime.onStartup.addListener(() => {
  initialize().catch((error) => console.error("GoreeCloud Webspaces startup failed", error));
});

browser.runtime.onMessage.addListener((message) => {
  if (!message?.type?.startsWith("webspaces:")) return undefined;
  return handleMessage(message);
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
