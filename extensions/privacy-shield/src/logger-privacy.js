(() => {
  "use strict";

  const EXACT_SENSITIVE_NAMES = new Set([
    "auth", "authorization", "apikey", "api-key", "api_key", "key", "token",
    "access_token", "refresh_token", "id_token", "password", "passwd", "secret",
    "signature", "sig", "session", "sessionid", "session_id", "sid", "cookie",
    "csrf", "csrf_token", "xsrf", "xsrf_token", "credential", "credentials",
    "sapisidhash", "jwt"
  ]);

  const STRICT_IDENTIFIER_NAMES = new Set([
    "ei", "opi", "ved", "zx", "sxsrf", "cid", "uid", "guid", "uuid",
    "device_id", "deviceid", "visitor_id", "visitorid", "measurement_id",
    "event_id", "eventid", "request_id", "requestid", "trace_id", "traceid"
  ]);

  function decodePart(value) {
    const normalized = String(value || "").replace(/\+/g, " ");
    try { return decodeURIComponent(normalized); } catch { return normalized; }
  }

  function sensitiveName(name) {
    const lower = String(name || "").trim().toLowerCase();
    if (EXACT_SENSITIVE_NAMES.has(lower)) return true;
    return /(?:^|[_-])(?:auth|authorization|bearer|credential|password|passwd|secret|session|cookie|csrf|xsrf|jwt|signature|sig|token)(?:$|[_-])/i.test(lower)
      || /(?:^|[_-])api[_-]?key(?:$|[_-])/i.test(lower);
  }

  function strictIdentifierName(name) {
    const lower = String(name || "").trim().toLowerCase();
    if (STRICT_IDENTIFIER_NAMES.has(lower)) return true;
    return /(?:^|[_-])(?:client|device|visitor|measurement|event|request|trace|tracking)[_-]?id(?:$|[_-])/i.test(lower);
  }

  function sensitiveValue(value) {
    const decoded = decodePart(value).trim();
    if (!decoded) return false;
    if (/^(?:SAPISIDHASH|Bearer|Basic)\b/i.test(decoded)) return true;
    if (/^[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}$/.test(decoded)) return true;
    return decoded.length >= 48 && /[A-Za-z]/.test(decoded) && /\d/.test(decoded);
  }

  function redactQuery(search, options = {}) {
    const raw = String(search || "").replace(/^\?/, "");
    if (!raw) return { query: "", redacted: false, privateMasked: false };
    let redacted = false;
    let privateMasked = false;
    const strict = options.strict === true;
    const parts = raw.split("&").map((part) => {
      if (!part) return part;
      const index = part.indexOf("=");
      const rawName = index === -1 ? part : part.slice(0, index);
      const rawValue = index === -1 ? "" : part.slice(index + 1);
      const name = decodePart(rawName);
      if (sensitiveName(name) || sensitiveValue(rawValue)) {
        redacted = true;
        return `${rawName}=[redacted]`;
      }
      if (strict && strictIdentifierName(name) && rawValue && rawValue !== "[redacted]") {
        privateMasked = true;
        return `${rawName}=[private]`;
      }
      return part;
    });
    return { query: parts.join("&"), redacted, privateMasked };
  }

  function sanitizeUrl(input, options = {}) {
    const source = String(input || "");
    if (!source) return { url: "", hostname: "", redacted: false, privateMasked: false };
    let parsed;
    try { parsed = new URL(source); } catch {
      return { url: source.length > 240 ? `${source.slice(0, 237)}...` : source, hostname: "", redacted: source.length > 240, privateMasked: false };
    }

    const query = redactQuery(parsed.search, options);
    const hadCredentials = Boolean(parsed.username || parsed.password);
    const host = parsed.host;
    const pathname = parsed.pathname || "/";
    const authority = parsed.protocol === "file:" ? "" : `//${host}`;
    const safe = `${parsed.protocol}${authority}${pathname}${query.query ? `?${query.query}` : ""}`;
    return {
      url: safe,
      hostname: parsed.hostname || "",
      redacted: query.redacted || hadCredentials || Boolean(parsed.hash),
      privateMasked: query.privateMasked
    };
  }

  function privacyViewUrl(input) {
    return sanitizeUrl(input, { strict: true });
  }

  function publicEntry(entry) {
    const request = sanitizeUrl(entry?.url);
    const final = sanitizeUrl(entry?.finalUrl);
    return {
      id: entry?.id,
      time: entry?.time,
      tabId: entry?.tabId,
      type: entry?.type,
      method: entry?.method,
      verdict: entry?.verdict,
      reason: entry?.reason,
      hostname: request.hostname,
      url: request.url,
      finalUrl: final.url || null,
      redacted: request.redacted || final.redacted
    };
  }

  globalThis.PrivacyShieldLoggerPrivacy = Object.freeze({
    sensitiveName,
    strictIdentifierName,
    sensitiveValue,
    sanitizeUrl,
    privacyViewUrl,
    publicEntry
  });
})();
