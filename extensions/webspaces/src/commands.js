export const COMMAND_WEBSPACE_TARGETS = Object.freeze({
  "open-goreecloud-webspace": "goreecloud",
  "open-google-webspace": "google",
  "open-microsoft-webspace": "microsoft",
  "open-meta-webspace": "meta"
});

export const WEBSPACES_COMMANDS = Object.freeze([
  "open-webspaces-launcher",
  ...Object.keys(COMMAND_WEBSPACE_TARGETS),
  "toggle-routing-pause",
  "open-webspaces-manager"
]);

export function resolveWebspacesCommand(command) {
  if (command === "open-webspaces-launcher") return { type: "open-popup" };
  if (command === "toggle-routing-pause") return { type: "toggle-routing-pause" };
  if (command === "open-webspaces-manager") return { type: "open-manager" };
  const webspaceId = COMMAND_WEBSPACE_TARGETS[command];
  if (webspaceId) return { type: "open-webspace", webspaceId };
  return null;
}
