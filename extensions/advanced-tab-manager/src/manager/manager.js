const MAX_IMPORT_BYTES = 16 * 1024 * 1024;

const status = document.querySelector("#status");
const refreshButton = document.querySelector("#refresh");
const openSidebar = document.querySelector("#open-sidebar");
const storeHealth = document.querySelector("#store-health");
const exportBackup = document.querySelector("#export-backup");
const importFile = document.querySelector("#import-file");
const importPreview = document.querySelector("#import-preview");
const applyImport = document.querySelector("#apply-import");
const clearImport = document.querySelector("#clear-import");
const createSnapshot = document.querySelector("#create-snapshot");
const snapshotRetention = document.querySelector("#snapshot-retention");
const saveRetention = document.querySelector("#save-retention");
const snapshotList = document.querySelector("#snapshot-list");

let pendingImport = null;
let pendingPreview = null;
let lastManagerModel = null;

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

function renderSnapshotList(snapshotState) {
  snapshotList.replaceChildren();
  const items = Array.isArray(snapshotState?.items) ? snapshotState.items : [];
  snapshotRetention.value = String(snapshotState?.retention ?? 10);

  if (!items.length) {
    const empty = document.createElement("p");
    empty.className = "snapshot-empty";
    empty.textContent = "No local session snapshots yet.";
    snapshotList.append(empty);
    return;
  }

  for (const item of items) {
    const card = document.createElement("div");
    card.className = "snapshot-card";

    const details = document.createElement("div");
    const title = document.createElement("div");
    title.className = "snapshot-title";
    title.textContent = new Date(item.createdAt).toLocaleString();
    const meta = document.createElement("div");
    meta.className = "snapshot-meta";
    meta.textContent = `${item.windows} window${item.windows === 1 ? "" : "s"} · ${item.tabs} tab${item.tabs === 1 ? "" : "s"}`;
    details.append(title, meta);

    const actions = document.createElement("div");
    actions.className = "snapshot-actions";
    const restore = document.createElement("button");
    restore.type = "button";
    restore.dataset.action = "restore";
    restore.dataset.snapshotId = item.id;
    restore.textContent = "Restore";
    const remove = document.createElement("button");
    remove.type = "button";
    remove.dataset.action = "delete";
    remove.dataset.snapshotId = item.id;
    remove.textContent = "Delete";
    actions.append(restore, remove);

    card.append(details, actions);
    snapshotList.append(card);
  }
}

function render(model) {
  lastManagerModel = model;
  setText("source-version", model.source.version);
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
  setText("count-session-snapshots", model.counts.sessionSnapshots);

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

function resetImportPreview(message = "Choose a GoreeCloud Advanced Tab Manager backup to validate it before replacement.") {
  pendingImport = null;
  pendingPreview = null;
  importPreview.replaceChildren();
  const text = document.createElement("p");
  text.className = "portability-note";
  text.textContent = message;
  importPreview.append(text);
  applyImport.disabled = true;
  clearImport.disabled = true;
}

function metric(label, value) {
  const row = document.createElement("div");
  const dt = document.createElement("dt");
  const dd = document.createElement("dd");
  dt.textContent = label;
  dd.textContent = String(value);
  row.append(dt, dd);
  return row;
}

function renderImportPreview(preview) {
  importPreview.replaceChildren();
  const heading = document.createElement("p");
  heading.className = "portability-summary";
  heading.textContent = `Integrity verified · exported ${new Date(preview.exportedAt).toLocaleString()} · source ${preview.sourceVersion}`;

  const counts = document.createElement("dl");
  counts.className = "portability-counts";
  counts.append(
    metric("Tab Sets", preview.importedCounts.tabSets),
    metric("Stashed", preview.importedCounts.stashed),
    metric("Session snapshots", preview.importedCounts.sessionSnapshots),
    metric("Snoozed", preview.importedCounts.snoozed),
    metric("Rules", preview.importedCounts.rules),
    metric("ID conflicts", Object.values(preview.conflictCounts).reduce((sum, value) => sum + value, 0))
  );

  const warning = document.createElement("p");
  warning.className = "portability-warning";
  warning.textContent = "Applying this import replaces Advanced Tab Manager local organizational state (including session snapshots), snooze state, and rule state. It does not open browser tabs. Live Firefox tabs remain untouched.";
  importPreview.append(heading, counts, warning);
  applyImport.disabled = false;
  clearImport.disabled = false;
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

async function createCurrentSessionSnapshot() {
  status.textContent = "Capturing current Firefox session…";
  const result = await browser.runtime.sendMessage({ type: "atm:create-session-snapshot" });
  if (!result?.ok) {
    status.textContent = `Session snapshot failed (${result?.reason || "unknown error"}).`;
    return;
  }
  status.textContent = `Session snapshot captured: ${result.windowCount} window(s), ${result.tabCount} tab(s)${result.prunedCount ? `; pruned ${result.prunedCount} snapshot(s) by retention` : ""}.`;
  await load();
}

async function saveSnapshotRetention() {
  const retention = Number(snapshotRetention.value);
  if (!Number.isInteger(retention) || retention < 1 || retention > 50) {
    status.textContent = "Snapshot retention must be an integer from 1 through 50.";
    return;
  }
  const currentCount = lastManagerModel?.counts?.sessionSnapshots ?? 0;
  if (retention < currentCount && !window.confirm(`Reducing retention to ${retention} will permanently prune ${currentCount - retention} older local snapshot(s). Continue?`)) {
    return;
  }
  const result = await browser.runtime.sendMessage({ type: "atm:set-snapshot-retention", retention });
  if (!result?.ok) {
    status.textContent = `Retention update failed (${result?.reason || "unknown error"}).`;
    return;
  }
  status.textContent = `Snapshot retention set to ${result.retention}${result.prunedCount ? `; pruned ${result.prunedCount} older snapshot(s)` : ""}.`;
  await load();
}

async function handleSnapshotAction(button) {
  const sessionSnapshotId = button?.dataset?.snapshotId;
  if (!sessionSnapshotId) return;
  if (button.dataset.action === "restore") {
    if (!window.confirm("Restore this local session snapshot into new Firefox windows? Your current live windows will remain open.")) return;
    status.textContent = "Restoring session snapshot into new windows…";
    const result = await browser.runtime.sendMessage({ type: "atm:restore-session-snapshot", sessionSnapshotId });
    status.textContent = result?.ok
      ? `Session snapshot restored into ${result.restoredWindowCount} new window(s) with ${result.restoredTabCount} tab(s).`
      : `Session snapshot restore failed (${result?.reason || "unknown error"})${result?.rolledBackWindowCount ? `; rolled back ${result.rolledBackWindowCount} created window(s)` : ""}.`;
    return;
  }
  if (button.dataset.action === "delete") {
    if (!window.confirm("Delete this local session snapshot? This cannot be undone except from a prior Advanced Tab Manager backup.")) return;
    const result = await browser.runtime.sendMessage({ type: "atm:delete-session-snapshot", sessionSnapshotId });
    status.textContent = result?.ok ? "Session snapshot deleted." : `Snapshot deletion failed (${result?.reason || "unknown error"}).`;
    if (result?.ok) await load();
  }
}

async function exportCurrentBackup() {
  status.textContent = "Building local backup…";
  const result = await browser.runtime.sendMessage({ type: "atm:export-backup" });
  if (!result?.ok || !result.bundle) {
    status.textContent = `Backup export failed (${result?.reason || "unknown error"}).`;
    return;
  }
  const blob = new Blob([`${JSON.stringify(result.bundle, null, 2)}\n`], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = result.filename || "goreecloud-advanced-tab-manager-backup.json";
  link.hidden = true;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
  status.textContent = "Backup created locally. Treat the exported JSON as private browsing-organization data.";
}

async function previewSelectedImport(file) {
  resetImportPreview("Validating backup…");
  if (!file) return;
  if (file.size > MAX_IMPORT_BYTES) {
    resetImportPreview("Backup rejected: file exceeds the 16 MiB import safety limit.");
    return;
  }
  let bundle;
  try {
    bundle = JSON.parse(await file.text());
  } catch {
    resetImportPreview("Backup rejected: the selected file is not valid JSON.");
    return;
  }
  const result = await browser.runtime.sendMessage({ type: "atm:preview-import", bundle });
  if (!result?.ok || !result.preview) {
    resetImportPreview(`Backup rejected (${result?.reason || "validation failed"}).`);
    return;
  }
  pendingImport = bundle;
  pendingPreview = result.preview;
  renderImportPreview(result.preview);
}

async function applySelectedImport() {
  if (!pendingImport || !pendingPreview) return;
  const confirmed = window.confirm("Replace Advanced Tab Manager local organizational state (including session snapshots), snooze state, and rule state with this validated backup? Live Firefox tabs will not be opened or closed by the import itself.");
  if (!confirmed) return;

  applyImport.disabled = true;
  status.textContent = "Applying validated local backup…";
  const result = await browser.runtime.sendMessage({
    type: "atm:apply-import",
    bundle: pendingImport,
    expectedRevisions: pendingPreview.expectedRevisions
  });
  if (!result?.ok) {
    status.textContent = `Import failed (${result?.reason || "unknown error"})${result?.rolledBack ? "; previous local state restored" : ""}.`;
    applyImport.disabled = false;
    return;
  }
  importFile.value = "";
  resetImportPreview("Import applied and verified. Choose another backup to preview it.");
  status.textContent = "Import applied successfully; local state and snooze alarms were verified.";
  await load();
}

refreshButton.addEventListener("click", () => load().catch((error) => {
  console.error(error);
  status.textContent = "Unable to refresh manager state.";
}));
openSidebar.addEventListener("click", async () => { await browser.sidebarAction.open(); });
exportBackup.addEventListener("click", () => exportCurrentBackup().catch((error) => {
  console.error(error);
  status.textContent = "Unable to export the local backup.";
}));
importFile.addEventListener("change", () => previewSelectedImport(importFile.files?.[0]).catch((error) => {
  console.error(error);
  resetImportPreview("Backup preview failed unexpectedly.");
}));
applyImport.addEventListener("click", () => applySelectedImport().catch((error) => {
  console.error(error);
  status.textContent = "Unable to apply the selected backup.";
  applyImport.disabled = false;
}));
clearImport.addEventListener("click", () => {
  importFile.value = "";
  resetImportPreview();
});
createSnapshot.addEventListener("click", () => createCurrentSessionSnapshot().catch((error) => {
  console.error(error);
  status.textContent = "Unable to create the session snapshot.";
}));
saveRetention.addEventListener("click", () => saveSnapshotRetention().catch((error) => {
  console.error(error);
  status.textContent = "Unable to update snapshot retention.";
}));
snapshotList.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action][data-snapshot-id]");
  if (!button) return;
  handleSnapshotAction(button).catch((error) => {
    console.error(error);
    status.textContent = "Unable to complete the snapshot action.";
  });
});

resetImportPreview();
load().catch((error) => {
  console.error(error);
  status.textContent = "Unable to read manager state.";
});
