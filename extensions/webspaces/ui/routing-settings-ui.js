import { getRoutingPause } from "../src/routing-controls.js";

async function send(type, payload = {}) {
  return browser.runtime.sendMessage({ type, ...payload });
}

function persistentWebspaces(config) {
  return Object.values(config.webspaces ?? {})
    .filter((space) => space.temporary !== true)
    .sort((a, b) => {
      if (a.builtIn !== b.builtIn) return a.builtIn ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
}

function fillWebspaces(select, config, selected = null) {
  select.replaceChildren();
  for (const space of persistentWebspaces(config)) {
    const option = document.createElement("option");
    option.value = space.id;
    option.textContent = space.name;
    option.selected = selected === space.id;
    select.append(option);
  }
}

function formatPause(pause) {
  if (!pause) return "Routing active";
  if (pause.mode === "timed") {
    const remaining = Math.max(0, Math.ceil((pause.expiresAt - Date.now()) / 60000));
    return `Paused for ${remaining} min`;
  }
  if (pause.mode === "site") return `Paused for ${pause.hostname}`;
  if (pause.mode === "restart") return "Paused until Firefox restarts";
  return "Paused indefinitely";
}

function ensureRoutingControls() {
  if (document.querySelector("#routing-advanced")) return;
  const panel = document.querySelector(".routing-panel");
  if (!panel) return;

  const advanced = document.createElement("div");
  advanced.id = "routing-advanced";
  advanced.className = "routing-advanced";
  advanced.innerHTML = `
    <div class="routing-settings-block">
      <div>
        <strong>Pause automatic routing</strong>
        <div id="manager-pause-status" class="glz-muted">Routing active</div>
      </div>
      <div class="routing-inline-actions">
        <select id="manager-pause-mode" class="glz-select">
          <option value="five-minutes">5 minutes</option>
          <option value="thirty-minutes">30 minutes</option>
          <option value="restart">Until Firefox restarts</option>
          <option value="indefinite">Indefinitely</option>
        </select>
        <button id="manager-pause" class="glz-button" type="button">Pause</button>
        <button id="manager-resume" class="glz-button" type="button" hidden>Resume</button>
      </div>
    </div>
    <div class="routing-settings-block">
      <div>
        <strong>Unassigned websites</strong>
        <div class="glz-muted">Choose what happens when no explicit or provider rule matches.</div>
      </div>
      <div class="routing-inline-actions">
        <select id="default-behavior" class="glz-select">
          <option value="normal">Open normally</option>
          <option value="webspace">Open in selected Webspace</option>
        </select>
        <select id="default-webspace" class="glz-select"></select>
        <button id="save-default" class="glz-button" type="button">Save</button>
      </div>
      <div id="default-status" class="form-status glz-muted" role="status"></div>
    </div>
  `;
  panel.append(advanced);
}

function ensureBulkControls() {
  if (document.querySelector("#bulk-assignment")) return;
  const composer = document.querySelector("#add-assignment");
  const panel = composer?.closest(".panel");
  if (!composer || !panel) return;

  const details = document.createElement("details");
  details.id = "bulk-assignment";
  details.className = "bulk-assignment";
  details.innerHTML = `
    <summary>Bulk assignment</summary>
    <div class="bulk-grid">
      <label class="field field-wide">
        <span>Hostnames or HTTP(S) URLs</span>
        <textarea id="bulk-hostnames" class="glz-input" rows="5" placeholder="mail.example.com&#10;docs.example.com&#10;http://localhost:3000"></textarea>
      </label>
      <label class="field">
        <span>Scope</span>
        <select id="bulk-kind" class="glz-select">
          <option value="domain">Domain + subdomains</option>
          <option value="exact">Exact hostname</option>
        </select>
      </label>
      <label class="field">
        <span>Webspace</span>
        <select id="bulk-webspace" class="glz-select"></select>
      </label>
      <button id="bulk-assign" class="glz-button primary" type="button">Assign sites</button>
      <div id="bulk-status" class="form-status glz-muted" role="status"></div>
    </div>
  `;
  composer.insertAdjacentElement("afterend", details);
}

async function sync() {
  ensureRoutingControls();
  ensureBulkControls();
  const { config } = await send("webspaces:get-state");
  const pause = getRoutingPause(config);

  const routingStatus = document.querySelector("#routing-status");
  if (routingStatus) {
    routingStatus.dataset.routingState = pause ? "paused" : "on";
    routingStatus.querySelector("span:last-child").textContent = pause ? formatPause(pause) : "Routing on";
  }

  const toggle = document.querySelector("#routing-enabled");
  if (toggle) toggle.checked = config.routingEnabled !== false;

  const pauseStatus = document.querySelector("#manager-pause-status");
  if (pauseStatus) pauseStatus.textContent = formatPause(pause);
  const resume = document.querySelector("#manager-resume");
  if (resume) resume.hidden = !pause;

  const behavior = document.querySelector("#default-behavior");
  const target = document.querySelector("#default-webspace");
  if (behavior && target) {
    behavior.value = config.defaultBehavior === "webspace" ? "webspace" : "normal";
    fillWebspaces(target, config, config.defaultWebspaceId ?? null);
    target.disabled = behavior.value !== "webspace";
  }

  const bulk = document.querySelector("#bulk-webspace");
  if (bulk) fillWebspaces(bulk, config, bulk.value || null);
}

ensureRoutingControls();
ensureBulkControls();

document.querySelector("#routing-enabled")?.addEventListener("change", async (event) => {
  event.stopImmediatePropagation();
  if (event.target.checked) {
    await send("webspaces-controls:resume");
  } else {
    await send("webspaces-controls:pause", { mode: "indefinite" });
  }
  await sync();
}, { capture: true });

document.querySelector("#manager-pause")?.addEventListener("click", async () => {
  await send("webspaces-controls:pause", { mode: document.querySelector("#manager-pause-mode").value });
  await sync();
});

document.querySelector("#manager-resume")?.addEventListener("click", async () => {
  await send("webspaces-controls:resume");
  await sync();
});

document.querySelector("#default-behavior")?.addEventListener("change", (event) => {
  const target = document.querySelector("#default-webspace");
  target.disabled = event.target.value !== "webspace";
});

document.querySelector("#save-default")?.addEventListener("click", async () => {
  const status = document.querySelector("#default-status");
  try {
    const behavior = document.querySelector("#default-behavior").value;
    const webspaceId = behavior === "webspace" ? document.querySelector("#default-webspace").value : null;
    await send("webspaces-controls:set-default", { behavior, webspaceId });
    status.textContent = behavior === "webspace" ? "Default Webspace saved." : "Unassigned websites will open normally.";
    await sync();
  } catch (error) {
    status.textContent = error.message;
  }
});

document.querySelector("#bulk-assign")?.addEventListener("click", async () => {
  const status = document.querySelector("#bulk-status");
  try {
    const result = await send("webspaces-controls:bulk-assign", {
      text: document.querySelector("#bulk-hostnames").value,
      kind: document.querySelector("#bulk-kind").value,
      webspaceId: document.querySelector("#bulk-webspace").value
    });
    const { added, unchanged, skipped } = result.summary;
    sessionStorage.setItem(
      "webspaces.bulkResult",
      `Bulk assignment complete: ${added} added, ${unchanged} already assigned, ${skipped} skipped because another unlocked Webspace owns the rule.`
    );
    location.reload();
  } catch (error) {
    status.textContent = error.message;
  }
});

const storedBulkResult = sessionStorage.getItem("webspaces.bulkResult");
if (storedBulkResult) {
  sessionStorage.removeItem("webspaces.bulkResult");
  const showStored = () => {
    ensureBulkControls();
    const status = document.querySelector("#bulk-status");
    if (status) status.textContent = storedBulkResult;
  };
  setTimeout(showStored, 20);
}

browser.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "local" && changes.webspacesConfig) {
    sync().catch(() => {});
  }
});

setTimeout(() => sync().catch(() => {}), 25);
