import { buildExactDuplicateReview } from "../core/duplicates.js";
import { badge } from "./ui.js";

const REASON_LABELS = new Map([
  ["active", "Active"],
  ["pinned", "Pinned"],
  ["audible", "Audio"],
  ["hidden", "Hidden"],
  ["incognito", "Private"],
  ["tree-child", "Tree child"],
  ["tree-parent", "Tree parent"],
  ["excluded", "Excluded"]
]);

function memberRow(tab, duplicateSet) {
  const row = document.createElement("label");
  row.className = "duplicate-member";

  const chooser = document.createElement("input");
  chooser.type = "radio";
  chooser.name = `duplicate-keeper-${duplicateSet.id}`;
  chooser.value = String(tab.id);
  chooser.checked = tab.id === duplicateSet.defaultKeepTabId;
  chooser.setAttribute("aria-label", `Keep ${tab.title}`);

  const main = document.createElement("div");
  main.className = "duplicate-main";
  const title = document.createElement("div");
  title.className = "tab-title";
  title.textContent = tab.title;
  const meta = document.createElement("div");
  meta.className = "tab-url";
  meta.textContent = `Window ${tab.windowId} · position ${tab.index + 1}`;
  main.append(title, meta);

  if (tab.blockedReasons.length) {
    const badges = document.createElement("div");
    badges.className = "badges";
    for (const reason of tab.blockedReasons) badges.append(badge(REASON_LABELS.get(reason) || reason));
    badges.append(badge("Never auto-closed"));
    main.append(badges);
  }

  row.append(chooser, main);
  return row;
}

function duplicateCard(duplicateSet) {
  const card = document.createElement("section");
  card.className = "duplicate-card";
  card.dataset.duplicateSetId = duplicateSet.id;

  const heading = document.createElement("div");
  heading.className = "duplicate-heading";
  const title = document.createElement("div");
  title.className = "duplicate-url";
  title.textContent = duplicateSet.url;
  const count = document.createElement("div");
  count.className = "saved-meta";
  count.textContent = `${duplicateSet.members.length} exact matches · ${duplicateSet.eligibleCloseCount} currently eligible to close`;
  heading.append(title, count);
  card.append(heading);

  const members = document.createElement("div");
  members.className = "duplicate-members";
  for (const tab of duplicateSet.members) members.append(memberRow(tab, duplicateSet));
  card.append(members);

  const tools = document.createElement("div");
  tools.className = "duplicate-tools";
  const policy = document.createElement("div");
  policy.className = "duplicate-policy";
  policy.textContent = "Exact URL only. Active, pinned, audible, hidden/private, and tree-linked tabs are excluded from cleanup.";
  const cleanup = document.createElement("button");
  cleanup.className = "row-action duplicate-cleanup";
  cleanup.type = "button";
  cleanup.dataset.action = "cleanup-duplicates";
  cleanup.dataset.duplicateUrl = duplicateSet.url;
  cleanup.textContent = "Close eligible duplicates";
  cleanup.disabled = duplicateSet.eligibleCloseCount === 0;
  tools.append(policy, cleanup);
  card.append(tools);
  return card;
}

export function renderDuplicateView({ snapshot, needle }) {
  const wrapper = document.createElement("div");
  wrapper.className = "duplicate-view";
  const review = buildExactDuplicateReview(snapshot);
  const sets = needle
    ? review.sets.filter((set) => `${set.url} ${set.members.map((tab) => tab.title).join(" ")}`.toLocaleLowerCase().includes(needle))
    : review.sets;

  const intro = document.createElement("div");
  intro.className = "duplicate-intro";
  intro.textContent = `${review.duplicateSets} exact duplicate sets · ${review.duplicateTabs} extra exact-match tabs. Review each set and choose a tab to keep before cleanup.`;
  wrapper.append(intro);

  for (const set of sets) wrapper.append(duplicateCard(set));
  if (!sets.length) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = needle ? "No duplicate set matches this search." : "No exact-URL duplicate tabs are open.";
    wrapper.append(empty);
  }
  return wrapper;
}
