import { resolveWebspacesCommand } from "./commands.js";
import { applyRoutingPause, getRoutingPause, resumeRouting } from "./routing-controls.js";
import { loadConfig, saveConfig } from "./storage.js";

async function openWebspace(webspaceId) {
  const config = await loadConfig();
  const webspace = config.webspaces?.[webspaceId];
  if (!webspace?.cookieStoreId) {
    throw new Error(`Webspace ${webspaceId} is unavailable.`);
  }

  await browser.tabs.create({
    url: "about:blank",
    cookieStoreId: webspace.cookieStoreId,
    active: true
  });
}

async function toggleRoutingPause() {
  const current = await loadConfig();
  const pause = getRoutingPause(current);
  const next = pause
    ? resumeRouting(current)
    : applyRoutingPause(current, "indefinite");
  await saveConfig(next);
}

async function openLauncher() {
  try {
    await browser.action.openPopup();
  } catch {
    await browser.runtime.openOptionsPage();
  }
}

async function handleCommand(command) {
  const action = resolveWebspacesCommand(command);
  if (!action) return;

  switch (action.type) {
    case "open-popup":
      await openLauncher();
      break;
    case "open-webspace":
      await openWebspace(action.webspaceId);
      break;
    case "toggle-routing-pause":
      await toggleRoutingPause();
      break;
    case "open-manager":
      await browser.runtime.openOptionsPage();
      break;
  }
}

browser.commands.onCommand.addListener((command) => {
  handleCommand(command).catch((error) =>
    console.error("GoreeCloud Webspaces keyboard command failed", command, error)
  );
});
