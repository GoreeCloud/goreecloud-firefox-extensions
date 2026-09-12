const ACTION_PREFIXES = Object.freeze({
  OPEN_LINK: "webspaces-open-link:",
  MOVE_TAB: "webspaces-move-tab:",
  ASSIGN_SITE: "webspaces-assign-site:"
});

export function sortedMenuWebspaces(webspaces) {
  return Object.values(webspaces ?? {}).sort((a, b) => {
    if (a.builtIn !== b.builtIn) return a.builtIn ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

export function buildMenuDefinitions(webspaces) {
  const spaces = sortedMenuWebspaces(webspaces);
  const definitions = [
    { id: "webspaces-open-link", title: "Open Link in Webspace", contexts: ["link"] },
    { id: "webspaces-move-tab", title: "Move Tab to Webspace", contexts: ["page", "tab"] },
    { id: "webspaces-assign-site", title: "Always Open This Site In", contexts: ["page", "tab"] },
    { id: "webspaces-remove-assignment", title: "Remove Webspace Assignment", contexts: ["page", "tab"] }
  ];

  for (const webspace of spaces) {
    definitions.push(
      {
        id: `${ACTION_PREFIXES.OPEN_LINK}${webspace.id}`,
        parentId: "webspaces-open-link",
        title: webspace.name,
        contexts: ["link"]
      },
      {
        id: `${ACTION_PREFIXES.MOVE_TAB}${webspace.id}`,
        parentId: "webspaces-move-tab",
        title: webspace.name,
        contexts: ["page", "tab"]
      },
      {
        id: `${ACTION_PREFIXES.ASSIGN_SITE}${webspace.id}`,
        parentId: "webspaces-assign-site",
        title: webspace.name,
        contexts: ["page", "tab"]
      }
    );
  }

  return definitions;
}

export function parseMenuAction(menuItemId) {
  const id = String(menuItemId ?? "");
  for (const [action, prefix] of Object.entries(ACTION_PREFIXES)) {
    if (id.startsWith(prefix)) {
      return { action: action.toLowerCase().replaceAll("_", "-"), webspaceId: id.slice(prefix.length) };
    }
  }
  if (id === "webspaces-remove-assignment") return { action: "remove-assignment", webspaceId: null };
  return null;
}
