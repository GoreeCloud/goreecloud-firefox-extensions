import { ensureBuiltinWebspaces } from "./containers.js";
import { buildMenuDefinitions, parseMenuAction } from "./context-menus.js";
import {
  findRuleConflicts,
  normalizeAssignmentHostname,
  removeAssignmentsForHostname,
  sanitizeDescription,
  upsertAssignment,
  upsertDomainAssignment,
  updateAssignment,
  validateWebspaceInput,
  WEBSPACE_COLORS,
  WEBSPACE_ICONS
} from "./management.js";
import {
  closeTabsForWebspace,
  recreateWebspaceIdentity,
  removeWebspaceIdentity,
  updateWebspaceIdentity
} from "./lifecycle.js";
import { exportPortableConfig, validatePortableConfig } from "./portability.js";
import { analyzeRouting, evaluateRouting, hostnameFromUrl } from "./routing.js";
import { loadConfig, saveConfig } from "./storage.js";
import { migrateTab } from "./tab-migration.js";

const transitionTabs = new Map();
const TRANSITION_TTL_MS = 10000;
const TEMPORARY_GRACE_MS = 5000;

let config = null;
let cleanupTimer = null;
const busyWebspaces = new Set();

function markTransition(tabId) {
  transitionTabs.set(tabId, Date.now() + TRANSITION_TTL_MS);
  setTimeout(() => transitionTabs.delete(tabId), TRANSITION_TTL_MS + 100);
}

function isTransitioning(tabId) {
  const expires = transitionTabs.get(tabId);
  if (!expires) return false;
  if (expires < Date.now()) {
    transitionTabs.delete(tabId);
    return false;
  }
  return true;
}

function randomId(prefix) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function webspaceById(current, webspaceId) {
  const webspace = current.webspaces?.[webspaceId];
  if (!webspace) throw new Error("Unknown Webspace.");
  if (!webspace.cookieStoreId) throw new Error("Webspace identity is unavailable.");
  return webspace;
}

function assertUnlocked(webspace) {
  if (webspace.locked === true) throw new Error("Unlock this Webspace before changing it.");
}

function recordWithoutWebspace(current, webspaceId) {
  const next = structuredClone(current);
  delete next.webspaces[webspaceId];
  next.userRules = (next.userRules ?? []).filter((rule) => rule.webspaceId !== webspaceId);
  next.exceptions = (next.exceptions ?? []).filter((rule) => rule.webspaceId !== webspaceId);
  if (next.defaultWebspaceId === webspaceId) {
    next.defaultBehavior = "normal";
    delete next.defaultWebspaceId;
  }
  return next;
}

async function appearanceOptions() {
  let colors = WEBSPACE_COLORS.map((color) => ({ color, colorCode: null }));
  let icons = WEBSPACE_ICONS.map((icon) => ({ icon, iconUrl: null }));

  try {
    if (typeof browser.contextualIdentities.getSupportedColors === "function") {
      colors = await browser.contextualIdentities.getSupportedColors();
    }
  } catch {
    // Compatibility fallback above.
  }

  try {
    if (typeof browser.contextualIdentities.getSupportedIcons === "function") {
      icons = await browser.contextualIdentities.getSupportedIcons();
    }
  } catch {
    // Compatibility fallback above.
  }

  return { colors, icons };
}

async function activityFor(current) {
  const counts = {};
  for (const id of Object.keys(current.webspaces ?? {})) counts[id] = 0;

  const byCookieStore = new Map(
    Object.values(current.webspaces ?? {})
      .filter((space) => space.cookieStoreId)
      .map((space) => [space.cookieStoreId, space.id])
  );

  try {
    const tabs = await browser.tabs.query({});
    for (const tab of tabs) {
      const webspaceId = byCookieStore.get(tab.cookieStoreId);
      if (webspaceId) counts[webspaceId] = (counts[webspaceId] ?? 0) + 1;
    }
    return { tabCounts: counts, totalManagedTabs: Object.values(counts).reduce((sum, value) => sum + value, 0) };
  } catch {
    return { tabCounts: counts, totalManagedTabs: 0 };
  }
}

async function refreshMenus(current = config) {
  if (!browser.menus || !current) return;
  try {
    await browser.menus.removeAll();
    for (const definition of buildMenuDefinitions(current.webspaces)) {
      browser.menus.create(definition);
    }
  } catch (error) {
    console.warn("GoreeCloud Webspaces: context-menu refresh failed", error);
  }
}

async function initialize() {
  const loaded = await loadConfig();
  const ensured = await ensureBuiltinWebspaces(loaded);
  await saveConfig(ensured);
  config = ensured;
  await refreshMenus(ensured);
}

async function readyConfig() {
  if (!config) await initialize();
  return config;
}

async function persist(next) {
  await saveConfig(next);
  config = next;
  await refreshMenus(next);
  return config;
}

async function stateSnapshot() {
  const current = await readyConfig();
  const [activity, appearance] = await Promise.all([
    activityFor(current),
    appearanceOptions()
  ]);
  return {
    config: structuredClone(current),
    activity,
    appearance,
    conflicts: findRuleConflicts(current.userRules)
  };
}

async function explicitOpen(webspace, url = "about:blank", sourceTab = null) {
  const properties = {
    url: "about:blank",
    cookieStoreId: webspace.cookieStoreId,
    active: true
  };

  if (sourceTab?.windowId !== undefined) properties.windowId = sourceTab.windowId;
  if (sourceTab?.index !== undefined) properties.index = sourceTab.index + 1;

  const tab = await browser.tabs.create(properties);
  markTransition(tab.id);

  if (url && url !== "about:blank") {
    try {
      await browser.tabs.update(tab.id, { url });
    } catch (error) {
      try {
        await browser.tabs.remove(tab.id);
      } catch {
        // Best-effort cleanup.
      }
      throw error;
    }
  }

  return tab;
}

async function handleBeforeNavigate(details) {
  if (details.frameId !== 0 || isTransitioning(details.tabId)) return;
  const current = await readyConfig();
  const decision = evaluateRouting(details.url, current);
  if (decision.action !== "webspace" || !decision.webspaceId) return;

  const target = current.webspaces?.[decision.webspaceId];
  if (!target?.cookieStoreId) {
    console.warn("GoreeCloud Webspaces: routing target is unavailable", decision);
    return;
  }

  try {
    await migrateTab(browser, {
      sourceTabId: details.tabId,
      url: details.url,
      targetCookieStoreId: target.cookieStoreId,
      onTransition: markTransition
    });
  } catch (error) {
    console.error("GoreeCloud Webspaces: reroute failed", error);
  }
}

async function createCustomWebspace(input, { open = false } = {}) {
  const appearance = await appearanceOptions();
  const definition = validateWebspaceInput(input, {
    colors: appearance.colors.map((entry) => entry.color),
    icons: appearance.icons.map((entry) => entry.icon)
  });

  const context = await browser.contextualIdentities.create({
    name: definition.name,
    color: definition.color,
    icon: definition.icon
  });

  const current = await readyConfig();
  const id = randomId(input.temporary ? "temporary" : "custom");
  const next = structuredClone(current);
  next.webspaces[id] = {
    id,
    name: definition.name,
    color: context.color ?? definition.color,
    icon: context.icon ?? definition.icon,
    description: definition.description ?? "",
    builtIn: false,
    temporary: Boolean(input.temporary),
    locked: false,
    createdAt: new Date().toISOString(),
    cookieStoreId: context.cookieStoreId
  };

  await persist(next);
  if (open || input.temporary) await explicitOpen(next.webspaces[id]);
  return next.webspaces[id];
}

async function updateWebspace(webspaceId, input) {
  const current = await readyConfig();
  const webspace = webspaceById(current, webspaceId);
  assertUnlocked(webspace);

  const appearance = await appearanceOptions();
  const definition = validateWebspaceInput({
    name: webspace.builtIn ? webspace.name : (input.name ?? webspace.name),
    color: input.color ?? webspace.color,
    icon: input.icon ?? webspace.icon,
    description: input.description ?? webspace.description ?? ""
  }, {
    colors: appearance.colors.map((entry) => entry.color),
    icons: appearance.icons.map((entry) => entry.icon)
  });

  const updatedIdentity = await updateWebspaceIdentity(browser, webspace, definition);
  const next = structuredClone(current);
  next.webspaces[webspaceId] = {
    ...next.webspaces[webspaceId],
    name: webspace.builtIn ? webspace.name : definition.name,
    color: updatedIdentity.color ?? definition.color,
    icon: updatedIdentity.icon ?? definition.icon,
    description: sanitizeDescription(definition.description)
  };
  await persist(next);
  return next.webspaces[webspaceId];
}

async function setWebspaceLock(webspaceId, locked) {
  const current = await readyConfig();
  const webspace = webspaceById(current, webspaceId);
  const next = structuredClone(current);
  next.webspaces[webspaceId] = { ...webspace, locked: Boolean(locked) };
  await persist(next);
  return next.webspaces[webspaceId];
}

async function duplicateWebspace(webspaceId) {
  const current = await readyConfig();
  const source = webspaceById(current, webspaceId);
  const appearance = await appearanceOptions();
  const definition = validateWebspaceInput({
    name: `${source.name} — Copy`,
    color: source.color,
    icon: source.icon,
    description: source.description ?? ""
  }, {
    colors: appearance.colors.map((entry) => entry.color),
    icons: appearance.icons.map((entry) => entry.icon)
  });

  const context = await browser.contextualIdentities.create({
    name: definition.name,
    color: definition.color,
    icon: definition.icon
  });

  const id = randomId("custom");
  const next = structuredClone(current);
  next.webspaces[id] = {
    id,
    name: definition.name,
    color: context.color ?? definition.color,
    icon: context.icon ?? definition.icon,
    description: definition.description ?? "",
    builtIn: false,
    temporary: false,
    locked: false,
    duplicatedFrom: source.id,
    createdAt: new Date().toISOString(),
    cookieStoreId: context.cookieStoreId
  };

  const copiedRules = (current.userRules ?? [])
    .filter((rule) => rule.webspaceId === source.id)
    .map((rule) => ({
      ...rule,
      id: randomId("assignment"),
      webspaceId: id,
      enabled: false,
      copiedFrom: rule.id
    }));

  next.userRules.push(...copiedRules);
  await persist(next);
  return { webspace: next.webspaces[id], copiedAssignments: copiedRules.length };
}

async function resetWebspace(webspaceId) {
  const current = await readyConfig();
  const webspace = webspaceById(current, webspaceId);
  assertUnlocked(webspace);

  const { closedTabs, identity } = await recreateWebspaceIdentity(browser, webspace);
  const next = structuredClone(current);
  next.webspaces[webspaceId] = {
    ...webspace,
    cookieStoreId: identity.cookieStoreId,
    color: identity.color ?? webspace.color,
    icon: identity.icon ?? webspace.icon
  };
  await persist(next);
  return { webspace: next.webspaces[webspaceId], closedTabs };
}

async function removeCustomWebspace(webspaceId, { temporaryOnly = false } = {}) {
  const current = await readyConfig();
  const webspace = webspaceById(current, webspaceId);
  if (webspace.builtIn) throw new Error("Built-in Webspaces cannot be deleted.");
  if (temporaryOnly && webspace.temporary !== true) throw new Error("Close & Forget is available for temporary Webspaces.");
  assertUnlocked(webspace);

  busyWebspaces.add(webspaceId);
  try {
    const { closedTabs } = await removeWebspaceIdentity(browser, webspace);
    const next = recordWithoutWebspace(current, webspaceId);
    await persist(next);
    return { removed: webspaceId, closedTabs };
  } finally {
    busyWebspaces.delete(webspaceId);
  }
}

function assertRuleUnlocked(current, rule) {
  const target = current.webspaces?.[rule?.webspaceId];
  if (target?.locked === true) throw new Error("Unlock the target Webspace before changing this assignment.");
}

async function addOrAssign(input, { replaceExisting = true } = {}) {
  const current = await readyConfig();
  const targetWebspace = webspaceById(current, input.webspaceId);
  assertUnlocked(targetWebspace);

  const kind = input.kind === "exact" ? "exact" : "domain";
  const value = normalizeAssignmentHostname(input.value);
  const existing = (current.userRules ?? []).find((rule) => rule.kind === kind && rule.value === value);
  if (existing && existing.webspaceId !== input.webspaceId) {
    assertRuleUnlocked(current, existing);
  }
  if (existing && !replaceExisting && existing.webspaceId !== input.webspaceId) {
    const target = current.webspaces?.[existing.webspaceId]?.name ?? existing.webspaceId;
    throw new Error(`${value} is already assigned to ${target}. Edit the existing rule instead.`);
  }

  const next = structuredClone(current);
  next.userRules = upsertAssignment(next.userRules, { ...input, kind, value });
  await persist(next);
  return next;
}

async function updateRule(ruleId, input) {
  const current = await readyConfig();
  const rule = (current.userRules ?? []).find((candidate) => candidate.id === ruleId);
  if (!rule) throw new Error("Assignment not found.");
  assertRuleUnlocked(current, rule);
  if (input.webspaceId) {
    const targetWebspace = webspaceById(current, input.webspaceId);
    assertUnlocked(targetWebspace);
  }

  const next = structuredClone(current);
  next.userRules = updateAssignment(next.userRules, ruleId, input);
  await persist(next);
  return next;
}

async function removeRule(ruleId) {
  const current = await readyConfig();
  const rule = (current.userRules ?? []).find((candidate) => candidate.id === ruleId);
  if (!rule) return current;
  assertRuleUnlocked(current, rule);

  const next = structuredClone(current);
  next.userRules = next.userRules.filter((candidate) => candidate.id !== ruleId);
  await persist(next);
  return next;
}

async function removeAssignmentForHostname(hostname) {
  const current = await readyConfig();
  const matching = (current.userRules ?? []).filter((rule) => rule.value === hostname);
  for (const rule of matching) assertRuleUnlocked(current, rule);

  const next = structuredClone(current);
  next.userRules = removeAssignmentsForHostname(next.userRules, hostname);
  await persist(next);
  return next;
}

async function importPortable(input) {
  const portable = validatePortableConfig(input);
  const current = await readyConfig();
  const appearance = await appearanceOptions();
  const supported = {
    colors: appearance.colors.map((entry) => entry.color),
    icons: appearance.icons.map((entry) => entry.icon)
  };

  const next = structuredClone(current);
  const idMap = new Map();
  for (const builtIn of Object.values(current.webspaces ?? {}).filter((space) => space.builtIn)) {
    idMap.set(builtIn.id, builtIn.id);
  }

  const createdIdentities = [];
  let createdWebspaces = 0;
  let importedAssignments = 0;
  let skippedAssignments = 0;

  try {
    for (const source of portable.webspaces) {
      if (source.builtIn === true) {
        if (current.webspaces?.[source.id]) idMap.set(source.id, source.id);
        continue;
      }

      const definition = validateWebspaceInput({
        name: source.name,
        color: source.color,
        icon: source.icon,
        description: source.description ?? ""
      }, supported);

      const identity = await browser.contextualIdentities.create({
        name: definition.name,
        color: definition.color,
        icon: definition.icon
      });
      createdIdentities.push(identity.cookieStoreId);

      const id = randomId("custom");
      idMap.set(source.id, id);
      next.webspaces[id] = {
        id,
        name: definition.name,
        color: identity.color ?? definition.color,
        icon: identity.icon ?? definition.icon,
        description: definition.description ?? "",
        builtIn: false,
        temporary: false,
        locked: source.locked === true,
        importedFrom: source.id,
        createdAt: new Date().toISOString(),
        cookieStoreId: identity.cookieStoreId
      };
      createdWebspaces += 1;
    }

    for (const sourceRule of portable.assignments) {
      const mappedTarget = idMap.get(sourceRule.webspaceId);
      if (!mappedTarget) {
        skippedAssignments += 1;
        continue;
      }

      const kind = sourceRule.kind === "exact" ? "exact" : "domain";
      const value = normalizeAssignmentHostname(sourceRule.value);
      const duplicate = next.userRules.some((rule) =>
        rule.kind === kind && rule.value === value
      );
      if (duplicate) {
        skippedAssignments += 1;
        continue;
      }

      next.userRules.push({
        id: randomId("assignment"),
        kind,
        value,
        webspaceId: mappedTarget,
        enabled: sourceRule.enabled !== false,
        importedFrom: sourceRule.id ?? null
      });
      importedAssignments += 1;
    }

    const importedDefaultId = portable.settings?.defaultWebspaceId
      ? idMap.get(portable.settings.defaultWebspaceId)
      : null;
    next.routingEnabled = portable.settings?.routingEnabled !== false;
    if (portable.settings?.defaultBehavior === "webspace" && importedDefaultId) {
      next.defaultBehavior = "webspace";
      next.defaultWebspaceId = importedDefaultId;
    } else {
      next.defaultBehavior = "normal";
      delete next.defaultWebspaceId;
    }

    for (const sourceRule of portable.exceptions) {
      const kind = sourceRule.kind === "exact" ? "exact" : "domain";
      const value = normalizeAssignmentHostname(sourceRule.value);
      const duplicate = next.exceptions.some((rule) =>
        rule.kind === kind && rule.value === value
      );
      if (duplicate) continue;
      next.exceptions.push({
        id: randomId("exception"),
        kind,
        value,
        webspaceId: sourceRule.webspaceId ? idMap.get(sourceRule.webspaceId) ?? null : null,
        enabled: sourceRule.enabled !== false
      });
    }

    await persist(next);
    return { createdWebspaces, importedAssignments, skippedAssignments };
  } catch (error) {
    for (const cookieStoreId of createdIdentities.reverse()) {
      try {
        await browser.contextualIdentities.remove(cookieStoreId);
      } catch {
        // Best-effort rollback.
      }
    }
    throw error;
  }
}

async function handleMessage(message) {
  const current = await readyConfig();

  switch (message.type) {
    case "webspaces:get-state":
      return stateSnapshot();

    case "webspaces:set-routing": {
      const next = { ...structuredClone(current), routingEnabled: Boolean(message.enabled) };
      await persist(next);
      return stateSnapshot();
    }

    case "webspaces:open": {
      const webspace = webspaceById(current, message.webspaceId);
      await explicitOpen(webspace, message.url || "about:blank");
      return { ok: true };
    }

    case "webspaces:move-current": {
      const webspace = webspaceById(current, message.webspaceId);
      const tab = await browser.tabs.get(message.tabId);
      const url = message.url ?? tab.url;
      return migrateTab(browser, {
        sourceTabId: tab.id,
        url,
        targetCookieStoreId: webspace.cookieStoreId,
        onTransition: markTransition
      });
    }

    case "webspaces:create": {
      const webspace = await createCustomWebspace(message.webspace, { open: Boolean(message.open) });
      return { webspace, ...(await stateSnapshot()) };
    }

    case "webspaces:update": {
      const webspace = await updateWebspace(message.webspaceId, message.webspace ?? {});
      return { webspace, ...(await stateSnapshot()) };
    }

    case "webspaces:set-lock": {
      const webspace = await setWebspaceLock(message.webspaceId, message.locked);
      return { webspace, ...(await stateSnapshot()) };
    }

    case "webspaces:duplicate": {
      const result = await duplicateWebspace(message.webspaceId);
      return { ...result, ...(await stateSnapshot()) };
    }

    case "webspaces:reset": {
      const result = await resetWebspace(message.webspaceId);
      return { ...result, ...(await stateSnapshot()) };
    }

    case "webspaces:delete": {
      const result = await removeCustomWebspace(message.webspaceId);
      return { ...result, ...(await stateSnapshot()) };
    }

    case "webspaces:close-forget": {
      const result = await removeCustomWebspace(message.webspaceId, { temporaryOnly: true });
      return { ...result, ...(await stateSnapshot()) };
    }

    case "webspaces:add-assignment": {
      await addOrAssign(message.assignment, { replaceExisting: false });
      return stateSnapshot();
    }

    case "webspaces:assign-site": {
      await addOrAssign({
        kind: "domain",
        value: message.hostname,
        webspaceId: message.webspaceId,
        enabled: true
      });
      return stateSnapshot();
    }

    case "webspaces:update-assignment": {
      await updateRule(message.ruleId, message.assignment ?? {});
      return stateSnapshot();
    }

    case "webspaces:remove-assignment": {
      await removeRule(message.ruleId);
      return stateSnapshot();
    }

    case "webspaces:remove-site-assignment": {
      await removeAssignmentForHostname(message.hostname);
      return stateSnapshot();
    }

    case "webspaces:explain-url":
      return analyzeRouting(message.url, current);

    case "webspaces:export-config":
      return { portable: exportPortableConfig(current) };

    case "webspaces:import-config":
      return { summary: await importPortable(message.portable), ...(await stateSnapshot()) };

    default:
      throw new Error(`Unknown GoreeCloud Webspaces message: ${message.type}`);
  }
}

async function handleMenuClick(info, tab) {
  const parsed = parseMenuAction(info.menuItemId);
  if (!parsed || !tab) return;

  const current = await readyConfig();

  if (parsed.action === "open-link") {
    const target = webspaceById(current, parsed.webspaceId);
    if (info.linkUrl) await explicitOpen(target, info.linkUrl, tab);
    return;
  }

  if (parsed.action === "move-tab") {
    const target = webspaceById(current, parsed.webspaceId);
    if (!tab.url) return;
    await migrateTab(browser, {
      sourceTabId: tab.id,
      url: tab.url,
      targetCookieStoreId: target.cookieStoreId,
      onTransition: markTransition
    });
    return;
  }

  if (parsed.action === "assign-site") {
    const target = webspaceById(current, parsed.webspaceId);
    assertUnlocked(target);
    const hostname = hostnameFromUrl(tab.url ?? "");
    if (!hostname) return;

    await addOrAssign({
      kind: "domain",
      value: hostname,
      webspaceId: target.id,
      enabled: true
    });

    if (tab.cookieStoreId !== target.cookieStoreId) {
      await migrateTab(browser, {
        sourceTabId: tab.id,
        url: tab.url,
        targetCookieStoreId: target.cookieStoreId,
        onTransition: markTransition
      });
    }
    return;
  }

  if (parsed.action === "remove-assignment") {
    const hostname = hostnameFromUrl(tab.url ?? "");
    if (hostname) await removeAssignmentForHostname(hostname);
  }
}

async function cleanupTemporaryWebspaces() {
  const current = await readyConfig();
  for (const webspace of Object.values(current.webspaces ?? {})) {
    if (webspace.temporary !== true || webspace.locked === true || busyWebspaces.has(webspace.id)) continue;

    const createdAt = Date.parse(webspace.createdAt ?? "");
    if (Number.isFinite(createdAt) && Date.now() - createdAt < TEMPORARY_GRACE_MS) {
      const remaining = TEMPORARY_GRACE_MS - (Date.now() - createdAt);
      setTimeout(scheduleTemporaryCleanup, remaining + 50);
      continue;
    }

    let tabs = [];
    try {
      tabs = await browser.tabs.query({ cookieStoreId: webspace.cookieStoreId });
    } catch {
      continue;
    }

    if (tabs.length === 0 && config?.webspaces?.[webspace.id]) {
      try {
        await removeCustomWebspace(webspace.id, { temporaryOnly: true });
      } catch (error) {
        console.warn("GoreeCloud Webspaces: temporary cleanup failed", error);
      }
    }
  }
}

function scheduleTemporaryCleanup() {
  if (cleanupTimer) clearTimeout(cleanupTimer);
  cleanupTimer = setTimeout(() => {
    cleanupTimer = null;
    cleanupTemporaryWebspaces().catch((error) =>
      console.warn("GoreeCloud Webspaces: temporary cleanup scheduling failed", error)
    );
  }, 350);
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

if (browser.menus) {
  browser.menus.onClicked.addListener((info, tab) => {
    handleMenuClick(info, tab).catch((error) => console.error("GoreeCloud Webspaces menu action failed", error));
  });
}

browser.tabs.onRemoved.addListener((tabId) => {
  transitionTabs.delete(tabId);
  scheduleTemporaryCleanup();
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