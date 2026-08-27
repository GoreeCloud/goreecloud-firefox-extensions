(() => {
  "use strict";

  const TRACKING_PARAMS = new Set([
    "fbclid", "gclid", "dclid", "msclkid", "twclid", "ttclid", "yclid",
    "igshid", "gbraid", "wbraid", "mc_cid", "mc_eid", "mkt_tok",
    "vero_conv", "vero_id", "wickedid", "oly_anon_id", "oly_enc_id",
    "_hsenc", "_hsmi", "hsCtaTracking", "sc_campaign", "sc_channel",
    "sc_content", "sc_country", "sc_geo", "sc_medium", "sc_outcome",
    "sc_tactic", "sc_suppress", "campaignid", "adgroupid", "adid",
    "gad_source", "s_cid", "rb_clickid", "irclickid", "epik"
  ].map((value) => value.toLowerCase()));

  const TRACKING_PREFIXES = [
    "utm_", "pk_", "mtm_", "matomo_", "hsa_", "ga_", "vero_", "oly_"
  ];

  const REDIRECTORS = [
    { host: "www.google.com", path: "/url", params: ["q", "url"] },
    { host: "google.com", path: "/url", params: ["q", "url"] },
    { host: "www.facebook.com", path: "/l.php", params: ["u"] },
    { host: "l.facebook.com", path: "/l.php", params: ["u"] },
    { host: "lm.facebook.com", path: "/l.php", params: ["u"] },
    { host: "out.reddit.com", path: "", params: ["url"] },
    { host: "www.youtube.com", path: "/redirect", params: ["q"] }
  ];

  const DEFAULT_SETTINGS = Object.freeze({
    enabled: true,
    stripTrackingParams: true,
    cleanLinks: true,
    bypassRedirects: true,
    disablePing: true,
    stripETags: true,
    blockAds: true,
    blockTrackers: true,
    blockMalware: true,
    blockMiners: true,
    blockPopups: true,
    cosmeticFiltering: true,
    localResources: true,
    blockThirdPartyScripts: false,
    blockThirdPartyFrames: false,
    blockMedia: false,
    logAllowed: false,
    filterLists: [],
    customRules: "",
    siteOverrides: {}
  });

  const LOCAL_RESOURCE_CATALOG = Object.freeze({
    "https://cdn.jsdelivr.net/npm/normalize.css@8.0.1/normalize.css": "vendor/normalize-8.0.1.css",
    "https://cdnjs.cloudflare.com/ajax/libs/normalize/8.0.1/normalize.css": "vendor/normalize-8.0.1.css",
    "https://unpkg.com/normalize.css@8.0.1/normalize.css": "vendor/normalize-8.0.1.css"
  });

  const BUILTIN_COSMETIC_SELECTORS = Object.freeze([
    "ins.adsbygoogle",
    "[id^='google_ads_']",
    "[id^='div-gpt-ad']",
    "[data-ad-slot]",
    "[data-ad-client]",
    "iframe[src*='doubleclick.net']",
    "iframe[src*='googlesyndication.com']"
  ]);

  function normalizeHostname(hostname) {
    return String(hostname || "").trim().toLowerCase().replace(/^www\./, "").replace(/\.$/, "");
  }

  function hostnameMatches(hostname, ruleDomain) {
    const host = normalizeHostname(hostname);
    const domain = normalizeHostname(ruleDomain);
    return Boolean(domain) && (host === domain || host.endsWith(`.${domain}`));
  }

  function baseDomain(hostname) {
    const parts = normalizeHostname(hostname).split(".").filter(Boolean);
    if (parts.length <= 2) return parts.join(".");
    const secondLevelCc = new Set(["co.uk", "org.uk", "com.au", "net.au", "co.nz", "co.jp", "com.br"]);
    const lastTwo = parts.slice(-2).join(".");
    return secondLevelCc.has(lastTwo) && parts.length >= 3 ? parts.slice(-3).join(".") : lastTwo;
  }

  function sameSite(a, b) {
    if (!a || !b) return false;
    return baseDomain(a) === baseDomain(b);
  }

  function shouldDropParam(name) {
    const lower = String(name || "").toLowerCase();
    if (TRACKING_PARAMS.has(lower)) return true;
    return TRACKING_PREFIXES.some((prefix) => lower.startsWith(prefix));
  }

  function queryParamNames(parsed) {
    const query = String(parsed?.search || "").replace(/^\?/, "");
    if (!query) return [];
    const names = [];
    const seen = new Set();
    for (const part of query.split("&")) {
      if (!part) continue;
      const rawName = part.split("=", 1)[0];
      let name = rawName.replace(/\+/g, " ");
      try { name = decodeURIComponent(name); } catch { /* preserve malformed raw name */ }
      if (seen.has(name)) continue;
      seen.add(name);
      names.push(name);
    }
    return names;
  }

  function unwrapRedirect(url) {
    let parsed;
    try { parsed = new URL(url); } catch { return url; }
    const rule = REDIRECTORS.find((entry) => normalizeHostname(parsed.hostname) === normalizeHostname(entry.host) && (!entry.path || parsed.pathname === entry.path));
    if (!rule || !rule.params.length) return url;
    for (const param of rule.params) {
      const target = parsed.searchParams.get(param);
      if (!target) continue;
      try {
        const decoded = decodeURIComponent(target);
        const candidate = new URL(decoded);
        if (candidate.protocol === "http:" || candidate.protocol === "https:") return candidate.href;
      } catch {
        try {
          const candidate = new URL(target);
          if (candidate.protocol === "http:" || candidate.protocol === "https:") return candidate.href;
        } catch { /* ignore */ }
      }
    }
    return url;
  }

  function cleanUrl(input, options = {}) {
    const bypassRedirects = options.bypassRedirects !== false;
    let source = String(input || "").trim();
    if (bypassRedirects) source = unwrapRedirect(source);
    let parsed;
    try { parsed = new URL(source); } catch { return source; }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return source;
    // Firefox content-script compartments can expose an empty URLSearchParams
    // keys() iterator even though get()/delete() operate correctly. Derive names
    // from the serialized query and keep standards-based delete() for mutation.
    for (const key of queryParamNames(parsed)) {
      if (shouldDropParam(key)) parsed.searchParams.delete(key);
    }
    return parsed.href;
  }

  function parseFilterText(text) {
    const out = { blockDomains: [], allowDomains: [], urlPatterns: [], cosmetic: [], cosmeticExceptions: [] };
    const seen = new Set();
    for (const rawLine of String(text || "").split(/\r?\n/)) {
      let line = rawLine.trim();
      if (!line || line.startsWith("!") || line.startsWith("[") || line.startsWith("# ")) continue;
      const hostsMatch = line.match(/^(?:0\.0\.0\.0|127\.0\.0\.1)\s+([^\s#]+)/);
      if (hostsMatch) line = `||${hostsMatch[1]}^`;
      if (line.includes("#@#")) {
        const [domain, selector] = line.split("#@#", 2);
        if (selector) out.cosmeticExceptions.push({ domain: normalizeHostname(domain), selector });
        continue;
      }
      if (line.includes("##")) {
        const [domain, selector] = line.split("##", 2);
        if (selector) out.cosmetic.push({ domain: normalizeHostname(domain), selector });
        continue;
      }
      const allow = line.startsWith("@@");
      if (allow) line = line.slice(2);
      const domainMatch = line.match(/^\|\|([^/^*|]+)\^?$/);
      if (domainMatch) {
        const domain = normalizeHostname(domainMatch[1]);
        const key = `${allow ? "a" : "b"}:${domain}`;
        if (!seen.has(key)) {
          seen.add(key);
          (allow ? out.allowDomains : out.blockDomains).push(domain);
        }
        continue;
      }
      if (line.startsWith("/") && line.lastIndexOf("/") > 0) {
        const end = line.lastIndexOf("/");
        const pattern = line.slice(1, end);
        try { new RegExp(pattern, "i"); out.urlPatterns.push({ allow, kind: "regex", value: pattern }); } catch { /* invalid user regex */ }
        continue;
      }
      const optionsIndex = line.indexOf("$");
      if (optionsIndex !== -1) line = line.slice(0, optionsIndex);
      if (line.length >= 4) out.urlPatterns.push({ allow, kind: "wildcard", value: line });
    }
    return out;
  }

  function wildcardToRegExp(pattern) {
    const escaped = pattern.replace(/[.+?${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\^/g, "(?:[^a-zA-Z0-9_.%-]|$)").replace(/^\|/, "^").replace(/\|$/, "$");
    return new RegExp(escaped, "i");
  }

  function patternMatches(url, item) {
    try {
      return item.kind === "regex" ? new RegExp(item.value, "i").test(url) : wildcardToRegExp(item.value).test(url);
    } catch { return false; }
  }

  function mergeParsedRules(...sources) {
    const merged = { blockDomains: [], allowDomains: [], urlPatterns: [], cosmetic: [], cosmeticExceptions: [] };
    for (const source of sources.filter(Boolean)) {
      for (const key of Object.keys(merged)) merged[key].push(...(source[key] || []));
    }
    return merged;
  }

  function resolveSettings(settings, hostname) {
    const merged = { ...DEFAULT_SETTINGS, ...(settings || {}) };
    const overrides = merged.siteOverrides || {};
    const host = normalizeHostname(hostname);
    const site = overrides[host] || {};
    return { ...merged, ...site, siteOverrides: overrides };
  }

  function cosmeticSelectorsFor(hostname, parsedRules, includeBuiltin = true) {
    const host = normalizeHostname(hostname);
    const selectors = new Set(includeBuiltin ? BUILTIN_COSMETIC_SELECTORS : []);
    for (const rule of parsedRules?.cosmetic || []) {
      if (!rule.domain || hostnameMatches(host, rule.domain)) selectors.add(rule.selector);
    }
    for (const rule of parsedRules?.cosmeticExceptions || []) {
      if (!rule.domain || hostnameMatches(host, rule.domain)) selectors.delete(rule.selector);
    }
    return Array.from(selectors).filter(Boolean).slice(0, 2000);
  }

  globalThis.PrivacyShieldCore = Object.freeze({
    DEFAULT_SETTINGS,
    LOCAL_RESOURCE_CATALOG,
    TRACKING_PARAMS,
    cleanUrl,
    unwrapRedirect,
    normalizeHostname,
    hostnameMatches,
    baseDomain,
    sameSite,
    parseFilterText,
    patternMatches,
    mergeParsedRules,
    resolveSettings,
    cosmeticSelectorsFor
  });
})();
