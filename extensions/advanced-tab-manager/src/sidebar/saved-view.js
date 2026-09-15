import { savedAction } from "./ui.js";

export function renderSavedView({ organizationalState, needle }) {
  const wrapper = document.createElement("div");
  wrapper.className = "saved-view";

  if (!organizationalState) {
    const error = document.createElement("div");
    error.className = "empty";
    error.textContent = "Saved state is unavailable because its local data could not be validated.";
    wrapper.append(error);
    return wrapper;
  }

  const tabSets = organizationalState.tabSets.filter((tabSet) =>
    !needle || `${tabSet.name} ${tabSet.items.map((item) => `${item.title} ${item.url}`).join(" ")}`.toLocaleLowerCase().includes(needle)
  );
  const stashedItems = organizationalState.stashedItems.filter((item) =>
    !needle || `${item.title} ${item.url}`.toLocaleLowerCase().includes(needle)
  );

  const setsHeading = document.createElement("h2");
  setsHeading.className = "saved-heading";
  setsHeading.textContent = `Tab Sets · ${tabSets.length}`;
  wrapper.append(setsHeading);

  for (const tabSet of tabSets) {
    const card = document.createElement("section");
    card.className = "saved-card";
    const main = document.createElement("div");
    main.className = "saved-main";
    const title = document.createElement("div");
    title.className = "saved-title";
    title.textContent = tabSet.name;
    const meta = document.createElement("div");
    meta.className = "saved-meta";
    meta.textContent = `${tabSet.items.length} tabs · ${tabSet.groups.length} native groups`;
    main.append(title, meta);

    const actions = document.createElement("div");
    actions.className = "actions";
    actions.append(
      savedAction("↗", `Restore ${tabSet.name} in a new window`, "restore-tab-set", tabSet.id),
      savedAction("×", `Delete saved Tab Set ${tabSet.name}`, "delete-tab-set", tabSet.id)
    );
    card.append(main, actions);
    wrapper.append(card);
  }

  const stashHeading = document.createElement("h2");
  stashHeading.className = "saved-heading";
  stashHeading.textContent = `Stashed tabs · ${stashedItems.length}`;
  wrapper.append(stashHeading);

  if (organizationalState.tabSets.length || organizationalState.stashedItems.length) {
    const clearBar = document.createElement("div");
    clearBar.className = "saved-tools";
    clearBar.append(savedAction("⌫", "Delete all saved Tab Sets and stashed items", "clear-saved-items", "all"));
    wrapper.append(clearBar);
  }

  for (const item of stashedItems) {
    const card = document.createElement("section");
    card.className = "saved-card";
    const main = document.createElement("div");
    main.className = "saved-main";
    const title = document.createElement("div");
    title.className = "saved-title";
    title.textContent = item.title;
    const url = document.createElement("div");
    url.className = "saved-meta";
    url.textContent = item.url;
    main.append(title, url);

    const actions = document.createElement("div");
    actions.className = "actions";
    actions.append(
      savedAction("↗", `Restore stashed tab ${item.title}`, "restore-stashed-item", item.id),
      savedAction("×", `Delete stashed record ${item.title}`, "delete-stashed-item", item.id)
    );
    card.append(main, actions);
    wrapper.append(card);
  }

  if (!tabSets.length && !stashedItems.length) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = needle ? "No saved items match this search." : "No Tab Sets or stashed tabs have been saved yet.";
    wrapper.append(empty);
  }

  return wrapper;
}
