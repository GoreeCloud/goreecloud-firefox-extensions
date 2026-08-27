(async () => {
  "use strict";
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  const host = (() => { try { return new URL(tab?.url || "").hostname; } catch { return ""; } })();
  const settings = await browser.runtime.sendMessage({ type: "settings:get" });
  const stats = tab?.id != null ? await browser.runtime.sendMessage({ type: "tab:stats", tabId: tab.id }) : { blocked: 0, cleaned: 0, local: 0 };
  document.querySelector("#site").textContent = host || "This page";
  document.querySelector("#blocked").textContent = stats.blocked || 0;
  document.querySelector("#cleaned").textContent = stats.cleaned || 0;
  document.querySelector("#local").textContent = stats.local || 0;
  const siteEnabled = settings?.siteOverrides?.[host]?.enabled ?? settings?.enabled ?? true;
  const toggle = document.querySelector("#enabled");
  toggle.checked = siteEnabled;
  toggle.addEventListener("change", async () => {
    await browser.runtime.sendMessage({ type: "site:toggle", hostname: host, enabled: toggle.checked });
    if (tab?.id != null) browser.tabs.reload(tab.id);
  });
  document.querySelector("#picker").addEventListener("click", () => { if (tab?.id != null) browser.tabs.sendMessage(tab.id, { type: "picker:start", mode: "picker" }); window.close(); });
  document.querySelector("#zapper").addEventListener("click", () => { if (tab?.id != null) browser.tabs.sendMessage(tab.id, { type: "picker:start", mode: "zapper" }); window.close(); });
  document.querySelector("#logger").addEventListener("click", () => browser.tabs.create({ url: browser.runtime.getURL("logger.html") }));
  document.querySelector("#options").addEventListener("click", () => browser.runtime.openOptionsPage());
})();
