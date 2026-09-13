import { normalizeAssignmentHostname, upsertAssignment } from "./management.js";

export function parseBulkHostnames(text, { maxItems = 200 } = {}) {
  const values = String(text ?? "")
    .split(/[\n,;]+/)
    .map((value) => value.trim())
    .filter(Boolean);

  if (!values.length) throw new Error("Enter at least one hostname or HTTP(S) URL.");
  if (values.length > maxItems) throw new Error(`Bulk assignment is limited to ${maxItems} entries at a time.`);

  const unique = [];
  const seen = new Set();
  for (const value of values) {
    const hostname = normalizeAssignmentHostname(value);
    if (!seen.has(hostname)) {
      seen.add(hostname);
      unique.push(hostname);
    }
  }
  return unique;
}

export function applyBulkAssignments(config, input, idFactory = () => crypto.randomUUID()) {
  const target = config.webspaces?.[input.webspaceId];
  if (!target) throw new Error("Choose an available target Webspace.");
  if (target.locked === true) throw new Error("Unlock the target Webspace before assigning sites.");

  const kind = input.kind === "exact" ? "exact" : "domain";
  const values = parseBulkHostnames(input.text, { maxItems: input.maxItems ?? 200 });
  const next = structuredClone(config);
  let added = 0;
  let unchanged = 0;
  let skipped = 0;

  for (const value of values) {
    const existing = (next.userRules ?? []).find((rule) => rule.kind === kind && rule.value === value);
    if (existing) {
      const owner = next.webspaces?.[existing.webspaceId];
      if (owner?.locked === true && existing.webspaceId !== target.id) {
        throw new Error(`${value} belongs to locked Webspace ${owner.name ?? owner.id}. Unlock it before retargeting.`);
      }
      if (existing.webspaceId === target.id) {
        unchanged += 1;
        continue;
      }
      skipped += 1;
      continue;
    }

    next.userRules = upsertAssignment(next.userRules, {
      kind,
      value,
      webspaceId: target.id,
      enabled: true
    }, idFactory);
    added += 1;
  }

  return { config: next, summary: { added, unchanged, skipped, total: values.length } };
}
