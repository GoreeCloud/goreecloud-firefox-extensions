function send(type, payload = {}) {
  return browser.runtime.sendMessage({ type, ...payload });
}

function plural(count, singular, pluralValue = `${singular}s`) {
  return `${count} ${count === 1 ? singular : pluralValue}`;
}

function issueLabel(code) {
  switch (code) {
    case "missing-cookie-store": return "No Firefox cookie store";
    case "missing-firefox-identity": return "Firefox identity missing";
    case "shared-cookie-store": return "Cookie store shared with another Webspace";
    default: return code;
  }
}

function renderMetric(label, value) {
  const item = document.createElement("div");
  item.className = "isolation-metric";
  const valueNode = document.createElement("strong");
  valueNode.textContent = String(value);
  const labelNode = document.createElement("span");
  labelNode.textContent = label;
  item.append(valueNode, labelNode);
  return item;
}

function renderRecord(record) {
  const row = document.createElement("div");
  row.className = "isolation-row";
  row.dataset.state = record.healthy ? "healthy" : "issue";

  const copy = document.createElement("div");
  copy.className = "isolation-copy";
  const name = document.createElement("strong");
  name.textContent = record.name;
  const detail = document.createElement("span");
  detail.textContent = record.healthy
    ? "Dedicated Firefox identity · unique cookie store"
    : record.issues.map(issueLabel).join(" · ");
  copy.append(name, detail);

  const status = document.createElement("span");
  status.className = "isolation-status";
  status.dataset.state = record.healthy ? "healthy" : "issue";
  status.textContent = record.healthy ? "Isolated" : "Attention";

  row.append(copy, status);
  return row;
}

async function refreshIsolationHealth() {
  const panel = document.querySelector("#isolation-health-panel");
  const summary = document.querySelector("#isolation-health-summary");
  const metrics = document.querySelector("#isolation-health-metrics");
  const list = document.querySelector("#isolation-health-list");
  const status = document.querySelector("#isolation-health-status");

  try {
    // Ensure the main Webspaces background has provisioned built-ins before
    // inspecting the persisted identity map.
    await send("webspaces:get-state");
    const health = await send("webspaces:get-isolation-health");

    panel.dataset.state = health.healthy ? "healthy" : "issue";
    summary.dataset.state = health.healthy ? "ok" : "warning";
    summary.textContent = health.healthy
      ? "Isolation healthy"
      : plural(health.issueCount, "isolation issue");

    metrics.replaceChildren(
      renderMetric("Managed Webspaces", health.managedWebspaces),
      renderMetric("Unique cookie stores", health.uniqueCookieStores),
      renderMetric("Firefox identities present", health.firefoxIdentitiesPresent)
    );

    list.replaceChildren(...health.records.map(renderRecord));
    status.textContent = health.healthy
      ? "Firefox reports a distinct contextual identity and cookie store for every GoreeCloud-managed Webspace."
      : "Webspaces detected an isolation integrity problem. Automatic operation should remain fail-closed until the affected identity mapping is repaired.";
    status.dataset.state = health.healthy ? "ok" : "error";
  } catch (error) {
    panel.dataset.state = "issue";
    summary.dataset.state = "warning";
    summary.textContent = "Unable to verify";
    metrics.replaceChildren();
    list.replaceChildren();
    status.textContent = `Isolation health check failed: ${error.message}`;
    status.dataset.state = "error";
  }
}

refreshIsolationHealth();
browser.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.webspacesConfig) refreshIsolationHealth();
});
