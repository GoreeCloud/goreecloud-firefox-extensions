async function send(type, payload = {}) {
  return browser.runtime.sendMessage({ type, ...payload });
}

function sortedWebspaces(config) {
  return Object.values(config.webspaces ?? {}).sort((a, b) => {
    if (a.builtIn !== b.builtIn) return a.builtIn ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

async function render() {
  const { config } = await send("webspaces:get-state");
  const webspaces = sortedWebspaces(config);
  const webspaceById = new Map(webspaces.map((item) => [item.id, item]));

  document.querySelector("#routing-enabled").checked = config.routingEnabled !== false;

  const grid = document.querySelector("#webspace-grid");
  grid.replaceChildren();
  for (const webspace of webspaces) {
    const card = document.createElement("article");
    card.className = "card";

    const title = document.createElement("h3");
    title.textContent = webspace.name;

    const kind = document.createElement("div");
    kind.className = "kind";
    kind.textContent = webspace.builtIn ? "Built-in Webspace" : "Custom Webspace";

    const open = document.createElement("button");
    open.type = "button";
    open.textContent = "Open new tab";
    open.addEventListener("click", () => send("webspaces:open", { webspaceId: webspace.id }));

    card.append(title, kind, document.createElement("br"), open);
    grid.append(card);
  }

  const list = document.querySelector("#assignment-list");
  list.replaceChildren();
  const rules = (config.userRules ?? []).filter((rule) => rule.kind === "domain");
  document.querySelector("#no-assignments").hidden = rules.length > 0;

  for (const rule of rules) {
    const row = document.createElement("div");
    row.className = "assignment";

    const domain = document.createElement("strong");
    domain.textContent = rule.value;

    const target = document.createElement("span");
    target.textContent = webspaceById.get(rule.webspaceId)?.name ?? rule.webspaceId;

    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "Remove";
    remove.addEventListener("click", async () => {
      await send("webspaces:remove-assignment", { ruleId: rule.id });
      await render();
    });

    row.append(domain, target, remove);
    list.append(row);
  }
}

document.querySelector("#routing-enabled").addEventListener("change", async (event) => {
  await send("webspaces:set-routing", { enabled: event.target.checked });
  await render();
});

document.querySelector("#create-webspace").addEventListener("submit", async (event) => {
  event.preventDefault();
  const status = document.querySelector("#create-status");
  status.textContent = "Creating…";
  try {
    await send("webspaces:create", {
      webspace: {
        name: document.querySelector("#new-name").value,
        color: document.querySelector("#new-color").value,
        icon: document.querySelector("#new-icon").value
      }
    });
    event.target.reset();
    status.textContent = "Webspace created.";
    await render();
  } catch (error) {
    status.textContent = error.message;
  }
});

render().catch((error) => {
  document.querySelector("#create-status").textContent = error.message;
});
