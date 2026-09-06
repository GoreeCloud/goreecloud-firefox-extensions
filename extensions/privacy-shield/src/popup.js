(async () => {
  "use strict";

  const C = globalThis.PrivacyShieldCore;
  const R = globalThis.PrivacyShieldCosmeticRules;
  const P = globalThis.PrivacyShieldSiteProfiles;
  const S = globalThis.PrivacyShieldSupportSnapshot;
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  const host = (() => { try { return new URL(tab?.url || "").hostname; } catch { return ""; } })();
  const isWebPage = /^https?:/i.test(tab?.url || "");
  let settings = await browser.runtime.sendMessage({ type: "settings:get" });
  let [currentStats, currentLogs] = await Promise.all([
    tab?.id != null ? browser.runtime.sendMessage({ type: "tab:stats", tabId: tab.id }) : Promise.resolve({ blocked: 0, cleaned: 0, hidden: 0, local: 0 }),
    browser.runtime.sendMessage({ type: "logger:get", limit: 500 }).catch(() => [])
  ]);
  const popupStatus = document.querySelector("#popupStatus");
  const protectionState = document.querySelector("#protectionState");

  const DETAIL_LABELS = Object.freeze({
    "tracker-domain": "Tracker requests",
    "ad-domain": "Ad requests",
    "cryptocurrency-miner-domain": "Cryptocurrency miners",
    "malicious-domain": "Malicious domains",
    "hyperlink-auditing-ping": "Hyperlink auditing pings",
    "telemetry-beacon": "Telemetry beacons",
    "third-party-script": "Third-party scripts",
    "third-party-frame": "Third-party frames",
    "media-request": "Media / object requests",
    "custom-domain-rule": "Custom domain rules",
    "custom-url-rule": "Custom URL rules",
    "tracking-parameter-cleanup": "Tracking-parameter cleanup",
    "local-resource-substitution": "Local resource substitutions",
    "cosmetic-content": "Hidden page content",
    "annoyance-overlay": "Reviewed overlays",
    "element-picker": "Element Picker hides",
    "zapper": "Zapper removals"
  });

  function friendlyReason(reason) {
    if (DETAIL_LABELS[reason]) return DETAIL_LABELS[reason];
    return String(reason || "Other protection").replace(/[-_]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  function detailRows(entries) {
    const counts = new Map();
    for (const entry of entries || []) {
      if (entry?.tabId !== tab?.id) continue;
      if (!["blocked", "redirected", "hidden"].includes(entry.verdict)) continue;
      const reason = String(entry.reason || "other-protection");
      counts.set(reason, (counts.get(reason) || 0) + Math.max(1, Number(entry.count) || 1));
    }
    return Array.from(counts.entries())
      .map(([reason, count]) => ({ reason, label: friendlyReason(reason), count }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  }

  let currentReasonRows = detailRows(currentLogs);

  function renderStats(stats) {
    document.querySelector("#blocked").textContent = stats?.blocked || 0;
    document.querySelector("#cleaned").textContent = stats?.cleaned || 0;
    document.querySelector("#hiddenCount").textContent = stats?.hidden || 0;
    document.querySelector("#local").textContent = stats?.local || 0;
  }

  function renderDetails(rows) {
    const list = document.querySelector("#detailList");
    const totalNode = document.querySelector("#detailTotal");
    const total = (rows || []).reduce((sum, row) => sum + Math.max(0, Number(row.count) || 0), 0);
    totalNode.textContent = total ? `• ${total}` : "";
    list.replaceChildren();
    if (!rows?.length) {
      const empty = document.createElement("div");
      empty.className = "detail-empty";
      empty.textContent = "No protection activity recorded for this tab in the current logger session.";
      list.appendChild(empty);
      return;
    }
    for (const rowData of rows) {
      const row = document.createElement("div");
      row.className = "detail-row";
      const label = document.createElement("span");
      label.textContent = rowData.label;
      const value = document.createElement("b");
      value.textContent = String(rowData.count);
      row.append(label, value);
      list.appendChild(row);
    }
  }

  function setProfileHelp(profileName) {
    const help = document.querySelector("#profileHelp");
    if (profileName === "custom") {
      help.textContent = "Custom per-site settings are active. Choose a mode and Apply to replace its managed controls.";
      return;
    }
    help.textContent = P.PROFILES[profileName]?.description || "Choose how Privacy Shield should protect this site.";
  }

  function profileDisplayName(profileName) {
    if (profileName === "custom") return "Custom";
    return P.PROFILES[profileName]?.label || "Standard";
  }

  async function writeClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      const area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      const copied = document.execCommand("copy");
      area.remove();
      return copied;
    }
  }

  const siteEnabled = C.resolveSettings(settings, host).enabled ?? true;
  const toggle = document.querySelector("#enabled");
  const profileSelect = document.querySelector("#siteProfile");
  const applyProfile = document.querySelector("#applyProfile");
  let activeProfile = host ? P.profileFor(settings, host) : "standard";

  function updateProtectionState() {
    if (!isWebPage || !host) {
      protectionState.textContent = "Unavailable on this page";
      return;
    }
    protectionState.textContent = `${toggle.checked ? "On" : "Off"} · ${profileDisplayName(activeProfile)} mode`;
  }

  async function refreshActivity(options = {}) {
    const announce = options.announce !== false;
    if (tab?.id == null) return;
    try {
      [currentStats, currentLogs] = await Promise.all([
        browser.runtime.sendMessage({ type: "tab:stats", tabId: tab.id }),
        browser.runtime.sendMessage({ type: "logger:get", limit: 500 }).catch(() => [])
      ]);
      currentReasonRows = detailRows(currentLogs);
      renderStats(currentStats);
      renderDetails(currentReasonRows);
      if (announce) popupStatus.textContent = "Protection details refreshed.";
    } catch {
      if (announce) popupStatus.textContent = "Protection details could not be refreshed.";
    }
  }

  document.querySelector("#site").textContent = host || "This page";
  renderStats(currentStats);
  renderDetails(currentReasonRows);

  toggle.checked = Boolean(siteEnabled && host);
  toggle.disabled = !host || !isWebPage;
  updateProtectionState();
  toggle.addEventListener("change", async () => {
    updateProtectionState();
    await browser.runtime.sendMessage({ type: "site:toggle", hostname: host, enabled: toggle.checked });
    if (tab?.id != null) browser.tabs.reload(tab.id);
  });

  profileSelect.value = activeProfile;
  profileSelect.disabled = !host || !isWebPage;
  applyProfile.disabled = !host || !isWebPage || activeProfile === "custom";
  setProfileHelp(activeProfile);
  profileSelect.addEventListener("change", () => {
    applyProfile.disabled = !host || !isWebPage || profileSelect.value === "custom";
    setProfileHelp(profileSelect.value);
  });
  applyProfile.addEventListener("click", async () => {
    if (!host || !isWebPage || profileSelect.value === "custom") return;
    const next = P.applyProfile(settings, host, profileSelect.value);
    settings = await browser.runtime.sendMessage({ type: "settings:set", settings: next });
    activeProfile = profileSelect.value;
    updateProtectionState();
    popupStatus.textContent = `${P.PROFILES[profileSelect.value].label} mode applied. Reloading…`;
    if (tab?.id != null) await browser.tabs.reload(tab.id);
    window.close();
  });

  const copyCleanUrl = document.querySelector("#copyCleanUrl");
  copyCleanUrl.disabled = !isWebPage;
  copyCleanUrl.addEventListener("click", async () => {
    if (!isWebPage || !tab?.url) {
      popupStatus.textContent = "This page does not have a cleanable web URL.";
      return;
    }
    const cleaned = await browser.runtime.sendMessage({ type: "url:clean", url: tab.url });
    const copied = await writeClipboard(cleaned || tab.url);
    popupStatus.textContent = copied
      ? (cleaned !== tab.url ? "Clean URL copied." : "URL copied — no tracking parameters found.")
      : "Firefox did not allow clipboard access.";
  });

  const resetSite = document.querySelector("#resetSite");
  resetSite.disabled = !host || !isWebPage || !settings?.siteOverrides?.[C.normalizeHostname(host)];
  resetSite.addEventListener("click", async () => {
    if (!host || !isWebPage) return;
    const next = P.resetSite(settings, host);
    settings = await browser.runtime.sendMessage({ type: "settings:set", settings: next });
    activeProfile = "standard";
    updateProtectionState();
    popupStatus.textContent = "Site-specific settings reset. Reloading…";
    if (tab?.id != null) await browser.tabs.reload(tab.id);
    window.close();
  });

  const refreshDetails = document.querySelector("#refreshDetails");
  refreshDetails.disabled = tab?.id == null;
  refreshDetails.addEventListener("click", () => refreshActivity());

  const copySupportSnapshot = document.querySelector("#copySupportSnapshot");
  copySupportSnapshot.disabled = !isWebPage || !host || !S?.buildSnapshot;
  copySupportSnapshot.addEventListener("click", async () => {
    if (!isWebPage || !host || !S?.buildSnapshot) return;
    await refreshActivity({ announce: false });
    let browserName = "Firefox";
    let browserVersion = "unknown";
    try {
      const info = await browser.runtime.getBrowserInfo();
      browserName = info?.name || browserName;
      browserVersion = info?.version || browserVersion;
    } catch { /* Firefox may omit runtime.getBrowserInfo in some test harnesses */ }
    const version = browser.runtime.getManifest()?.version || "unknown";
    const snapshot = S.buildSnapshot({
      version,
      browserName,
      browserVersion,
      hostname: host,
      enabled: toggle.checked,
      profile: activeProfile,
      stats: currentStats,
      reasonRows: currentReasonRows.map((row) => ({ label: row.label, count: row.count }))
    });
    const copied = await writeClipboard(snapshot);
    popupStatus.textContent = copied
      ? "Privacy-safe support snapshot copied."
      : "Firefox did not allow clipboard access.";
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
