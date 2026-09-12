export const WEBSPACE_COLORS = Object.freeze([
  "blue", "turquoise", "green", "yellow", "orange", "red", "pink", "purple"
]);

export const WEBSPACE_ICONS = Object.freeze([
  "circle", "fingerprint", "briefcase", "dollar", "cart", "vacation", "gift", "food", "pet", "tree"
]);

export function sanitizeWebspaceName(value) {
  const name = String(value ?? "").trim().replace(/\s+/g, " ");
  if (!name) throw new Error("Webspace name is required.");
  if (name.length > 48) throw new Error("Webspace name must be 48 characters or fewer.");
  return name;
}

export function validateWebspaceInput(input = {}) {
  const name = sanitizeWebspaceName(input.name);
  const color = WEBSPACE_COLORS.includes(input.color) ? input.color : "blue";
  const icon = WEBSPACE_ICONS.includes(input.icon) ? input.icon : "circle";
  return { name, color, icon };
}

export function normalizeAssignmentHostname(value) {
  let raw = String(value ?? "").trim().toLowerCase();
  if (!raw) throw new Error("A hostname is required.");

  if (raw.includes("://")) {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new Error("Only HTTP(S) websites can be assigned.");
    }
    raw = url.hostname;
  } else {
    raw = raw.split("/")[0];
  }

  raw = raw.replace(/^\.+|\.+$/g, "").toLowerCase();
  if (!raw || raw.includes("..") || !/^[a-z0-9.-]+$/.test(raw)) {
    throw new Error("Enter a valid hostname.");
  }
  return raw;
}

export function upsertDomainAssignment(rules, hostname, webspaceId, idFactory = () => crypto.randomUUID()) {
  const value = normalizeAssignmentHostname(hostname);
  const next = [...(rules ?? [])];
  const index = next.findIndex((rule) => rule.kind === "domain" && rule.value === value);
  if (index >= 0) {
    next[index] = { ...next[index], webspaceId, enabled: true };
    return next;
  }

  next.push({
    id: `assignment-${idFactory()}`,
    kind: "domain",
    value,
    webspaceId,
    enabled: true
  });
  return next;
}
