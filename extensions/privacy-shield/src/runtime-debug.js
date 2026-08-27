(() => {
  "use strict";
  if (location.hostname !== "127.0.0.1") return;
  const C = globalThis.PrivacyShieldCore;
  const publish = async () => {
    const root = document.documentElement;
    if (!root || !C) return;
    const sample = `${location.origin}/debug?utm_source=runtime&fbclid=debug&keep=yes`;
    root.dataset.goreecloudDebugClean = C.cleanUrl(sample, { bypassRedirects: true });
    const parsed = new URL(sample);
    root.dataset.goreecloudDebugKeys = JSON.stringify(Array.from(parsed.searchParams.keys()));
    parsed.searchParams.delete("utm_source");
    parsed.searchParams.delete("fbclid");
    root.dataset.goreecloudDebugManual = parsed.href;
    root.dataset.goreecloudDebugFbclidSet = String(C.TRACKING_PARAMS.has("fbclid"));
    try {
      const settings = await browser.runtime.sendMessage({ type: "settings:get" });
      root.dataset.goreecloudDebugCleanLinks = String(settings?.cleanLinks);
    } catch {
      root.dataset.goreecloudDebugCleanLinks = "message-error";
    }
  };
  if (document.documentElement) publish();
  else document.addEventListener("readystatechange", publish, { once: true });
})();
