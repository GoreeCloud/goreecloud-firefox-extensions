const BUILTIN_RULESET_ID = "goreecloud_builtin";
const CUSTOM_RULE_ID_START = 1000;
const STORAGE_KEY = "customRedirects";

const builtinToggle = document.querySelector("#builtin-toggle");
const ruleList = document.querySelector("#rule-list");
const newRuleButton = document.querySelector("#new-rule");
const editorCard = document.querySelector("#editor-card");
const ruleForm = document.querySelector("#rule-form");
const ruleId = document.querySelector("#rule-id");
const ruleName = document.querySelector("#rule-name");
const ruleSource = document.querySelector("#rule-source");
const ruleDestination = document.querySelector("#rule-destination");
const ruleEnabled = document.querySelector("#rule-enabled");
const formStatus = document.querySelector("#form-status");
const cancelEdit = document.querySelector("#cancel-edit");
const versionPill = document.querySelector("#version-pill");

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseHttpUrl(value, label) {
  let parsed;
  try {
    parsed = new URL(value.trim());
  } catch {
    throw new Error(`${label} must be a valid URL.`);
  }
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error(`${label} must use http:// or https://.`);
  }
  if (!parsed.hostname) throw new Error(`${label} must include a hostname.`);
  return parsed;
}

function normalizeSource(value) {
  const url = parseHttpUrl(value, "From");
  url.hash = "";
  url.search = "";
  let pathname = url.pathname || "/";
  if (pathname !== "/") pathname = pathname.replace(/\/+$/, "");
  return `${url.origin}${pathname === "/" ? "/" : pathname}`;
}

function normalizeDestination(value) {
  return parseHttpUrl(value, "To").toString();
}

function permissionOrigin(source) {
  const url = new URL(source);
  return `${url.protocol}//${url.host}/*`;
}

function sourceRegex(source) {
  const url = new URL(source);
  let base = `${url.origin}${url.pathname}`;
  if (base.endsWith("/") && url.pathname !== "/") base = base.slice(0, -1);
  if (url.pathname === "/") base = url.origin;
  return `^${escapeRegex(base)}(?:[/?].*)?$`;
}

function toDnrRule(rule) {
  return {
    id: rule.id,
    priority: 10,
    action: { type: "redirect", redirect: { url: rule.destination } },
    condition: { regexFilter: sourceRegex(rule.source), resourceTypes: ["main_frame"] }
  };
}

async function getStoredRules() {
  const stored = await browser.storage.local.get(STORAGE_KEY);
  return Array.isArray(stored[STORAGE_KEY]) ? stored[STORAGE_KEY] : [];
}

async function setStoredRules(rules) {
  await browser.storage.local.set({ [STORAGE_KEY]: rules });
}

async function ensurePermission(originPattern) {
  if (await browser.permissions.contains({ origins: [originPattern] })) return true;
  return browser.permissions.request({ origins: [originPattern] });
}

async function releaseUnusedPermission(originPattern, rules) {
  if (!originPattern || originPattern === "https://keep.google.com/*") return;
  if (rules.some((rule) => rule.permissionOrigin === originPattern)) return;
  try {
    await browser.permissions.remove({ origins: [originPattern] });
  } catch {
    // Firefox may retain user-managed grants; cleanup is best effort.
  }
}

async function setBuiltinEnabled(enabled) {
  await browser.declarativeNetRequest.updateEnabledRulesets(enabled
    ? { enableRulesetIds: [BUILTIN_RULESET_ID] }
    : { disableRulesetIds: [BUILTIN_RULESET_ID] });
}

async function refreshBuiltin() {
  const enabled = await browser.declarativeNetRequest.getEnabledRulesets();
  builtinToggle.checked = enabled.includes(BUILTIN_RULESET_ID);
}

async function reconcileCustomRules() {
  const storedRules = await getStoredRules();
  const existing = await browser.declarativeNetRequest.getDynamicRules();
  const customExistingIds = existing.map((rule) => rule.id).filter((id) => id >= CUSTOM_RULE_ID_START);
  const addRules = [];
  let changed = false;

  for (const rule of storedRules) {
    if (!rule.enabled) continue;
    const permitted = await browser.permissions.contains({ origins: [rule.permissionOrigin] });
    if (!permitted) {
      rule.enabled = false;
      changed = true;
      continue;
    }
    addRules.push(toDnrRule(rule));
  }

  await browser.declarativeNetRequest.updateDynamicRules({ removeRuleIds: customExistingIds, addRules });
  if (changed) await setStoredRules(storedRules);
  return storedRules;
}

function showEditor(rule = null) {
  formStatus.textContent = "";
  if (rule) {
    ruleId.value = String(rule.id);
    ruleName.value = rule.name;
    ruleSource.value = rule.source;
    ruleDestination.value = rule.destination;
    ruleEnabled.checked = rule.enabled;
  } else {
    ruleForm.reset();
    ruleId.value = "";
    ruleEnabled.checked = true;
  }
  editorCard.classList.remove("hidden");
  ruleName.focus();
  editorCard.scrollIntoView({ behavior: "smooth", block: "start" });
}

function hideEditor() {
  editorCard.classList.add("hidden");
  ruleForm.reset();
  ruleId.value = "";
  formStatus.textContent = "";
}

function createRuleElement(rule) {
  const row = document.createElement("article");
  row.className = "rule-row custom-rule";
  const copy = document.createElement("div");
  const title = document.createElement("strong");
  title.textContent = rule.name;
  const route = document.createElement("p");
  route.textContent = `${rule.source} → ${rule.destination}`;
  copy.append(title, route);

  const controls = document.createElement("div");
  controls.className = "rule-controls";
  const toggleLabel = document.createElement("label");
  toggleLabel.className = "switch";
  toggleLabel.setAttribute("aria-label", `Enable ${rule.name}`);
  const toggle = document.createElement("input");
  toggle.type = "checkbox";
  toggle.checked = rule.enabled;
  const slider = document.createElement("span");
  slider.className = "slider";
  toggleLabel.append(toggle, slider);

  const edit = document.createElement("button");
  edit.type = "button";
  edit.className = "text-button";
  edit.textContent = "Edit";
  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "text-button danger";
  remove.textContent = "Delete";

  toggle.addEventListener("change", async () => {
    toggle.disabled = true;
    try {
      const rules = await getStoredRules();
      const current = rules.find((item) => item.id === rule.id);
      if (!current) return;
      if (toggle.checked) {
        if (!await ensurePermission(current.permissionOrigin)) {
          toggle.checked = false;
          return;
        }
        current.enabled = true;
        await browser.declarativeNetRequest.updateDynamicRules({ removeRuleIds: [current.id], addRules: [toDnrRule(current)] });
      } else {
        current.enabled = false;
        await browser.declarativeNetRequest.updateDynamicRules({ removeRuleIds: [current.id] });
      }
      await setStoredRules(rules);
      await renderRules();
    } finally {
      toggle.disabled = false;
    }
  });

  edit.addEventListener("click", () => showEditor(rule));
  remove.addEventListener("click", async () => {
    if (!confirm(`Delete “${rule.name}”?`)) return;
    const rules = await getStoredRules();
    const next = rules.filter((item) => item.id !== rule.id);
    await browser.declarativeNetRequest.updateDynamicRules({ removeRuleIds: [rule.id] });
    await setStoredRules(next);
    await releaseUnusedPermission(rule.permissionOrigin, next);
    hideEditor();
    await renderRules();
  });

  controls.append(toggleLabel, edit, remove);
  row.append(copy, controls);
  return row;
}

async function renderRules() {
  const rules = await getStoredRules();
  ruleList.replaceChildren();
  if (!rules.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "No custom redirects yet. The built-in Keep → Memos rule is ready to use.";
    ruleList.append(empty);
    return;
  }
  for (const rule of rules.sort((a, b) => a.name.localeCompare(b.name))) ruleList.append(createRuleElement(rule));
}

builtinToggle.addEventListener("change", async () => {
  builtinToggle.disabled = true;
  try {
    await setBuiltinEnabled(builtinToggle.checked);
  } catch (error) {
    alert(`Could not update the built-in redirect: ${error.message}`);
  } finally {
    builtinToggle.disabled = false;
    await refreshBuiltin();
  }
});

newRuleButton.addEventListener("click", () => showEditor());
cancelEdit.addEventListener("click", hideEditor);

ruleForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  formStatus.textContent = "Validating…";
  try {
    const name = ruleName.value.trim();
    if (!name) throw new Error("Name is required.");
    const source = normalizeSource(ruleSource.value);
    const destination = normalizeDestination(ruleDestination.value);
    if (sourceRegex(source).length > 2000) throw new Error("From URL is too long.");
    const originPattern = permissionOrigin(source);
    if (!await ensurePermission(originPattern)) throw new Error("Firefox permission for the source site was not granted.");

    const rules = await getStoredRules();
    const currentId = Number(ruleId.value) || null;
    if (rules.find((rule) => rule.source === source && rule.id !== currentId)) {
      throw new Error(`A redirect for ${source} already exists.`);
    }
    if (new RegExp(sourceRegex(source)).test(destination)) {
      throw new Error("Destination must not match the source rule because that would create a redirect loop.");
    }

    const existing = currentId ? rules.find((rule) => rule.id === currentId) : null;
    const oldOrigin = existing?.permissionOrigin || null;
    const nextId = currentId || Math.max(CUSTOM_RULE_ID_START - 1, ...rules.map((rule) => rule.id)) + 1;
    const nextRule = { id: nextId, name, source, destination, enabled: ruleEnabled.checked, permissionOrigin: originPattern };
    const nextRules = currentId ? rules.map((rule) => rule.id === currentId ? nextRule : rule) : [...rules, nextRule];

    await browser.declarativeNetRequest.updateDynamicRules({ removeRuleIds: [nextId], addRules: nextRule.enabled ? [toDnrRule(nextRule)] : [] });
    await setStoredRules(nextRules);
    if (oldOrigin && oldOrigin !== originPattern) await releaseUnusedPermission(oldOrigin, nextRules);
    hideEditor();
    await renderRules();
  } catch (error) {
    formStatus.textContent = error.message;
  }
});

(async () => {
  try {
    versionPill.textContent = `v${browser.runtime.getManifest().version}`;
    await refreshBuiltin();
    await reconcileCustomRules();
    await renderRules();
  } catch (error) {
    ruleList.textContent = `Unable to initialize redirects: ${error.message}`;
  }
})();
