const COMMAND_LABELS = Object.freeze({
  "open-webspaces-launcher": "Open Webspaces launcher",
  "open-goreecloud-webspace": "Open GoreeCloud Webspace",
  "open-google-webspace": "Open Google Webspace",
  "open-microsoft-webspace": "Open Microsoft Webspace",
  "open-meta-webspace": "Open Meta Webspace",
  "toggle-routing-pause": "Pause or resume routing",
  "open-webspaces-manager": "Open Webspaces manager"
});

function ensureShortcutsPanel() {
  if (document.querySelector("#keyboard-shortcuts")) return;
  const portability = document.querySelector("#export-config")?.closest(".panel");
  if (!portability) return;

  const section = document.createElement("section");
  section.id = "keyboard-shortcuts";
  section.className = "panel glz-surface";
  section.innerHTML = `
    <div class="panel-heading shortcuts-heading">
      <div>
        <div class="glz-kicker">Keyboard</div>
        <h2>Shortcuts</h2>
        <p>Assign Firefox shortcuts for the launcher, built-in Webspaces, routing pause, and manager.</p>
      </div>
      <button id="manage-shortcuts" class="glz-button" type="button">Manage Firefox shortcuts</button>
    </div>
    <div id="shortcut-list" class="shortcut-list" aria-live="polite"></div>
    <div id="shortcut-status" class="form-status glz-muted" role="status"></div>
  `;
  portability.insertAdjacentElement("beforebegin", section);
}

async function renderShortcuts() {
  ensureShortcutsPanel();
  const list = document.querySelector("#shortcut-list");
  if (!list) return;

  const commands = await browser.commands.getAll();
  const visible = commands.filter((command) => COMMAND_LABELS[command.name]);
  list.replaceChildren();

  for (const command of visible) {
    const row = document.createElement("div");
    row.className = "shortcut-row";

    const label = document.createElement("div");
    label.className = "shortcut-copy";
    const title = document.createElement("strong");
    title.textContent = COMMAND_LABELS[command.name];
    const description = document.createElement("span");
    description.textContent = command.description || command.name;
    label.append(title, description);

    const key = document.createElement("kbd");
    key.className = "shortcut-key";
    key.textContent = command.shortcut || "Not assigned";

    row.append(label, key);
    list.append(row);
  }
}

ensureShortcutsPanel();

document.querySelector("#manage-shortcuts")?.addEventListener("click", async () => {
  const status = document.querySelector("#shortcut-status");
  try {
    await browser.commands.openShortcutSettings();
    if (status) status.textContent = "Firefox shortcut settings opened.";
  } catch (error) {
    if (status) status.textContent = error.message;
  }
});

browser.commands.onChanged?.addListener(() => {
  renderShortcuts().catch(() => {});
});

setTimeout(() => renderShortcuts().catch((error) => {
  const status = document.querySelector("#shortcut-status");
  if (status) status.textContent = error.message;
}), 25);
