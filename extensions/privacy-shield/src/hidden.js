(() => {
  "use strict";

  const R = globalThis.PrivacyShieldCosmeticRules;
  let settings = null;

  function status(text) {
    document.querySelector("#status").textContent = text;
  }

  function visibleRules() {
    const query = document.querySelector("#filter").value.trim().toLowerCase();
    const rules = R.list(settings?.customRules || "");
    if (!query) return rules;
    return rules.filter((item) => `${item.domainText || "all sites"} ${item.selector}`.toLowerCase().includes(query));
  }

  async function restore(item) {
    const result = R.removeAt(settings?.customRules || "", item.lineIndex, item.raw);
    if (!result.removed) {
      status("That rule changed before it could be restored. Reloading the list.");
      await load();
      return;
    }
    settings = await browser.runtime.sendMessage({
      type: "settings:set",
      settings: { ...settings, customRules: result.text }
    });
    status(`Restored ${item.domainText || "all sites"}. Reload the affected page.`);
    render();
  }

  function render() {
    const container = document.querySelector("#hiddenList");
    const empty = document.querySelector("#empty");
    const rules = visibleRules();
    container.replaceChildren();
    empty.hidden = rules.length !== 0;

    for (const item of rules) {
      const row = document.createElement("article");
      row.className = "hidden-item";

      const details = document.createElement("div");
      details.className = "hidden-item-details";

      const site = document.createElement("strong");
      site.textContent = item.domainText || "All sites";

      const selector = document.createElement("code");
      selector.textContent = item.selector;

      const button = document.createElement("button");
      button.textContent = "Restore";
      button.addEventListener("click", () => restore(item));

      details.append(site, selector);
      row.append(details, button);
      container.appendChild(row);
    }
  }

  async function load() {
    settings = await browser.runtime.sendMessage({ type: "settings:get" });
    render();
  }

  document.querySelector("#filter").addEventListener("input", render);
  document.querySelector("#openSettings").addEventListener("click", () => browser.runtime.openOptionsPage());
  load();
})();
