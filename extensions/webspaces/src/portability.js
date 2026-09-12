export const PORTABLE_FORMAT = "goreecloud-webspaces";
export const PORTABLE_FORMAT_VERSION = 1;

function cloneRule(rule) {
  return {
    id: rule.id,
    kind: rule.kind,
    value: rule.value,
    webspaceId: rule.webspaceId,
    enabled: rule.enabled !== false
  };
}

export function exportPortableConfig(config) {
  const persistentIds = new Set(
    Object.values(config.webspaces ?? {})
      .filter((webspace) => webspace.temporary !== true)
      .map((webspace) => webspace.id)
  );

  return {
    format: PORTABLE_FORMAT,
    formatVersion: PORTABLE_FORMAT_VERSION,
    settings: {
      routingEnabled: config.routingEnabled !== false,
      defaultBehavior: config.defaultBehavior ?? "normal",
      defaultWebspaceId: persistentIds.has(config.defaultWebspaceId) ? config.defaultWebspaceId : null
    },
    webspaces: Object.values(config.webspaces ?? {})
      .filter((webspace) => webspace.temporary !== true)
      .map((webspace) => ({
        id: webspace.id,
        name: webspace.name,
        color: webspace.color,
        icon: webspace.icon,
        description: webspace.description ?? "",
        builtIn: webspace.builtIn === true,
        locked: webspace.locked === true
      })),
    assignments: (config.userRules ?? [])
      .filter((rule) => persistentIds.has(rule.webspaceId))
      .map(cloneRule),
    exceptions: (config.exceptions ?? []).map(cloneRule)
  };
}

export function validatePortableConfig(input) {
  if (!input || typeof input !== "object") throw new Error("Import file must contain a JSON object.");
  if (input.format !== PORTABLE_FORMAT) throw new Error("This is not a GoreeCloud Webspaces configuration export.");
  if (input.formatVersion !== PORTABLE_FORMAT_VERSION) {
    throw new Error(`Unsupported Webspaces export format version: ${input.formatVersion}`);
  }
  if (!Array.isArray(input.webspaces) || !Array.isArray(input.assignments) || !Array.isArray(input.exceptions)) {
    throw new Error("Webspaces export is missing required configuration arrays.");
  }
  if (input.webspaces.length > 100) throw new Error("Import contains too many Webspaces.");
  if (input.assignments.length > 5000) throw new Error("Import contains too many assignments.");
  if (input.exceptions.length > 1000) throw new Error("Import contains too many exceptions.");
  return input;
}
