export const COMMANDS = Object.freeze([
  Object.freeze({
    id: "view-tree",
    title: "Open Tree view",
    description: "Show open tabs as durable parent/child trees.",
    keywords: ["tree", "tabs", "open", "hierarchy", "children"],
    action: Object.freeze({ type: "view", value: "tree" })
  }),
  Object.freeze({
    id: "view-groups",
    title: "Open Native groups",
    description: "Show Firefox native tab groups.",
    keywords: ["groups", "native", "firefox", "tabs"],
    action: Object.freeze({ type: "view", value: "groups" })
  }),
  Object.freeze({
    id: "view-duplicates",
    title: "Find exact duplicates",
    description: "Open the reviewed exact-URL duplicate view.",
    keywords: ["duplicates", "duplicate", "exact", "cleanup", "review"],
    action: Object.freeze({ type: "view", value: "duplicates" })
  }),
  Object.freeze({
    id: "view-saved",
    title: "Open Saved items",
    description: "Show Tab Sets and stashed items.",
    keywords: ["saved", "tab sets", "stash", "stashed", "collections"],
    action: Object.freeze({ type: "view", value: "saved" })
  }),
  Object.freeze({
    id: "view-snoozed",
    title: "Open Snoozed",
    description: "Show locally persisted snoozed tabs.",
    keywords: ["snooze", "snoozed", "later", "schedule"],
    action: Object.freeze({ type: "view", value: "snoozed" })
  }),
  Object.freeze({
    id: "view-rules",
    title: "Open Rules",
    description: "Show local rule configuration and explicit preview/apply controls.",
    keywords: ["rules", "automation", "preview", "apply"],
    action: Object.freeze({ type: "view", value: "rules" })
  }),
  Object.freeze({
    id: "focus-search",
    title: "Focus sidebar search",
    description: "Move keyboard focus to the existing local search field.",
    keywords: ["search", "find", "filter", "tabs"],
    action: Object.freeze({ type: "focus-search" })
  }),
  Object.freeze({
    id: "refresh-state",
    title: "Refresh browser state",
    description: "Re-read current Firefox and saved extension state.",
    keywords: ["refresh", "reload", "state", "firefox"],
    action: Object.freeze({ type: "refresh" })
  }),
  Object.freeze({
    id: "save-window",
    title: "Save focused window as Tab Set",
    description: "Persist the focused Firefox window as a reusable local Tab Set.",
    keywords: ["save", "window", "tab set", "snapshot", "collection"],
    action: Object.freeze({ type: "save-window" })
  })
]);

function normalize(value) {
  return String(value ?? "").trim().toLocaleLowerCase();
}

function commandText(command) {
  return [
    command.title,
    command.description,
    ...(command.keywords || [])
  ].map(normalize).join(" ");
}

function scoreCommand(command, tokens) {
  const title = normalize(command.title);
  const keywords = (command.keywords || []).map(normalize);
  const haystack = commandText(command);

  let score = 0;
  for (const token of tokens) {
    if (!haystack.includes(token)) return null;
    if (title === token) score += 120;
    else if (title.startsWith(token)) score += 80;
    else if (title.includes(token)) score += 50;
    if (keywords.some((keyword) => keyword === token)) score += 30;
    else if (keywords.some((keyword) => keyword.startsWith(token))) score += 20;
    else if (keywords.some((keyword) => keyword.includes(token))) score += 10;
  }
  return score;
}

export function searchCommands(query, commands = COMMANDS) {
  const tokens = normalize(query).split(/\s+/).filter(Boolean);
  if (!tokens.length) return [...commands];

  return commands
    .map((command, index) => ({ command, index, score: scoreCommand(command, tokens) }))
    .filter((entry) => entry.score !== null)
    .sort((a, b) => b.score - a.score || a.index - b.index || a.command.id.localeCompare(b.command.id))
    .map((entry) => entry.command);
}

export function commandById(id, commands = COMMANDS) {
  return commands.find((command) => command.id === id) ?? null;
}
