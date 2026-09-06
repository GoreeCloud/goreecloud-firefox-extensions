(() => {
  "use strict";

  const MAX_REASON_ROWS = 32;
  const PROFILE_LABELS = Object.freeze({
    standard: "Standard",
    strict: "Strict",
    compatible: "Compatible",
    custom: "Custom"
  });

  function cleanText(value, maxLength = 120) {
    return String(value ?? "")
      .replace(/[\r\n\t]+/g, " ")
      .replace(/\s{2,}/g, " ")
      .trim()
      .slice(0, maxLength);
  }

  function cleanHostname(value) {
    return cleanText(value, 255)
      .toLowerCase()
      .replace(/[^a-z0-9.-]/g, "")
      .replace(/^\.+|\.+$/g, "");
  }

  function nonNegativeInteger(value) {
    return Math.max(0, Math.floor(Number(value) || 0));
  }

  function profileLabel(value) {
    const key = String(value || "standard").toLowerCase();
    return PROFILE_LABELS[key] || "Custom";
  }

  function normalizedReasonRows(rows) {
    const safe = [];
    for (const row of Array.isArray(rows) ? rows : []) {
      if (safe.length >= MAX_REASON_ROWS) break;
      const label = cleanText(row?.label || "Other protection", 80);
      const count = nonNegativeInteger(row?.count);
      if (!label || !count) continue;
      safe.push({ label, count });
    }
    return safe;
  }

  function buildSnapshot(input = {}) {
    const version = cleanText(input.version || "unknown", 32);
    const browserName = cleanText(input.browserName || "Firefox", 40);
    const browserVersion = cleanText(input.browserVersion || "unknown", 40);
    const hostname = cleanHostname(input.hostname) || "not available";
    const enabled = Boolean(input.enabled);
    const profile = profileLabel(input.profile);
    const stats = {
      blocked: nonNegativeInteger(input.stats?.blocked),
      cleaned: nonNegativeInteger(input.stats?.cleaned),
      hidden: nonNegativeInteger(input.stats?.hidden),
      local: nonNegativeInteger(input.stats?.local)
    };
    const reasons = normalizedReasonRows(input.reasonRows);

    const lines = [
      "GoreeCloud Privacy Shield support snapshot",
      `Extension: ${version}`,
      `Browser: ${browserName} ${browserVersion}`,
      `Site: ${hostname}`,
      `Protection: ${enabled ? "On" : "Off"}`,
      `Site mode: ${profile}`,
      `This tab: ${stats.blocked} blocked, ${stats.cleaned} cleaned, ${stats.hidden} hidden, ${stats.local} local`
    ];

    if (reasons.length) {
      lines.push("Protection details:");
      for (const row of reasons) lines.push(`- ${row.label}: ${row.count}`);
    } else {
      lines.push("Protection details: none recorded for this tab in the current logger session");
    }

    lines.push(
      "Privacy boundary: this snapshot contains no raw request URLs, query strings, page content, DOM selectors, credentials, cookies, or logger identifiers."
    );

    return lines.join("\n");
  }

  globalThis.PrivacyShieldSupportSnapshot = Object.freeze({
    buildSnapshot,
    cleanHostname,
    nonNegativeInteger,
    normalizedReasonRows,
    profileLabel
  });
})();
