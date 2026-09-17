const status = document.querySelector("#status");
const refreshButton = document.querySelector("#refresh");
const openSidebar = document.querySelector("#open-sidebar");
const storeHealth = document.querySelector("#store-health");

function setText(id, value) {
  const element = document.querySelector(`#${id}`);
  if (element) element.textContent = String(value);
}

function renderStore(name, store) {
  const row = document.createElement("div");
  row.className = "store-row";

  const main = document.createElement("div");
  const title = document.createElement("div");
  title.className = "store-name";
  title.textContent = name;
  const meta = document.createElement("div");
  meta.className = "store-meta";
  meta.textContent = store?.available
    ? `Schema ${store.schemaVersion ?? "unknown"} · revision ${store.revision ?? "unknown"}`
    : "Store unavailable";
  main.append(title, meta);

  const state = document.createElement("div");
  state.className = "store-status";
  state.textContent = store?.available ? "Available" : "Degraded";

  row.append(main, state);
  return row;
}

function render(model) {
  setText("source-version", model.source.version);
  setText("source-lifecycle", `${model.source.lifecycle} · ${model.source.state}`);
  setText("component-class", model.source.componentClass);
  setText("firefox-baseline", `${model.source.minimumFirefoxVersion}+`);

  setText("count-tabs", model.counts.tabs);
  setText("count-windows", model.counts.windows);
  setText("count-groups", model.counts.nativeGroups);
  setText("count-tree", model.counts.treeChildren);
  setText("count-pinned", model.counts.pinned);
  setText("count-discarded", model.counts.discarded);
  setText("count-tab-sets", model.counts.tabSets);
  setText("count-stashed", model.counts.stashed);
  setText("count-snoozed", model.counts.snoozed);
  setText("count-rules", model.counts.rules);

  setText("extension-permissions", model.permissions.extension.join(", ") || "None");
  setText("host-permissions", model.permissions.hosts.join(", ") || "None");
  setText("content-scripts", model.permissions.contentScripts);
  setText("private-browsing", model.permissions.incognitoMode === "not_allowed" ? "Not allowed" : model.permissions.incognitoMode);

  storeHealth.replaceChildren(
    renderStore("Organizational state", model.stores.organizational),
    renderStore("Snooze recovery", model.stores.snooze),
    renderStore("Rule state", model.stores.rules)
  );

  const degraded = Object.values(model.availability).some((available) => !available);
  status.textContent = degraded
    ? `State read completed with degraded sources · ${new Date(model.generatedAt).toLocaleString()}`
    : `Current state read successfully · ${new Date(model.generatedAt).toLocaleString()}`;
}

async function load() {
  status.textContent = "Reading current Firefox and extension state…";
  const result = await browser.runtime.sendMessage({ type: "atm:get-manager-state" });
  if (!result?.ok || !result.model) {
    status.textContent = `Manager state is unavailable (${result?.reason || "unknown error"}).`;
    return;
  }
  render(result.model);
}

refreshButton.addEventListener("click", () => {
  load().catch((error) => {
    console.error(error);
    status.textContent = "Unable to refresh manager state.";
  });
});

openSidebar.addEventListener("click", async () => {
  await browser.sidebarAction.open();
});

load().catch((error) => {
  console.error(error);
  status.textContent = "Unable to read manager state.";
});
