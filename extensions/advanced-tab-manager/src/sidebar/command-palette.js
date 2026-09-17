import { commandById, searchCommands } from "../core/commands.js";

const summary = document.querySelector("#summary");
const viewMode = document.querySelector("#view-mode");
const search = document.querySelector("#search");
const refresh = document.querySelector("#refresh");
const saveWindow = document.querySelector("#save-window");
const openManager = document.querySelector("#open-manager");
const topbarActions = document.querySelector(".topbar-actions");
const shell = document.querySelector(".shell");

let activeIndex = 0;

const openButton = document.createElement("button");
openButton.id = "open-command-palette";
openButton.className = "icon-button";
openButton.type = "button";
openButton.setAttribute("aria-label", "Open command palette");
openButton.setAttribute("aria-keyshortcuts", "Control+K Meta+K");
openButton.textContent = "⌘";
topbarActions?.prepend(openButton);

const palette = document.createElement("section");
palette.id = "command-palette";
palette.className = "command-palette";
palette.hidden = true;
palette.setAttribute("role", "dialog");
palette.setAttribute("aria-modal", "true");
palette.setAttribute("aria-labelledby", "command-palette-title");
palette.innerHTML = `
  <div class="command-palette-card">
    <div class="command-palette-heading">
      <div>
        <p class="eyebrow">Keyboard actions</p>
        <h2 id="command-palette-title">Command palette</h2>
      </div>
      <button id="close-command-palette" class="icon-button" type="button" aria-label="Close command palette">×</button>
    </div>
    <label class="command-query">
      <span class="sr-only">Search commands</span>
      <input id="command-query" type="search" autocomplete="off" placeholder="Type a command…" aria-controls="command-results">
    </label>
    <div id="command-results" class="command-results" role="listbox" aria-label="Available commands"></div>
    <p class="command-hint">↑/↓ move · Enter run · Esc close · Ctrl/⌘+K toggle</p>
  </div>
`;
shell?.append(palette);

const query = palette.querySelector("#command-query");
const results = palette.querySelector("#command-results");
const closeButton = palette.querySelector("#close-command-palette");

function setSummary(message) {
  if (summary) summary.textContent = message;
}

function closePalette({ restoreFocus = true } = {}) {
  palette.hidden = true;
  query.value = "";
  activeIndex = 0;
  if (restoreFocus) openButton.focus();
}

function renderResults() {
  const matches = searchCommands(query.value);
  if (activeIndex >= matches.length) activeIndex = Math.max(0, matches.length - 1);
  results.replaceChildren();

  if (!matches.length) {
    const empty = document.createElement("p");
    empty.className = "command-empty";
    empty.textContent = "No matching command.";
    results.append(empty);
    return;
  }

  matches.forEach((command, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "command-result";
    button.dataset.commandId = command.id;
    button.dataset.active = String(index === activeIndex);
    button.setAttribute("role", "option");
    button.setAttribute("aria-selected", String(index === activeIndex));
    button.innerHTML = `<span class="command-title"></span><span class="command-description"></span>`;
    button.querySelector(".command-title").textContent = command.title;
    button.querySelector(".command-description").textContent = command.description;
    results.append(button);
  });
}

function openPalette() {
  palette.hidden = false;
  activeIndex = 0;
  renderResults();
  queueMicrotask(() => query.focus());
}

async function executeCommand(id) {
  const command = commandById(id);
  if (!command) {
    setSummary("That command is no longer available.");
    return;
  }

  closePalette({ restoreFocus: false });
  switch (command.action.type) {
    case "view":
      viewMode.value = command.action.value;
      viewMode.dispatchEvent(new Event("change", { bubbles: true }));
      viewMode.focus();
      return;
    case "open-manager":
      openManager?.click();
      openManager?.focus();
      return;
    case "focus-search":
      search.focus();
      search.select();
      return;
    case "refresh":
      refresh.click();
      refresh.focus();
      return;
    case "save-window":
      saveWindow.click();
      saveWindow.focus();
      return;
    default:
      setSummary("Unsupported command was rejected.");
  }
}

openButton.addEventListener("click", () => {
  if (palette.hidden) openPalette();
  else closePalette();
});

closeButton.addEventListener("click", () => closePalette());

query.addEventListener("input", () => {
  activeIndex = 0;
  renderResults();
});

query.addEventListener("keydown", async (event) => {
  const matches = searchCommands(query.value);
  if (event.key === "Escape") {
    event.preventDefault();
    closePalette();
    return;
  }
  if (!matches.length) return;
  if (event.key === "ArrowDown") {
    event.preventDefault();
    activeIndex = (activeIndex + 1) % matches.length;
    renderResults();
    return;
  }
  if (event.key === "ArrowUp") {
    event.preventDefault();
    activeIndex = (activeIndex - 1 + matches.length) % matches.length;
    renderResults();
    return;
  }
  if (event.key === "Enter") {
    event.preventDefault();
    await executeCommand(matches[activeIndex]?.id);
  }
});

results.addEventListener("pointerover", (event) => {
  const button = event.target.closest(".command-result");
  if (!button) return;
  const buttons = [...results.querySelectorAll(".command-result")];
  const index = buttons.indexOf(button);
  if (index < 0 || index === activeIndex) return;
  activeIndex = index;
  buttons.forEach((candidate, candidateIndex) => {
    const active = candidateIndex === activeIndex;
    candidate.dataset.active = String(active);
    candidate.setAttribute("aria-selected", String(active));
  });
});

results.addEventListener("click", async (event) => {
  const button = event.target.closest(".command-result");
  if (button) await executeCommand(button.dataset.commandId);
});

palette.addEventListener("click", (event) => {
  if (event.target === palette) closePalette();
});

document.addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLocaleLowerCase() === "k") {
    event.preventDefault();
    if (palette.hidden) openPalette();
    else closePalette();
    return;
  }
  if (event.key === "Escape" && !palette.hidden) {
    event.preventDefault();
    closePalette();
  }
});
