(async () => {
  "use strict";
  const R = globalThis.PrivacyShieldCosmeticRules;
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  const host = (() => { try { return new URL(tab?.url || "").hostname; } catch { return ""; } })();
  let settings = await browser.runtime.sendMessage({ type: "settings:get" });
  const stats = tab?.id != null ? await browser.runtime.sendMessage({ type: "tab:stats", tabId: tab.id }) : { blocked: 0, cleaned: 0, local: 0 };
  const pageStats = tab?.id != null ? await browser.runtime.sendMessage({ type: "page:stats", tabId: tab.id }) : { hidden: 0 };
  const popupStatus = document.querySelector("#popupStatus");

  document.querySelector("#site").textContent = host || "This page";
  document.querySelector("#blocked").textContent = stats.blocked || 0;
  document.querySelector("#cleaned").textContent = stats.cleaned || 0;
  document.querySelector("#hiddenCount").textContent = pageStats.hidden || 0;
  document.querySelector("#local").textContent = stats.local || 0;
  const siteEnabled = settings?.siteOverrides?.[host]?.enabled ?? settings?.enabled ?? true;
  const toggle = document.querySelector("#enabled");
  toggle.checked = siteEnabled;
  toggle.addEventListener("change", async () => {
    await browser.runtime.sendMessage({ type: "site:toggle", hostname: host, enabled: toggle.checked });
    if (tab?.id != null) browser.tabs.reload(tab.id);
  });

  document.querySelector("#picker").addEventListener("click", () => {
    if (tab?.id != null) browser.tabs.sendMessage(tab.id, { type: "picker:start", mode: "picker" });
    window.close();
  });

  document.querySelector("#zapper").addEventListener("click", () => {
    if (tab?.id != null) browser.tabs.sendMessage(tab.id, { type: "picker:start", mode: "zapper" });
    window.close();
  });

  document.querySelector("#undo").addEventListener("click", async () => {
    if (!host) {
      popupStatus.textContent = "No website is active.";
      return;
    }
    const result = R.undoLast(settings?.customRules || "", host);
    if (!result.removed) {
      popupStatus.textContent = "No custom hidden element to restore on this site.";
      return;
    }
    settings = await browser.runtime.sendMessage({
      type: "settings:set",
      settings: { ...settings, customRules: result.text }
    });
    popupStatus.textContent = "Restored. Reloading the page…";
    if (tab?.id != null) await browser.tabs.reload(tab.id);
    window.close();
  });

  document.querySelector("#hidden").addEventListener("click", () => {
    browser.tabs.create({ url: browser.runtime.getURL("hidden.html") });
  });
  document.querySelector("#logger").addEventListener("click", () => browser.tabs.create({ url: browser.runtime.getURL("logger.html") }));
  document.querySelector("#options").addEventListener("click", () => browser.runtime.openOptionsPage());
})();
