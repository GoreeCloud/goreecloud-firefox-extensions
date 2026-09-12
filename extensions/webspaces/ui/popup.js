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

function sortedWebspaces(config) {
  return Object.values(config.webspaces ?? {}).sort((a, b) => {
    if (a.builtIn !== b.builtIn) return a.builtIn ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
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

  document.querySelector("#current-webspace").textContent = current?.name ?? "Normal Firefox";
  document.querySelector("#current-site").textContent = hostname ?? "Browser page";

  const routedTarget = decision.webspaceId ? config.webspaces?.[decision.webspaceId]?.name : null;
  const reason = reasonLabels[decision.reason] ?? decision.reason;
  document.querySelector("#routing-reason").textContent =
    routedTarget ? `Routing: ${routedTarget} — ${reason}` : reason;

  const toggle = document.querySelector("#routing-enabled");
  toggle.checked = config.routingEnabled !== false;
  document.querySelector("#routing-badge").textContent = toggle.checked ? "Routing on" : "Routing paused";

  const list = document.querySelector("#webspace-list");
  list.replaceChildren();
  for (const webspace of webspaces) {
    const row = document.createElement("div");
    row.className = "webspace";

    const label = document.createElement("span");
    label.textContent = webspace.name;

    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "Open";
    button.addEventListener("click", () => send("webspaces:open", { webspaceId: webspace.id }));

    row.append(label, button);
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
