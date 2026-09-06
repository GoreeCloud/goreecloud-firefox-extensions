(async () => {
  "use strict";

  const C = globalThis.PrivacyShieldCore;
  const R = globalThis.PrivacyShieldCosmeticRules;
  const P = globalThis.PrivacyShieldSiteProfiles;
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  const host = (() => { try { return new URL(tab?.url || "").hostname; } catch { return ""; } })();
  const isWebPage = /^https?:/i.test(tab?.url || "");
  let settings = await browser.runtime.sendMessage({ type: "settings:get" });
  const [stats, logs] = await Promise.all([
    tab?.id != null ? browser.runtime.sendMessage({ type: "tab:stats", tabId: tab.id }) : Promise.resolve({ blocked: 0, cleaned: 0, hidden: 0, local: 0 }),
    browser.runtime.sendMessage({ type: "logger:get", limit: 500 }).catch(() => [])
  ]);
  const popupStatus = document.querySelector("#popupStatus");

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

  function renderDetails(entries) {
    const list = document.querySelector("#detailList");
    const totalNode = document.querySelector("#detailTotal");
    const counts = new Map();
    for (const entry of entries || []) {
      if (entry?.tabId !== tab?.id) continue;
      if (!["blocked", "redirected", "hidden"].includes(entry.verdict)) continue;
      const reason = String(entry.reason || "other-protection");
      counts.set(reason, (counts.get(reason) || 0) + Math.max(1, Number(entry.count) || 1));
    }
    const rows = Array.from(counts.entries()).sort((a, b) => b[1] - a[1] || friendlyReason(a[0]).localeCompare(friendlyReason(b[0])));
    const total = rows.reduce((sum, [, count]) => sum + count, 0);
    totalNode.textContent = total ? `• ${total}` : "";
    list.replaceChildren();
    if (!rows.length) {
      const empty = document.createElement("div");
      empty.className = "detail-empty";
      empty.textContent = "No protection activity recorded for this tab in the current logger session.";
      list.appendChild(empty);
      return;
    }
    for (const [reason, count] of rows) {
      const row = document.createElement("div");
      row.className = "detail-row";
      const label = document.createElement("span");
      label.textContent = friendlyReason(reason);
      const value = document.createElement("b");
      value.textContent = String(count);
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

  document.querySelector("#site").textContent = host || "This page";
  document.querySelector("#blocked").textContent = stats.blocked || 0;
  document.querySelector("#cleaned").textContent = stats.cleaned || 0;
  document.querySelector("#hiddenCount").textContent = stats.hidden || 0;
  document.querySelector("#local").textContent = stats.local || 0;
  renderDetails(logs);

  const siteEnabled = C.resolveSettings(settings, host).enabled ?? true;
  const toggle = document.querySelector("#enabled");
  toggle.checked = Boolean(siteEnabled && host);
  toggle.disabled = !host || !isWebPage;
  toggle.addEventListener("change", async () => {
    await browser.runtime.sendMessage({ type: "site:toggle", hostname: host, enabled: toggle.checked });
    if (tab?.id != null) browser.tabs.reload(tab.id);
  });

  const profileSelect = document.querySelector("#siteProfile");
  const applyProfile = document.querySelector("#applyProfile");
  const currentProfile = host ? P.profileFor(settings, host) : "standard";
  profileSelect.value = currentProfile;
  profileSelect.disabled = !host || !isWebPage;
  applyProfile.disabled = !host || !isWebPage || currentProfile === "custom";
  setProfileHelp(currentProfile);
  profileSelect.addEventListener("change", () => {
    applyProfile.disabled = !host || !isWebPage || profileSelect.value === "custom";
    setProfileHelp(profileSelect.value);
  });
  applyProfile.addEventListener("click", async () => {
    if (!host || !isWebPage || profileSelect.value === "custom") return;
    const next = P.applyProfile(settings, host, profileSelect.value);
    settings = await browser.runtime.sendMessage({ type: "settings:set", settings: next });
    popupStatus.textContent = `${P.PROFILES[profileSelect.value].label} mode applied. Reloading…`;
    if (tab?.id != null) await browser.tabs.reload(tab.id);
    window.close();
  });

  document.querySelector("#copyCleanUrl").disabled = !isWebPage;
  document.querySelector("#copyCleanUrl").addEventListener("click", async () => {
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
    popupStatus.textContent = "Site-specific settings reset. Reloading…";
    if (tab?.id != null) await browser.tabs.reload(tab.id);
    window.close();
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
