import { savedAction } from "./ui.js";

export function renderSnoozedView({ snoozeState, needle }) {
  const wrapper = document.createElement("div");
  wrapper.className = "saved-view";

  if (!snoozeState) {
    const error = document.createElement("div");
    error.className = "empty";
    error.textContent = "Snooze state is unavailable because its local data could not be validated.";
    wrapper.append(error);
    return wrapper;
  }

  const now = Date.now();
  const items = snoozeState.items.filter((item) =>
    !needle || `${item.title} ${item.url}`.toLocaleLowerCase().includes(needle)
  );

  const heading = document.createElement("h2");
  heading.className = "saved-heading";
  heading.textContent = `Snoozed tabs · ${items.length}`;
  wrapper.append(heading);

  for (const item of items) {
    const card = document.createElement("section");
    card.className = "saved-card";
    const main = document.createElement("div");
    main.className = "saved-main";
    const title = document.createElement("div");
    title.className = "saved-title";
    title.textContent = item.title;
    const meta = document.createElement("div");
    meta.className = "saved-meta";
    const deadline = item.wakeAt <= now ? "Overdue — waiting for safe restore" : `Wake ${new Date(item.wakeAt).toLocaleString()}`;
    meta.textContent = `${deadline} · ${item.url}`;
    main.append(title, meta);

    const actions = document.createElement("div");
    actions.className = "actions";
    const openNow = savedAction("↗", `Open snoozed tab ${item.title} now`, "restore-snoozed-item", item.id);
    openNow.dataset.snoozeId = item.id;
    openNow.removeAttribute("data-saved-id");
    const delayHour = savedAction("+1h", `Delay ${item.title} for one hour from now`, "reschedule-snoozed-item", item.id);
    delayHour.dataset.snoozeId = item.id;
    delayHour.removeAttribute("data-saved-id");
    actions.append(openNow, delayHour);
    card.append(main, actions);
    wrapper.append(card);
  }

  if (!items.length) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = needle ? "No snoozed tabs match this search." : "No tabs are snoozed.";
    wrapper.append(empty);
  }

  return wrapper;
}
