const $ = (selector) => document.querySelector(selector);
let cachedJobs = [];

function fmtBytes(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return "—";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let index = 0, amount = n;
  while (amount >= 1024 && index < units.length - 1) { amount /= 1024; index += 1; }
  return `${amount.toFixed(index ? 1 : 0)} ${units[index]}`;
}
function fmtSpeed(value) { return Number(value) > 0 ? `${fmtBytes(Number(value))}/s` : "—"; }
function fmtEta(value) {
  const seconds = Number(value);
  if (!Number.isFinite(seconds) || seconds < 0) return "—";
  if (seconds < 60) return `${Math.ceil(seconds)} sec`;
  if (seconds < 3600) return `${Math.ceil(seconds / 60)} min`;
  return `${Math.floor(seconds / 3600)} hr ${Math.ceil((seconds % 3600) / 60)} min`;
}
function basename(job) {
  if (job.filename) return String(job.filename).split(/[\\/]/).pop();
  try { return new URL(job.url).pathname.split("/").pop() || job.url; } catch (_) { return job.url; }
}
function isActive(job) { return ["starting", "in_progress", "downloading"].includes(job.state); }
function isRecoverableNative(job) {
  return Boolean(job.native && job.nativeStarted && ["interrupted", "error"].includes(job.state));
}
function matchesFilter(job, filter) {
  if (filter === "all") return true;
  if (filter === "active") return isActive(job);
  if (filter === "queued") return job.state === "queued";
  if (filter === "paused") return job.state === "paused";
  if (filter === "complete") return job.state === "complete";
  if (filter === "problem") return ["error", "interrupted", "cancelled"].includes(job.state);
  return true;
}
function actionButton(label, type, id, className = "") {
  const button = document.createElement("button");
  button.textContent = label;
  button.className = className;
  button.addEventListener("click", async () => {
    button.disabled = true;
    await browser.runtime.sendMessage({ type, id }).catch(() => {});
    await refresh();
  });
  return button;
}

function updateSummary(jobs) {
  $("#activeCount").textContent = jobs.filter(isActive).length;
  $("#queuedCount").textContent = jobs.filter((job) => job.state === "queued").length;
  $("#completeCount").textContent = jobs.filter((job) => job.state === "complete").length;
  $("#totalSpeed").textContent = fmtSpeed(jobs.reduce((sum, job) => sum + Number(job.speedBps || 0), 0));
}

function render() {
  updateSummary(cachedJobs);
  const search = $("#search").value.trim().toLowerCase();
  const filter = $("#filter").value;
  const jobs = cachedJobs.filter((job) => {
    if (!matchesFilter(job, filter)) return false;
    if (!search) return true;
    return `${basename(job)} ${job.url || ""} ${job.destination || ""}`.toLowerCase().includes(search);
  });

  const root = $("#jobs");
  root.replaceChildren();
  if (!jobs.length) {
    const empty = document.createElement("div");
    empty.className = "empty muted";
    empty.textContent = cachedJobs.length ? "No downloads match this view." : "No downloads yet.";
    root.appendChild(empty);
    return;
  }

  for (const job of jobs) {
    const row = document.createElement("div");
    row.className = "job";

    const identity = document.createElement("div");
    const title = document.createElement("div");
    title.className = "job-title";
    title.textContent = basename(job);
    title.title = basename(job);
    const url = document.createElement("div");
    url.className = "meta muted url";
    url.textContent = job.url || "";
    url.title = job.url || "";
    const badges = document.createElement("div");
    badges.className = "badges";
    const status = document.createElement("span");
    status.className = `status-badge ${job.state || ""}`;
    status.textContent = job.state === "queued" && job.queuePosition ? `queued #${job.queuePosition}` : (job.state || "queued");
    const engine = document.createElement("span");
    engine.className = "engine-badge muted";
    engine.textContent = job.native ? `native${job.effectiveSegments > 1 ? ` · ${job.effectiveSegments} segments` : ""}` : "Firefox";
    badges.append(status, engine);
    if (isRecoverableNative(job)) {
      const recoverable = document.createElement("span");
      recoverable.className = "engine-badge muted";
      recoverable.textContent = "recoverable";
      badges.appendChild(recoverable);
    }
    identity.append(title, url, badges);

    const progressBlock = document.createElement("div");
    const progress = document.createElement("progress");
    progress.max = 100;
    progress.value = job.totalBytes > 0 ? Math.min(100, (Number(job.bytesReceived || 0) / job.totalBytes) * 100) : 0;
    const progressMeta = document.createElement("div");
    progressMeta.className = "progress-meta meta muted";
    const bytes = document.createElement("span");
    bytes.textContent = `${fmtBytes(job.bytesReceived || 0)} / ${fmtBytes(job.totalBytes)}`;
    const percent = document.createElement("span");
    percent.textContent = job.totalBytes > 0 ? `${Math.floor(progress.value)}%` : "";
    progressMeta.append(bytes, percent);
    progressBlock.append(progress, progressMeta);

    const telemetry = document.createElement("div");
    telemetry.className = "meta";
    const speed = document.createElement("strong");
    speed.textContent = fmtSpeed(job.speedBps);
    const eta = document.createElement("div");
    eta.className = "muted";
    const noEtaStates = new Set(["paused", "interrupted", "error", "cancelled", "complete"]);
    eta.textContent = `ETA ${noEtaStates.has(job.state) ? "—" : fmtEta(job.etaSeconds)}`;
    telemetry.append(speed, eta);
    if (job.error) {
      const error = document.createElement("div");
      error.className = "muted";
      error.style.color = "var(--danger)";
      error.textContent = job.error;
      error.title = job.error;
      telemetry.appendChild(error);
    }
    if (isRecoverableNative(job)) {
      const recovery = document.createElement("div");
      recovery.className = "muted";
      recovery.textContent = "Resume preserves this job ID and reuses its saved native segments.";
      telemetry.appendChild(recovery);
    }

    const actions = document.createElement("div");
    actions.className = "actions";
    if (["starting", "in_progress", "downloading", "queued"].includes(job.state)) actions.appendChild(actionButton("Pause", "pause-job", job.id));
    if (job.state === "paused") actions.appendChild(actionButton("Resume", "resume-job", job.id));
    if (isRecoverableNative(job)) actions.appendChild(actionButton("Resume", "recover-job", job.id));
    if (!["complete", "cancelled", "error", "interrupted"].includes(job.state)) actions.appendChild(actionButton("Cancel", "cancel-job", job.id, "danger"));
    if (["error", "interrupted", "cancelled"].includes(job.state) && !isRecoverableNative(job)) actions.appendChild(actionButton("Retry", "retry-job", job.id));
    if (["complete", "cancelled", "error", "interrupted"].includes(job.state)) actions.appendChild(actionButton("Remove", "remove-job", job.id));

    row.append(identity, progressBlock, telemetry, actions);
    root.appendChild(row);
  }
}

async function refresh() {
  cachedJobs = await browser.runtime.sendMessage({ type: "list-jobs" }).catch(() => cachedJobs);
  render();
}

$("#start").addEventListener("click", async () => {
  const url = $("#url").value.trim();
  if (!url) return;
  $("#start").disabled = true;
  try {
    await browser.runtime.sendMessage({ type: "start-download", url });
    $("#url").value = "";
  } catch (error) {
    $("#url").setCustomValidity(String(error.message || error));
    $("#url").reportValidity();
    $("#url").setCustomValidity("");
  } finally {
    $("#start").disabled = false;
    await refresh();
  }
});
$("#url").addEventListener("keydown", (event) => { if (event.key === "Enter") $("#start").click(); });
$("#startBatch").addEventListener("click", async () => {
  const urls = $("#batch").value.split(/\r?\n/).map((value) => value.trim()).filter(Boolean);
  if (!urls.length) return;
  $("#startBatch").disabled = true;
  try {
    await browser.runtime.sendMessage({ type: "start-batch", urls });
    $("#batch").value = "";
  } catch (error) {
    alert(String(error.message || error));
  } finally {
    $("#startBatch").disabled = false;
    await refresh();
  }
});
$("#settings").addEventListener("click", () => browser.runtime.openOptionsPage());
$("#search").addEventListener("input", render);
$("#filter").addEventListener("change", render);
$("#pauseAll").addEventListener("click", async () => { await browser.runtime.sendMessage({ type: "pause-all" }); refresh(); });
$("#resumeAll").addEventListener("click", async () => { await browser.runtime.sendMessage({ type: "resume-all" }); refresh(); });
$("#clearCompleted").addEventListener("click", async () => { await browser.runtime.sendMessage({ type: "clear-completed" }); refresh(); });
browser.runtime.onMessage.addListener((message) => { if (["job-update", "job-remove"].includes(message?.type)) refresh(); });
refresh();
setInterval(refresh, 1000);
