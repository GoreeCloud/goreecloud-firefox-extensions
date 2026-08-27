(() => {
  "use strict";

  const LP = globalThis.PrivacyShieldLoggerPrivacy;
  const PAGE_LOG_LIMIT = 1000;
  const ALLOWED_REASONS = new Set(["cosmetic-content", "annoyance-overlay", "element-picker", "zapper"]);
  const hiddenByTab = new Map();
  let pageLogs = [];

  function tabHidden(tabId) {
    return hiddenByTab.get(tabId) || 0;
  }

  function setTabHidden(tabId, value) {
    hiddenByTab.set(tabId, Math.max(0, Number(value) || 0));
  }

  function appendPageLog(sender, reason, amount) {
    const entry = {
      id: `page-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      time: Date.now(),
      tabId: sender.tab?.id ?? -1,
      type: "page",
      method: "",
      verdict: "hidden",
      reason,
      url: sender.url || sender.tab?.url || "",
      finalUrl: null,
      count: amount,
      source: "page"
    };
    pageLogs.push(entry);
    if (pageLogs.length > PAGE_LOG_LIMIT) pageLogs = pageLogs.slice(-PAGE_LOG_LIMIT);
    browser.runtime.sendMessage({ type: "logger:event", entry: LP.publicEntry(entry) }).catch(() => {});
  }

  browser.runtime.onMessage.addListener((message, sender) => {
    if (!message || typeof message !== "object") return undefined;

    if (message.type === "page:filtered") {
      const tabId = sender.tab?.id;
      if (tabId == null) return false;
      const reason = String(message.reason || "");
      if (!ALLOWED_REASONS.has(reason)) return false;
      const amount = Math.min(500, Math.max(1, Number(message.amount) || 1));
      setTabHidden(tabId, tabHidden(tabId) + amount);
      appendPageLog(sender, reason, amount);
      return { hidden: tabHidden(tabId) };
    }

    if (message.type === "page:stats") {
      return { hidden: tabHidden(message.tabId) };
    }

    if (message.type === "page:logger:get") {
      const limit = Math.min(Number(message.limit) || 500, PAGE_LOG_LIMIT);
      return pageLogs.slice(-limit).map((entry) => LP.publicEntry(entry));
    }

    if (message.type === "page:logger:reveal") {
      const entry = pageLogs.find((item) => item.id === message.id);
      return entry ? { id: entry.id, url: entry.url, finalUrl: null } : null;
    }

    if (message.type === "page:logger:clear") {
      pageLogs = [];
      return true;
    }

    return undefined;
  });

  browser.tabs.onRemoved.addListener((tabId) => hiddenByTab.delete(tabId));
  browser.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.status === "loading") setTabHidden(tabId, 0);
  });
})();
