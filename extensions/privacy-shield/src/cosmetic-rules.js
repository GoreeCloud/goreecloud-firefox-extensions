(() => {
  "use strict";

  function normalizeHostname(hostname) {
    return String(hostname || "").trim().toLowerCase().replace(/^www\./, "").replace(/\.$/, "");
  }

  function list(text) {
    const rules = [];
    const lines = String(text || "").split(/\r?\n/);
    lines.forEach((rawLine, lineIndex) => {
      const line = rawLine.trim();
      if (!line || line.startsWith("!") || line.includes("#@#")) return;
      const marker = line.indexOf("##");
      if (marker < 0) return;
      const domainText = line.slice(0, marker).trim();
      const selector = line.slice(marker + 2).trim();
      if (!selector) return;
      rules.push({
        lineIndex,
        raw: line,
        domain: normalizeHostname(domainText),
        domainText,
        selector
      });
    });
    return rules;
  }

  function removeAt(text, lineIndex, expectedRaw = "") {
    const lines = String(text || "").split(/\r?\n/);
    if (!Number.isInteger(lineIndex) || lineIndex < 0 || lineIndex >= lines.length) {
      return { text: String(text || ""), removed: false, item: null };
    }
    const item = list(lines[lineIndex])[0] || null;
    if (!item || (expectedRaw && lines[lineIndex].trim() !== String(expectedRaw).trim())) {
      return { text: String(text || ""), removed: false, item: null };
    }
    lines.splice(lineIndex, 1);
    return { text: lines.join("\n"), removed: true, item };
  }

  function undoLast(text, hostname) {
    const host = normalizeHostname(hostname);
    const rules = list(text);
    for (let i = rules.length - 1; i >= 0; i -= 1) {
      if (rules[i].domain !== host) continue;
      return removeAt(text, rules[i].lineIndex, rules[i].raw);
    }
    return { text: String(text || ""), removed: false, item: null };
  }

  globalThis.PrivacyShieldCosmeticRules = Object.freeze({
    normalizeHostname,
    list,
    removeAt,
    undoLast
  });
})();
