import { evaluateRouting, hostnameFromUrl } from "../src/routing.js";

const reasonLabels = {
  "user-exception": "User exception",
  "user-site-assignment": "Your site assignment",
  "exact-hostname-rule": "Exact hostname rule",
  "user-subdomain-rule": "Your subdomain rule",
  "provider-rule": "Built-in provider rule",
  "goreecloud-built-in-rule": "Built-in GoreeCloud rule",
  "default-webspace": "Default Webspace",
  "routing-paused": "Automatic routing is paused",
  "no-matching-rule": "No automatic routing rule matched",
  "unsupported-or-invalid-url": "This page is not eligible for website routing"
};

const colorMap = {
  blue: "#3478f6",
  turquoise: "#1c8a8d",
  green: "#2f9e63",
  yellow: "#d9a35f",
  orange: "#c57a25",
  red: "#c63b32",
  pink: "#b95b8b",
  purple: "#7657f6"
};

const builtinColor = {
  goreecloud: "blue",
  google: "red",
  microsoft: "purple",
  meta: "turquoise"
};

function sortedWebspaces(config) {
  return Object.values(config.webspaces ?? {}).sort((a, b) => {
    if (a.builtIn !== b.builtIn) return a.builtIn ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

function accentFor(webspace) {
  const key = webspace?.color ?? builtinColor[webspace?.id] ?? "blue";
  return colorMap[key] ?? colorMap.blue;
}

function glyphFor(webspace) {
  const name = webspace?.name?.trim() || "W";
  return name.slice(0, 1).toUpperCase();
}

function applyAccent(element, webspace) {
  element.style.setProperty("--space-accent", accentFor(webspace));
}

async function send(type, payload = {}) {
  return browser.runtime.sendMessage({ type, ...payload });
}

async function render() {
  const { config } = await send("webspaces:get-state");
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  const webspaces = sortedWebspaces(config);
  const current = webspaces.find((item) => item.cookieStoreId === tab?.cookieStoreId);
  const hostname = hostnameFromUrl(tab?.url ?? "");
  const decision = evaluateRouting(tab?.url ?? "", config);

  const currentCard = document.querySelector("#current-card");
  const currentEmblem = document.querySelector("#current-emblem");
  applyAccent(currentCard, current);
  applyAccent(currentEmblem, current);
  currentEmblem.textContent = glyphFor(current);

  document.querySelector("#current-webspace").textContent = current?.name ?? "Normal Firefox";
  document.querySelector("#current-site").textContent = hostname ?? "Browser page";

  const routedTarget = decision.webspaceId ? config.webspaces?.[decision.webspaceId]?.name : null;
  const reason = reasonLabels[decision.reason] ?? decision.reason;
  document.querySelector("#routing-reason").textContent =
    routedTarget ? `Routing: ${routedTarget} — ${reason}` : reason;

  const toggle = document.querySelector("#routing-enabled");
  const enabled = config.routingEnabled !== false;
  toggle.checked = enabled;
  const badge = document.querySelector("#routing-badge");
  badge.dataset.routingState = enabled ? "on" : "paused";
  badge.querySelector("span:last-child").textContent = enabled ? "Routing on" : "Routing paused";

  const list = document.querySelector("#webspace-list");
  list.replaceChildren();
  for (const webspace of webspaces) {
    const row = document.createElement("div");
    row.className = "webspace";
    applyAccent(row, webspace);

    const identity = document.createElement("div");
    identity.className = "space-identity";

    const emblem = document.createElement("span");
    emblem.className = "space-emblem";
    emblem.setAttribute("aria-hidden", "true");
    emblem.textContent = glyphFor(webspace);
    applyAccent(emblem, webspace);

    const label = document.createElement("span");
    label.className = "space-name";
    label.textContent = webspace.name;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "glz-button";
    button.textContent = "Open";
    button.addEventListener("click", () => send("webspaces:open", { webspaceId: webspace.id }));

    identity.append(emblem, label);
    row.append(identity, button);
    list.append(row);
  }

  const assignmentSection = document.querySelector("#assignment-section");
  assignmentSection.hidden = !hostname;
  const select = document.querySelector("#assignment-target");
  select.replaceChildren();
  for (const webspace of webspaces) {
    const option = document.createElement("option");
    option.value = webspace.id;
    option.textContent = webspace.name;
    if (decision.webspaceId === webspace.id) option.selected = true;
    select.append(option);
  }
}

document.querySelector("#routing-enabled").addEventListener("change", async (event) => {
  await send("webspaces:set-routing", { enabled: event.target.checked });
  await render();
});

document.querySelector("#assign-site").addEventListener("click", async () => {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  const hostname = hostnameFromUrl(tab?.url ?? "");
  if (!hostname) return;

  const select = document.querySelector("#assignment-target");
  await send("webspaces:assign-site", {
    hostname,
    webspaceId: select.value
  });
  document.querySelector("#assignment-status").textContent = `${hostname} is now assigned.`;
  await render();
});

document.querySelector("#manage").addEventListener("click", () => browser.runtime.openOptionsPage());

render().catch((error) => {
  document.querySelector("#current-webspace").textContent = "Webspaces unavailable";
  document.querySelector("#routing-reason").textContent = error.message;
});
