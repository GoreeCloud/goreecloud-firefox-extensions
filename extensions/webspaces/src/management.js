export const WEBSPACE_COLORS = Object.freeze([
  "blue", "cyan", "gray", "green", "orange", "pink", "purple", "red", "violet", "yellow",
  // Firefox <=152 aliases still accepted by modern Firefox.
  "turquoise", "toolbar"
]);

export const WEBSPACE_ICONS = Object.freeze([
  "briefcase", "cart", "chill", "circle", "dollar", "fence", "fingerprint",
  "food", "fruit", "gift", "pet", "tree", "vacation"
]);

export function sanitizeWebspaceName(value) {
  const name = String(value ?? "").trim().replace(/\s+/g, " ");
  if (!name) throw new Error("Webspace name is required.");
  if (name.length > 48) throw new Error("Webspace name must be 48 characters or fewer.");
  return name;
}

export function sanitizeDescription(value) {
  const description = String(value ?? "").trim().replace(/\s+/g, " ");
  if (description.length > 180) throw new Error("Description must be 180 characters or fewer.");
  return description;
}

export function validateWebspaceInput(input = {}, supported = {}) {
  const name = sanitizeWebspaceName(input.name);
  const colors = supported.colors?.length ? supported.colors : WEBSPACE_COLORS;
  const icons = supported.icons?.length ? supported.icons : WEBSPACE_ICONS;
  const color = colors.includes(input.color) ? input.color : (colors.includes("blue") ? "blue" : colors[0]);
  const icon = icons.includes(input.icon) ? input.icon : (icons.includes("circle") ? "circle" : icons[0]);
  const result = { name, color, icon };
  if (input.description !== undefined) result.description = sanitizeDescription(input.description);
  return result;
}

export function normalizeAssignmentHostname(value) {
  let raw = String(value ?? "").trim();
  if (!raw) throw new Error("A hostname is required.");

  let url;
  try {
    if (/^[a-z][a-z0-9+.-]*:\/\//i.test(raw)) {
      url = new URL(raw);
      if (url.protocol !== "http:" && url.protocol !== "https:") {
        throw new Error("Only HTTP(S) websites can be assigned.");
      }
    } else {
      url = new URL(`http://${raw}`);
    }
  } catch (error) {
    if (error?.message?.includes("HTTP(S)")) throw error;
    throw new Error("Enter a valid hostname.");
  }

  const hostname = url.hostname.trim().replace(/^\.+|\.+$/g, "").toLowerCase();
  if (!hostname) throw new Error("Enter a valid hostname.");
  return hostname;
}

export function upsertDomainAssignment(rules, hostname, webspaceId, idFactory = () => crypto.randomUUID()) {
  return upsertAssignment(rules, {
    kind: "domain",
    value: hostname,
    webspaceId,
    enabled: true
  }, idFactory);
}

export function upsertAssignment(rules, input, idFactory = () => crypto.randomUUID()) {
  const kind = input.kind === "exact" ? "exact" : "domain";
  const value = normalizeAssignmentHostname(input.value);
  const webspaceId = String(input.webspaceId ?? "");
  if (!webspaceId) throw new Error("A target Webspace is required.");

  const next = [...(rules ?? [])];
  const index = next.findIndex((rule) => rule.kind === kind && rule.value === value);
  if (index >= 0) {
    next[index] = {
      ...next[index],
      webspaceId,
      enabled: input.enabled !== false
    };
    return next;
  }

  next.push({
    id: `assignment-${idFactory()}`,
    kind,
    value,
    webspaceId,
    enabled: input.enabled !== false
  });
  return next;
}

export function updateAssignment(rules, ruleId, input) {
  const next = [...(rules ?? [])];
  const index = next.findIndex((rule) => rule.id === ruleId);
  if (index < 0) throw new Error("Assignment not found.");

  const current = next[index];
  const kind = input.kind === "exact" ? "exact" : (input.kind === "domain" ? "domain" : current.kind);
  const value = input.value === undefined ? current.value : normalizeAssignmentHostname(input.value);
  const webspaceId = input.webspaceId === undefined ? current.webspaceId : String(input.webspaceId);
  if (!webspaceId) throw new Error("A target Webspace is required.");

  const duplicate = next.find((rule, candidateIndex) =>
    candidateIndex !== index && rule.kind === kind && rule.value === value
  );
  if (duplicate) throw new Error("An assignment with the same scope and hostname already exists.");

  next[index] = {
    ...current,
    kind,
    value,
    webspaceId,
    enabled: input.enabled === undefined ? current.enabled !== false : Boolean(input.enabled)
  };
  return next;
}

export function removeAssignmentsForHostname(rules, hostname) {
  const value = normalizeAssignmentHostname(hostname);
  return (rules ?? []).filter((rule) => rule.value !== value);
}

export function findRuleConflicts(rules) {
  const groups = new Map();
  for (const rule of rules ?? []) {
    if (rule.enabled === false) continue;
    const key = `${rule.kind}:${rule.value}`;
    const group = groups.get(key) ?? [];
    group.push(rule);
    groups.set(key, group);
  }

  const conflicts = [];
  for (const [key, group] of groups) {
    const targets = new Set(group.map((rule) => rule.webspaceId));
    if (targets.size > 1) {
      conflicts.push({
        key,
        kind: group[0].kind,
        value: group[0].value,
        webspaceIds: [...targets],
        ruleIds: group.map((rule) => rule.id)
      });
    }
  }
  return conflicts;
}

export function assignmentCountForWebspace(rules, webspaceId) {
  return (rules ?? []).filter((rule) => rule.webspaceId === webspaceId).length;
}
