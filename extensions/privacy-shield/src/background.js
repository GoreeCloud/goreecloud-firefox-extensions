(() => {
  "use strict";

  const C = globalThis.PrivacyShieldCore;
  const LP = globalThis.PrivacyShieldLoggerPrivacy;
  const LOG_LIMIT = 2000;
  const REMOTE_RULE_LIMIT = 60000;
  const PAGE_FILTER_REASONS = new Set(["cosmetic-content", "annoyance-overlay", "element-picker", "zapper"]);
  let settings = { ...C.DEFAULT_SETTINGS };
  let builtin = { ads: [], trackers: [], miners: [], malicious: [] };
  let userRules = C.parseFilterText("");
  let remoteRules = C.parseFilterText("");
  let combinedRules = C.mergeParsedRules(userRules, remoteRules);
  let logs = [];
  const countersByTab = new Map();

  const ready = (async () => {
    try {
      const stored = await browser.storage.local.get(["settings", "remoteRuleText"]);
      settings = { ...C.DEFAULT_SETTINGS, ...(stored.settings || {}) };
      userRules = C.parseFilterText(settings.customRules || "");
      remoteRules = C.parseFilterText(stored.remoteRuleText || "");
      combinedRules = C.mergeParsedRules(userRules, remoteRules);
      builtin = await fetch(browser.runtime.getURL("rules/builtin.json")).then((r) => r.json());
    } catch (error) {
      console.error("Privacy Shield initialization failed", error);
    }
  })();

  function tabCounters(tabId) {
    if (!countersByTab.has(tabId)) countersByTab.set(tabId, { blocked: 0, cleaned: 0, hidden: 0, local: 0 });
    return countersByTab.get(tabId);
  }

  function logEvent(details, verdict, reason, finalUrl = null, extra = {}) {
    if (verdict === "allowed" && !settings.logAllowed) return;
    const entry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      time: Date.now(),
      tabId: details.tabId ?? -1,
      type: details.type || "other",
      method: details.method || "GET",
      verdict,
      reason,
      url: details.url,
      finalUrl,
      count: Math.max(1, Number(extra.count) || 1),
      source: extra.source === "page" ? "page" : "network"
    };
    logs.push(entry);
    if (logs.length > LOG_LIMIT) logs = logs.slice(-LOG_LIMIT);
    browser.runtime.sendMessage({ type: "logger:event", entry: LP.publicEntry(entry) }).catch(() => {});
  }

  function logPageFilter(sender, reason, amount) {
    logEvent({
      tabId: sender.tab?.id ?? -1,
      type: "page",
      method: "",
      url: sender.url || sender.tab?.url || ""
    }, "hidden", reason, null, { count: amount, source: "page" });
  }

  function requestHostname(details) {
    try { return new URL(details.url).hostname; } catch { return ""; }
  }

  function initiatorHostname(details) {
    const source = details.documentUrl || details.originUrl || details.initiator || "";
    try { return new URL(source).hostname; } catch { return ""; }
  }

  function settingsFor(details) {
    return C.resolveSettings(settings, initiatorHostname(details) || requestHostname(details));
  }

  function matchesDomains(host, domains) {
    return (domains || []).some((domain) => C.hostnameMatches(host, domain));
  }

  function userRuleVerdict(url, host) {
    if (matchesDomains(host, combinedRules.allowDomains)) return { allow: true, reason: "user-exception" };
    for (const pattern of combinedRules.urlPatterns) {
      if (pattern.allow && C.patternMatches(url, pattern)) return { allow: true, reason: "user-pattern-exception" };
    }
    if (matchesDomains(host, combinedRules.blockDomains)) return { block: true, reason: "custom-domain-rule" };
    for (const pattern of combinedRules.urlPatterns) {
      if (!pattern.allow && C.patternMatches(url, pattern)) return { block: true, reason: "custom-url-rule" };
    }
    return null;
  }

  function blockReason(details, siteSettings) {
    const host = requestHostname(details);
    const custom = userRuleVerdict(details.url, host);
    if (custom?.allow) return null;
    if (custom?.block) return custom.reason;
    if (siteSettings.disablePing && details.type === "ping") return "hyperlink-auditing-ping";
    if (siteSettings.disablePing && details.type === "beacon") return "telemetry-beacon";
    if (siteSettings.blockAds && matchesDomains(host, builtin.ads)) return "ad-domain";
    if (siteSettings.blockTrackers && matchesDomains(host, builtin.trackers)) return "tracker-domain";
    if (siteSettings.blockMiners && matchesDomains(host, builtin.miners)) return "cryptocurrency-miner-domain";
    if (siteSettings.blockMalware && matchesDomains(host, builtin.malicious)) return "malicious-domain";

    const initiator = initiatorHostname(details);
    const thirdParty = initiator && host && !C.sameSite(initiator, host);
    if (siteSettings.blockThirdPartyScripts && details.type === "script" && thirdParty) return "third-party-script";
    if (siteSettings.blockThirdPartyFrames && details.type === "sub_frame" && thirdParty) return "third-party-frame";
    if (siteSettings.blockMedia && ["media", "object"].includes(details.type)) return "media-request";
    return null;
  }

  function localResourceFor(url) {
    try {
      const parsed = new URL(url);
      parsed.hash = "";
      const canonical = `${parsed.origin}${parsed.pathname}`;
      return C.LOCAL_RESOURCE_CATALOG[canonical] || C.LOCAL_RESOURCE_CATALOG[parsed.href] || null;
    } catch { return null; }
  }

  browser.webRequest.onBeforeRequest.addListener(
    (details) => {
      if (!/^https?:/i.test(details.url)) return {};
      const site = settingsFor(details);
      if (!site.enabled) return {};

      if (site.stripTrackingParams && details.type === "main_frame") {
        const cleaned = C.cleanUrl(details.url, { bypassRedirects: site.bypassRedirects });
        if (cleaned !== details.url) {
          tabCounters(details.tabId).cleaned += 1;
          logEvent(details, "redirected", "tracking-parameter-cleanup", cleaned);
          return { redirectUrl: cleaned };
        }
      }

      if (site.localResources) {
        const resource = localResourceFor(details.url);
        if (resource) {
          const target = browser.runtime.getURL(resource);
          tabCounters(details.tabId).local += 1;
          logEvent(details, "redirected", "local-resource-substitution", target);
          return { redirectUrl: target };
        }
      }

      const reason = blockReason(details, site);
      if (reason) {
        tabCounters(details.tabId).blocked += 1;
        logEvent(details, "blocked", reason);
        return { cancel: true };
      }
      logEvent(details, "allowed", "no-rule-match");
      return {};
    },
    { urls: ["<all_urls>"] },
    ["blocking"]
  );

  browser.webRequest.onBeforeSendHeaders.addListener(
    (details) => {
      const site = settingsFor(details);
      if (!site.enabled || !site.stripETags) return {};
      const requestHeaders = (details.requestHeaders || []).filter((header) => header.name.toLowerCase() !== "if-none-match");
      return { requestHeaders };
    },
    { urls: ["<all_urls>"] },
    ["blocking", "requestHeaders"]
  );

  browser.webRequest.onHeadersReceived.addListener(
    (details) => {
      const site = settingsFor(details);
      if (!site.enabled || !site.stripETags) return {};
      const responseHeaders = (details.responseHeaders || []).filter((header) => header.name.toLowerCase() !== "etag");
      return { responseHeaders };
    },
    { urls: ["<all_urls>"] },
    ["blocking", "responseHeaders"]
  );

  async function saveSettings(next) {
    settings = { ...C.DEFAULT_SETTINGS, ...next };
    userRules = C.parseFilterText(settings.customRules || "");
    combinedRules = C.mergeParsedRules(userRules, remoteRules);
    await browser.storage.local.set({ settings });
    return settings;
  }

  async function updateSubscriptions() {
    const urls = Array.from(new Set((settings.filterLists || []).map((v) => String(v).trim()).filter(Boolean))).slice(0, 20);
    const collected = [];
    for (const url of urls) {
      try {
        const parsed = new URL(url);
        if (parsed.protocol !== "https:") continue;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);
        const response = await fetch(parsed.href, { cache: "no-store", credentials: "omit", referrerPolicy: "no-referrer", signal: controller.signal });
        clearTimeout(timeout);
        if (!response.ok) continue;
        const text = await response.text();
        collected.push(text.slice(0, 5_000_000));
        if (collected.join("\n").split(/\r?\n/).length > REMOTE_RULE_LIMIT) break;
      } catch (error) {
        console.warn("Filter-list update failed", url, error);
      }
    }
    const remoteRuleText = collected.join("\n").split(/\r?\n/).slice(0, REMOTE_RULE_LIMIT).join("\n");
    remoteRules = C.parseFilterText(remoteRuleText);
    combinedRules = C.mergeParsedRules(userRules, remoteRules);
    await browser.storage.local.set({ remoteRuleText, filterListsUpdatedAt: Date.now() });
    return { listCount: urls.length, ruleCount: remoteRuleText ? remoteRuleText.split(/\r?\n/).length : 0 };
  }

  browser.runtime.onMessage.addListener(async (message, sender) => {
    await ready;
    if (!message || typeof message !== "object") return undefined;
    if (message.type === "settings:get") return settings;
    if (message.type === "settings:set") return saveSettings(message.settings || {});
    if (message.type === "subscriptions:update") return updateSubscriptions();
    if (message.type === "logger:get") {
      return logs.slice(-Math.min(Number(message.limit) || 500, LOG_LIMIT)).map((entry) => LP.publicEntry(entry));
    }
    if (message.type === "logger:reveal") {
      const entry = logs.find((item) => item.id === message.id);
      return entry ? { id: entry.id, url: entry.url, finalUrl: entry.finalUrl || null } : null;
    }
    if (message.type === "logger:clear") { logs = []; return true; }
    if (message.type === "tab:stats") return tabCounters(message.tabId);
    if (message.type === "cosmetic:get") {
      const site = C.resolveSettings(settings, message.hostname);
      return site.cosmeticFiltering ? C.cosmeticSelectorsFor(message.hostname, combinedRules, site.blockAds, false) : [];
    }
    if (message.type === "rule:addCosmetic") {
      const host = C.normalizeHostname(message.hostname);
      const selector = String(message.selector || "").trim();
      if (!host || !selector) return false;
      settings.customRules = `${settings.customRules || ""}\n${host}##${selector}`.trim();
      await saveSettings(settings);
      return true;
    }
    if (message.type === "pageguard:inject" && sender.tab?.id != null) {
      try {
        await browser.scripting.executeScript({
          target: { tabId: sender.tab.id, frameIds: [sender.frameId ?? 0] },
          files: ["src/page-guard.js"],
          world: "MAIN"
        });
        return true;
      } catch { return false; }
    }
    if (message.type === "url:clean") return C.cleanUrl(message.url, { bypassRedirects: true });
    if (message.type === "site:toggle") {
      const host = C.normalizeHostname(message.hostname);
      const siteOverrides = { ...(settings.siteOverrides || {}) };
      siteOverrides[host] = { ...(siteOverrides[host] || {}), enabled: Boolean(message.enabled) };
      return saveSettings({ ...settings, siteOverrides });
    }
    if (message.type === "content:stat" && sender.tab?.id != null) {
      const counters = tabCounters(sender.tab.id);
      counters[message.stat] = (counters[message.stat] || 0) + (Number(message.amount) || 1);
      return counters;
    }
    if (message.type === "page:filtered" && sender.tab?.id != null) {
      const reason = String(message.reason || "");
      if (!PAGE_FILTER_REASONS.has(reason)) return false;
      const amount = Math.min(500, Math.max(1, Number(message.amount) || 1));
      const counters = tabCounters(sender.tab.id);
      counters.hidden += amount;
      logPageFilter(sender, reason, amount);
      return counters;
    }
    return undefined;
  });

  browser.tabs.onRemoved.addListener((tabId) => countersByTab.delete(tabId));
  browser.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.status === "loading") countersByTab.set(tabId, { blocked: 0, cleaned: 0, hidden: 0, local: 0 });
  });

  browser.runtime.onInstalled.addListener(async () => {
    await ready;
    await saveSettings(settings);
    browser.alarms.create("privacy-shield-filter-lists", { periodInMinutes: 24 * 60 });
    browser.menus.create({ id: "copy-clean-link", title: "Copy clean link", contexts: ["link"] });
    browser.menus.create({ id: "privacy-shield-picker", title: "Block element with Privacy Shield", contexts: ["page", "frame"] });
  });

  browser.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "privacy-shield-filter-lists" && (settings.filterLists || []).length) updateSubscriptions();
  });

  browser.menus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === "copy-clean-link" && info.linkUrl) {
      const cleaned = C.cleanUrl(info.linkUrl, { bypassRedirects: true });
      try { await navigator.clipboard.writeText(cleaned); } catch { /* Firefox may require a focused extension document */ }
    }
    if (info.menuItemId === "privacy-shield-picker" && tab?.id != null) {
      browser.tabs.sendMessage(tab.id, { type: "picker:start", mode: "picker" }).catch(() => {});
    }
  });
})();
