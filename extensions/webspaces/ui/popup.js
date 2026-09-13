import { hostnameFromUrl } from "../src/routing.js";
import { applyAccent, glyphFor } from "./identity.js";

const reasonLabels = {
  "user-exception": "User exception",
  "user-site-assignment": "Your site assignment",
  "exact-hostname-rule": "Exact hostname rule",
  "user-subdomain-rule": "Your subdomain rule",
  "provider-rule": "Built-in provider rule",
  "goreecloud-built-in-rule": "Built-in GoreeCloud rule",
  "standard-fallback": "Standard fallback for an unassigned website",
  "standard-webspace-unavailable": "Standard Webspace is unavailable",
  "local-development-explicit-only": "Local development sites require an explicit assignment",
  "routing-paused": "Automatic routing is paused",
  "routing-paused-timed": "Automatic routing is temporarily paused",
  "routing-paused-site": "Automatic routing is paused for this site",
  "routing-paused-restart": "Automatic routing is paused until Firefox restarts",
  "unsupported-or-invalid-url": "This page is not eligible for website routing"
};

let lastState = null;
let activeTab = null;

function sortedWebspaces(config) {
  return Object.values(config.webspaces ?? {}).sort((a, b) => {
    if (a.temporary !== b.temporary) return a.temporary ? 1 : -1;
    if (a.builtIn !== b.builtIn) return a.builtIn ? -1 : 1;
    if (a.id === "standard" && b.id !== "standard") return -1;
    if (b.id === "standard" && a.id !== "standard") return 1;
    return a.name.localeCompare(b.name);
  });
}

async function send(type, payload = {}) {
  return browser.runtime.sendMessage({ type, ...payload });
}

function explicitRuleForHost(config, hostname) {
  if (!hostname) return null;
  return (config.userRules ?? []).find((rule) => rule.value === hostname) ?? null;
}

function setStatus(message, error = false) {
  const node = document.querySelector("#assignment-status");
  node.textContent = message ?? "";
  node.dataset.state = error ? "error" : "ok";
}

function webspaceName(config, id) {
  return config.webspaces?.[id]?.name ?? id ?? "Normal Firefox";
}

function renderWhy(analysis, config) {
  const container = document.querySelector("#why-details");
  container.replaceChildren();

  const summary = document.createElement("p");
  const decision = analysis?.decision;
  const target = decision?.webspaceId ? webspaceName(config, decision.webspaceId) : "Normal Firefox";
  const reason = reasonLabels[decision?.reason] ?? decision?.reason ?? "No decision available";
  summary.textContent = `${target} was selected because: ${reason}.`;
  container.append(summary);

  if (Number.isFinite(decision?.priority)) {
    const priority = document.createElement("p");
    priority.textContent = `Rule priority: ${decision.priority}`;
    container.append(priority);
  }

  const candidates = analysis?.candidates ?? [];
  if (candidates.length) {
    const list = document.createElement("ul");
    for (const candidate of candidates.slice(0, 6)) {
      const item = document.createElement("li");
      const marker = candidate.selected ? "Selected" : "Considered";
      const destination = candidate.webspaceId ? webspaceName(config, candidate.webspaceId) : "Normal Firefox";
      item.textContent = `${marker}: ${candidate.value ?? "default"} → ${destination} (${candidate.priority})`;
      list.append(item);
    }
    container.append(list);
  }
}

function fillWebspaceSelect(select, webspaces, preferredId = null) {
  select.replaceChildren();
  for (const webspace of webspaces) {
    const option = document.createElement("option");
    option.value = webspace.id;
    option.textContent = webspace.temporary ? `${webspace.name} · Temporary` : webspace.name;
    option.selected = preferredId === webspace.id;
    select.append(option);
  }
}

async function render() {
  const state = await send("webspaces:get-state");
  lastState = state;
  const { config, activity } = state;
  [activeTab] = await browser.tabs.query({ active: true, currentWindow: true });

  const webspaces = sortedWebspaces(config);
  const current = webspaces.find((item) => item.cookieStoreId === activeTab?.cookieStoreId);
  const hostname = hostnameFromUrl(activeTab?.url ?? "");
  const analysis = await send("webspaces:explain-url", { url: activeTab?.url ?? "" });
  const decision = analysis.decision;

  const currentCard = document.querySelector("#current-card");
  const currentEmblem = document.querySelector("#current-emblem");
  applyAccent(currentCard, current);
  applyAccent(currentEmblem, current);
  currentEmblem.textContent = glyphFor(current);

  document.querySelector("#current-webspace").textContent = current?.name ?? "Normal Firefox";
  document.querySelector("#current-site").textContent = hostname ?? "Browser page";

  const routedTarget = decision.webspaceId ? webspaceName(config, decision.webspaceId) : null;
  const reason = reasonLabels[decision.reason] ?? decision.reason;
  document.querySelector("#routing-reason").textContent = routedTarget
    ? `Routing: ${routedTarget} — ${reason}`
    : reason;
  renderWhy(analysis, config);

  const closeForget = document.querySelector("#close-forget");
  closeForget.hidden = current?.temporary !== true;
  closeForget.dataset.webspaceId = current?.temporary ? current.id : "";

  const toggle = document.querySelector("#routing-enabled");
  const enabled = config.routingEnabled !== false;
  toggle.checked = enabled;
  const badge = document.querySelector("#routing-badge");
  badge.dataset.routingState = enabled ? "on" : "paused";
  badge.querySelector("span:last-child").textContent = enabled ? "Routing on" : "Routing paused";

  const list = document.querySelector("#webspace-list");
  list.replaceChildren();
  for (const webspace of webspaces) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "webspace glz-surface";
    button.setAttribute("aria-label", `Open ${webspace.name} Webspace`);
    applyAccent(button, webspace);

    const identity = document.createElement("span");
    identity.className = "space-identity";

    const emblem = document.createElement("span");
    emblem.className = "space-emblem";
    emblem.setAttribute("aria-hidden", "true");
    emblem.textContent = glyphFor(webspace);
    applyAccent(emblem, webspace);

    const copy = document.createElement("span");
    copy.className = "space-launch-copy";
    const label = document.createElement("span");
    label.className = "space-name";
    label.textContent = webspace.name;
    const meta = document.createElement("span");
    meta.className = "space-meta";
    const tabs = activity?.tabCounts?.[webspace.id] ?? 0;
    meta.textContent = `${tabs} ${tabs === 1 ? "tab" : "tabs"}${webspace.temporary ? " · Temporary" : ""}`;
    copy.append(label, meta);

    const indicator = document.createElement("span");
    indicator.className = "space-open-indicator";
    indicator.setAttribute("aria-hidden", "true");
    indicator.textContent = "↗";

    identity.append(emblem, copy);
    button.append(identity, indicator);
    button.addEventListener("click", () => send("webspaces:open", { webspaceId: webspace.id }));
    list.append(button);
  }

  const siteTools = document.querySelector("#site-tools");
  siteTools.hidden = !hostname;
  if (hostname) {
    const explicit = explicitRuleForHost(config, hostname);
    fillWebspaceSelect(document.querySelector("#assignment-target"), webspaces, explicit?.webspaceId ?? decision.webspaceId);
    fillWebspaceSelect(document.querySelector("#move-target"), webspaces, current?.id ?? decision.webspaceId);
    document.querySelector("#remove-assignment").hidden = !explicit;
  }
}

document.querySelector("#routing-enabled").addEventListener("change", async (event) => {
  await send("webspaces:set-routing", { enabled: event.target.checked });
  await render();
});

document.querySelector("#assign-site").addEventListener("click", async () => {
  const hostname = hostnameFromUrl(activeTab?.url ?? "");
  if (!hostname) return;
  try {
    const target = document.querySelector("#assignment-target").value;
    await send("webspaces:assign-site", { hostname, webspaceId: target });
    setStatus(`${hostname} will always open in ${webspaceName(lastState.config, target)}.`);
    await render();
  } catch (error) {
    setStatus(error.message, true);
  }
});

document.querySelector("#move-tab").addEventListener("click", async () => {
  if (!activeTab?.id || !activeTab?.url) return;
  try {
    const target = document.querySelector("#move-target").value;
    await send("webspaces:move-current", { tabId: activeTab.id, url: activeTab.url, webspaceId: target });
    window.close();
  } catch (error) {
    setStatus(error.message, true);
  }
});

document.querySelector("#remove-assignment").addEventListener("click", async () => {
  const hostname = hostnameFromUrl(activeTab?.url ?? "");
  if (!hostname) return;
  try {
    await send("webspaces:remove-site-assignment", { hostname });
    setStatus(`Explicit assignment removed for ${hostname}.`);
    await render();
  } catch (error) {
    setStatus(error.message, true);
  }
});

document.querySelector("#new-temporary").addEventListener("click", async () => {
  try {
    await send("webspaces:create", {
      open: true,
      webspace: {
        name: `Temporary ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
        color: "gray",
        icon: "circle",
        description: "Disposable browsing identity",
        temporary: true
      }
    });
    window.close();
  } catch (error) {
    setStatus(error.message, true);
  }
});

document.querySelector("#close-forget").addEventListener("click", async (event) => {
  const webspaceId = event.currentTarget.dataset.webspaceId;
  if (!webspaceId) return;
  if (!confirm("Close all tabs in this temporary Webspace and remove its Firefox contextual identity?")) return;
  try {
    await send("webspaces:close-forget", { webspaceId });
    window.close();
  } catch (error) {
    setStatus(error.message, true);
  }
});

document.querySelector("#manage").addEventListener("click", () => browser.runtime.openOptionsPage());

render().catch((error) => {
  document.querySelector("#current-webspace").textContent = "Webspaces unavailable";
  document.querySelector("#routing-reason").textContent = error.message;
});
