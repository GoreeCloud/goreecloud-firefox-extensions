(() => {
  "use strict";
  const TOGGLES = [
    "enabled", "stripTrackingParams", "cleanLinks", "bypassRedirects", "disablePing", "stripETags",
    "blockAds", "blockTrackers", "blockMalware", "blockMiners", "blockPopups", "cosmeticFiltering",
    "localResources", "blockThirdPartyScripts", "blockThirdPartyFrames", "blockMedia", "logAllowed"
  ];
  let settings = null;

  async function load() {
    settings = await browser.runtime.sendMessage({ type: "settings:get" });
    for (const id of TOGGLES) document.querySelector(`#${id}`).checked = Boolean(settings[id]);
    document.querySelector("#filterLists").value = (settings.filterLists || []).join("\n");
    document.querySelector("#customRules").value = settings.customRules || "";
  }

  async function save() {
    const next = { ...settings };
    for (const id of TOGGLES) next[id] = document.querySelector(`#${id}`).checked;
    next.filterLists = document.querySelector("#filterLists").value.split(/\r?\n/).map((v) => v.trim()).filter(Boolean);
    next.customRules = document.querySelector("#customRules").value;
    settings = await browser.runtime.sendMessage({ type: "settings:set", settings: next });
    status("Saved locally.");
  }

  function status(text) { document.querySelector("#status").textContent = text; }
  document.querySelector("#save").addEventListener("click", save);
  document.querySelector("#refresh").addEventListener("click", async () => {
    await save(); status("Updating filter lists…");
    const result = await browser.runtime.sendMessage({ type: "subscriptions:update" });
    status(`Updated ${result.listCount} configured list(s); imported up to ${result.ruleCount} lines.`);
  });
  document.querySelector("#manageHidden").addEventListener("click", () => browser.tabs.create({ url: browser.runtime.getURL("hidden.html") }));
  document.querySelector("#openLogger").addEventListener("click", () => browser.tabs.create({ url: browser.runtime.getURL("logger.html") }));
  load();
})();
