const $ = (selector) => document.querySelector(selector);

function fmtBytes(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return "—";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let index = 0;
  let amount = n;
  while (amount >= 1024 && index < units.length - 1) { amount /= 1024; index += 1; }
  return `${amount.toFixed(index ? 1 : 0)} ${units[index]}`;
}
function fmtSpeed(value) { return Number(value) > 0 ? `${fmtBytes(Number(value))}/s` : "—"; }
function fmtEta(value) {
  const seconds = Number(value);
  if (!Number.isFinite(seconds) || seconds < 0) return "—";
  if (seconds < 60) return `${Math.ceil(seconds)}s`;
  if (seconds < 3600) return `${Math.ceil(seconds / 60)}m`;
  return `${Math.floor(seconds / 3600)}h ${Math.ceil((seconds % 3600) / 60)}m`;
}
function basename(job) {
  if (job.filename) return String(job.filename).split(/[\\/]/).pop();
  try { return new URL(job.url).pathname.split("/").pop() || job.url; } catch (_) { return job.url; }
}
function engineLabel(job) {
  if (!job.native) return "Firefox";
  const count = Number(job.effectiveSegments || job.segments || 1);
  return count > 1 ? `native · ${count} segments` : "native · single stream";
}
function button(label, type, id) {
  const element = document.createElement("button");
  element.textContent = label;
  element.addEventListener("click", async () => {
    element.disabled = true;
    await browser.runtime.sendMessage({ type, id }).catch(() => {});
    await render();
  });
  return element;
}

async function render() {
  const jobs = await browser.runtime.sendMessage({ type: "list-jobs" });
  const visible = jobs.slice(0, 6);
  const active = jobs.filter((job) => ["starting", "in_progress", "downloading"].includes(job.state)).length;
  const queued = jobs.filter((job) => job.state === "queued").length;
  const totalSpeed = jobs.reduce((sum, job) => sum + Number(job.speedBps || 0), 0);
  $("#summary").textContent = `${active} active · ${queued} queued`;
  $("#speed").textContent = active ? fmtSpeed(totalSpeed) : "";

  const root = $("#jobs");
  root.replaceChildren();
  if (!visible.length) {
    const empty = document.createElement("div");
    empty.className = "muted";
    empty.style.cssText = "font-size:12px;padding:14px 0";
    empty.textContent = "No downloads yet.";
    root.appendChild(empty);
    return;
  }

  for (const job of visible) {
    const wrap = document.createElement("div");
    wrap.className = "job";

    const top = document.createElement("div");
    top.className = "job-top";
    const name = document.createElement("div");
    name.className = "name";
    name.textContent = basename(job);
    name.title = basename(job);
    const badge = document.createElement("span");
    badge.className = `status-badge ${job.state || ""}`;
    badge.textContent = job.state === "queued" && job.queuePosition ? `queued #${job.queuePosition}` : (job.state || "queued");
    top.append(name, badge);

    const progress = document.createElement("progress");
    progress.max = 100;
    progress.value = job.totalBytes > 0 ? Math.min(100, (Number(job.bytesReceived || 0) / job.totalBytes) * 100) : 0;

    const meta = document.createElement("div");
    meta.className = "meta muted";
    const eta = job.state === "paused" ? "—" : fmtEta(job.etaSeconds);
    meta.textContent = `${engineLabel(job)} · ${fmtBytes(job.bytesReceived || 0)} / ${fmtBytes(job.totalBytes)} · ${fmtSpeed(job.speedBps)} · ETA ${eta}`;

    if (job.fallbackReason) {
      const fallback = document.createElement("div");
      fallback.className = "meta muted";
      fallback.style.color = "var(--danger)";
      fallback.textContent = "Native helper fallback: this job is using Firefox.";
      fallback.title = job.fallbackReason;
      wrap.append(top, progress, meta, fallback);
    } else {
      wrap.append(top, progress, meta);
    }

    const actions = document.createElement("div");
    actions.className = "actions";
    if (["starting", "in_progress", "downloading", "queued"].includes(job.state)) actions.appendChild(button("Pause", "pause-job", job.id));
    if (job.state === "paused") actions.appendChild(button("Resume", "resume-job", job.id));
    if (!["complete", "cancelled", "error", "interrupted"].includes(job.state)) actions.appendChild(button("Cancel", "cancel-job", job.id));
    if (["error", "interrupted", "cancelled"].includes(job.state)) actions.appendChild(button("Retry", "retry-job", job.id));

    wrap.appendChild(actions);
    root.appendChild(wrap);
  }
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
    await render();
  }
});
$("#url").addEventListener("keydown", (event) => { if (event.key === "Enter") $("#start").click(); });
$("#manager").addEventListener("click", () => browser.runtime.sendMessage({ type: "open-manager" }));
browser.runtime.onMessage.addListener((message) => { if (["job-update", "job-remove"].includes(message?.type)) render(); });
render();
setInterval(render, 1000);
