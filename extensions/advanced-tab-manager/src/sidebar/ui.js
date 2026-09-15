export function badge(text) {
  const node = document.createElement("span");
  node.className = "badge";
  node.textContent = text;
  return node;
}

export function actionButton(label, title, action, tabId, extra = {}) {
  const button = document.createElement("button");
  button.className = "row-action";
  button.type = "button";
  button.textContent = label;
  button.title = title;
  button.setAttribute("aria-label", title);
  button.dataset.action = action;
  if (Number.isInteger(tabId)) button.dataset.tabId = String(tabId);
  for (const [key, value] of Object.entries(extra)) button.dataset[key] = String(value);
  return button;
}

export function savedAction(label, title, action, id) {
  return actionButton(label, title, action, null, { savedId: id });
}
