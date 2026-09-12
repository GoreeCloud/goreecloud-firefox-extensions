import { getRoutingPause, pauseAppliesToHostname } from "../src/routing-controls.js";
import { hostnameFromUrl } from "../src/routing.js";

async function send(type, payload = {}) {
  return browser.runtime.sendMessage({ type, ...payload });
}

function formatPause(pause) {
  if (!pause) return "Routing active";
  if (pause.mode === "timed") {
    const remaining = Math.max(0, Math.ceil((pause.expiresAt - Date.now()) / 60000));
    return `Paused for ${remaining} min`;
  }
  if (pause.mode === "site") return `Paused for ${pause.hostname}`;
  if (pause.mode === "restart") return "Paused until Firefox restarts";
  return "Routing paused";
}

function updateBadge(pause, applies) {
  const badge = document.querySelector("#routing-badge");
  if (!badge) return;
  const text = badge.querySelector("span:last-child");
  badge.dataset.routingState = applies || pause?.mode === "indefinite" ? "paused" : "on";
  text.textContent = applies ? formatPause(pause) : "Routing on";
}

function ensureControls() {
  if (document.querySelector("#routing-pause-controls")) return;
  const routingControl = document.querySelector(".routing-control");
  if (!routingControl) return;

  const section = document.createElement("details");
  section.id = "routing-pause-controls";
  section.className = "routing-pause-controls glz-surface";
  section.innerHTML = `
    <summary class="routing-pause-summary">
      <span class="pause-summary-copy">
        <strong>Routing controls</strong>
        <span id="routing-pause-status" class="glz-muted">Routing active</span>
      </span>
      <span class="pause-disclosure" aria-hidden="true">⌄</span>
    </summary>
    <div class="pause-body">
      <label class="pause-field" for="routing-pause-mode">Pause automatic routing</label>
      <div class="pause-action-row">
        <select id="routing-pause-mode" class="glz-select" aria-label="Routing pause duration">
          <option value="five-minutes">5 minutes</option>
          <option value="thirty-minutes">30 minutes</option>
          <option value="site">This site</option>
          <option value="restart">Until Firefox restarts</option>
          <option value="indefinite">Indefinitely</option>
        </select>
        <button id="pause-routing" class="glz-button compact" type="button">Pause</button>
        <button id="resume-routing" class="glz-button compact" type="button" hidden>Resume</button>
      </div>
    </div>
  `;
  routingControl.insertAdjacentElement("afterend", section);
}

async function currentContext() {
  const state = await send("webspaces:get-state");
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  const hostname = hostnameFromUrl(tab?.url ?? "");
  const pause = getRoutingPause(state.config);
  return { state, tab, hostname, pause };
}

async function sync() {
  ensureControls();
  const { state, hostname, pause } = await currentContext();
  const applies = pauseAppliesToHostname(pause, hostname);
  const status = document.querySelector("#routing-pause-status");
  const resume = document.querySelector("#resume-routing");
  const toggle = document.querySelector("#routing-enabled");
  const controls = document.querySelector("#routing-pause-controls");

  if (status) status.textContent = formatPause(pause);
  if (resume) resume.hidden = !pause;
  if (toggle) toggle.checked = state.config.routingEnabled !== false;

  if (controls) {
    if (pause && !controls.open) {
      controls.open = true;
      controls.dataset.autoOpened = "true";
    } else if (!pause && controls.dataset.autoOpened === "true") {
      controls.open = false;
      delete controls.dataset.autoOpened;
    }
  }

  updateBadge(pause, applies);
}

ensureControls();

document.querySelector("#pause-routing")?.addEventListener("click", async () => {
  try {
    const { hostname } = await currentContext();
    const mode = document.querySelector("#routing-pause-mode").value;
    await send("webspaces-controls:pause", { mode, hostname });
    await sync();
  } catch (error) {
    const status = document.querySelector("#routing-pause-status");
    if (status) status.textContent = error.message;
  }
});

document.querySelector("#resume-routing")?.addEventListener("click", async () => {
  await send("webspaces-controls:resume");
  await sync();
});

document.querySelector("#routing-enabled")?.addEventListener("change", async (event) => {
  event.stopImmediatePropagation();
  if (event.target.checked) {
    await send("webspaces-controls:resume");
  } else {
    await send("webspaces-controls:pause", { mode: "indefinite" });
  }
  await sync();
}, { capture: true });

browser.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "local" && changes.webspacesConfig) {
    sync().catch(() => {});
  }
});

setTimeout(() => sync().catch(() => {}), 25);
