(() => {
  "use strict";

  const C = globalThis.PrivacyShieldCore;
  let currentSettings = { ...C.DEFAULT_SETTINGS };
  let overlay = null;
  let mode = null;
  let hoverTarget = null;
  let cosmeticSelectors = [];
  let annoyanceSelectors = [];
  const filteredNodes = new WeakSet();
  const pendingFiltered = new Map();
  let filteredFlushTimer = null;

  async function init() {
    try { currentSettings = await browser.runtime.sendMessage({ type: "settings:get" }) || currentSettings; } catch { /* ignore */ }
    const site = C.resolveSettings(currentSettings, location.hostname);
    if (!site.enabled) return;
    if (site.blockPopups) injectPageGuard();
    cleanDocumentLinks(site);
    installClickGuard(site);
    installCopyCleaner(site);
    if (site.cosmeticFiltering) await applyCosmeticRules(site);
    installMutationObserver(site);
  }

  function injectPageGuard() {
    browser.runtime.sendMessage({ type: "pageguard:inject" }).catch(() => {});
  }

  function cleanAnchor(anchor, site) {
    if (!(anchor instanceof HTMLAnchorElement || anchor instanceof HTMLAreaElement)) return false;
    let changed = false;
    if (site.disablePing && anchor.hasAttribute("ping")) { anchor.removeAttribute("ping"); changed = true; }
    if (site.cleanLinks && anchor.href) {
      const cleaned = C.cleanUrl(anchor.href, { bypassRedirects: site.bypassRedirects });
      if (cleaned && cleaned !== anchor.href) { anchor.href = cleaned; changed = true; }
    }
    if (changed) browser.runtime.sendMessage({ type: "content:stat", stat: "cleaned", amount: 1 }).catch(() => {});
    return changed;
  }

  function cleanDocumentLinks(site, root = document) {
    if (root.querySelectorAll) root.querySelectorAll("a[href],area[href]").forEach((node) => cleanAnchor(node, site));
    if (root instanceof HTMLAnchorElement || root instanceof HTMLAreaElement) cleanAnchor(root, site);
  }

  function queueFiltered(reason, amount) {
    const value = Math.max(0, Number(amount) || 0);
    if (!value) return;
    pendingFiltered.set(reason, (pendingFiltered.get(reason) || 0) + value);
    if (filteredFlushTimer) return;
    filteredFlushTimer = setTimeout(() => {
      filteredFlushTimer = null;
      for (const [nextReason, nextAmount] of pendingFiltered) {
        browser.runtime.sendMessage({ type: "page:filtered", reason: nextReason, amount: nextAmount }).catch(() => {});
      }
      pendingFiltered.clear();
    }, 120);
  }

  function matchesIn(root, selectors) {
    const nodes = new Set();
    for (const selector of selectors || []) {
      try {
        if (root instanceof Element && root.matches(selector)) nodes.add(root);
        if (root.querySelectorAll) root.querySelectorAll(selector).forEach((node) => nodes.add(node));
      } catch { /* ignore invalid selector */ }
    }
    return nodes;
  }

  function recordFiltered(root = document) {
    let annoyances = 0;
    let cosmetic = 0;
    for (const node of matchesIn(root, annoyanceSelectors)) {
      if (filteredNodes.has(node)) continue;
      filteredNodes.add(node);
      annoyances += 1;
    }
    for (const node of matchesIn(root, cosmeticSelectors)) {
      if (filteredNodes.has(node)) continue;
      filteredNodes.add(node);
      cosmetic += 1;
    }
    if (annoyances) queueFiltered("annoyance-overlay", annoyances);
    if (cosmetic) queueFiltered("cosmetic-content", cosmetic);
  }

  function installMutationObserver(site) {
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        if (record.type === "attributes" && record.target) cleanAnchor(record.target, site);
        for (const node of record.addedNodes) {
          if (node.nodeType !== Node.ELEMENT_NODE) continue;
          cleanDocumentLinks(site, node);
          if (site.cosmeticFiltering) recordFiltered(node);
        }
      }
    });
    observer.observe(document, { subtree: true, childList: true, attributes: true, attributeFilter: ["href", "ping"] });
  }

  function installClickGuard(site) {
    const sanitize = (event) => {
      const anchor = event.target?.closest?.("a[href],area[href]");
      if (anchor) cleanAnchor(anchor, site);
    };
    document.addEventListener("pointerdown", sanitize, true);
    document.addEventListener("mousedown", sanitize, true);
    document.addEventListener("click", sanitize, true);
    document.addEventListener("auxclick", sanitize, true);
  }

  function cleanStandaloneUrl(text) {
    const trimmed = String(text || "").trim();
    if (!/^https?:\/\/\S+$/i.test(trimmed)) return null;
    return C.cleanUrl(trimmed, { bypassRedirects: true });
  }

  function installCopyCleaner(site) {
    if (!site.cleanLinks) return;
    document.addEventListener("copy", (event) => {
      let source = window.getSelection()?.toString() || "";
      let cleaned = cleanStandaloneUrl(source);
      if (!cleaned) {
        const anchor = event.target?.closest?.("a[href]");
        if (anchor) cleaned = C.cleanUrl(anchor.href, { bypassRedirects: site.bypassRedirects });
      }
      if (!cleaned || !event.clipboardData) return;
      event.clipboardData.setData("text/plain", cleaned);
      event.preventDefault();
    }, true);
  }

  function selectorsFromCatalog(catalog) {
    const selectors = [];
    for (const [domain, values] of Object.entries(catalog || {})) {
      if (C.hostnameMatches(location.hostname, domain)) selectors.push(...values);
    }
    return selectors;
  }

  async function applyCosmeticRules(site) {
    try { cosmeticSelectors = await browser.runtime.sendMessage({ type: "cosmetic:get", hostname: location.hostname }) || []; } catch { cosmeticSelectors = []; }
    annoyanceSelectors = site.blockAnnoyances ? selectorsFromCatalog(C.SITE_ANNOYANCE_SELECTORS) : [];
    cosmeticSelectors = Array.from(new Set(cosmeticSelectors.filter(Boolean))).slice(0, 2000);
    annoyanceSelectors = Array.from(new Set(annoyanceSelectors.filter(Boolean))).slice(0, 500);
    const selectors = Array.from(new Set([...cosmeticSelectors, ...annoyanceSelectors]));
    if (!selectors.length) return;
    const style = document.createElement("style");
    style.id = "goreecloud-privacy-shield-cosmetic";
    style.textContent = `${selectors.join(",\n")}{display:none!important;visibility:hidden!important;}`;
    (document.documentElement || document.head || document).appendChild(style);
    recordFiltered(document);
  }

  function selectorFor(element) {
    if (!(element instanceof Element)) return "";
    if (element.id && /^[A-Za-z][\w-]{0,80}$/.test(element.id)) return `#${CSS.escape(element.id)}`;
    const parts = [];
    let node = element;
    for (let depth = 0; node && node.nodeType === 1 && depth < 5; depth += 1, node = node.parentElement) {
      let part = node.localName;
      const classes = Array.from(node.classList || []).filter((c) => /^[A-Za-z][\w-]{0,40}$/.test(c)).slice(0, 2);
      if (classes.length) part += classes.map((c) => `.${CSS.escape(c)}`).join("");
      const parent = node.parentElement;
      if (parent) {
        const siblings = Array.from(parent.children).filter((child) => child.localName === node.localName);
        if (siblings.length > 1) part += `:nth-of-type(${siblings.indexOf(node) + 1})`;
      }
      parts.unshift(part);
      if (document.querySelectorAll(parts.join(" > ")).length === 1) break;
    }
    return parts.join(" > ");
  }

  function ensureOverlay() {
    if (overlay) return overlay;
    overlay = document.createElement("div");
    Object.assign(overlay.style, {
      position: "fixed", pointerEvents: "none", zIndex: "2147483647",
      border: "2px solid #5B8CFF", background: "rgba(91,140,255,.18)",
      borderRadius: "6px", display: "none"
    });
    document.documentElement.appendChild(overlay);
    return overlay;
  }

  function updateOverlay(target) {
    if (!(target instanceof Element) || target === overlay || target.closest?.("#goreecloud-privacy-shield-cosmetic")) return;
    hoverTarget = target;
    const rect = target.getBoundingClientRect();
    const box = ensureOverlay();
    Object.assign(box.style, { display: "block", left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px` });
  }

  function stopPicker() {
    mode = null;
    hoverTarget = null;
    if (overlay) overlay.style.display = "none";
    document.removeEventListener("mousemove", pickerMove, true);
    document.removeEventListener("click", pickerClick, true);
    document.removeEventListener("keydown", pickerKey, true);
  }

  function pickerMove(event) { if (mode) updateOverlay(event.target); }
  function pickerKey(event) { if (event.key === "Escape") { event.preventDefault(); stopPicker(); } }
  async function pickerClick(event) {
    if (!mode || !hoverTarget) return;
    event.preventDefault(); event.stopImmediatePropagation();
    const target = hoverTarget;
    const selector = selectorFor(target);
    if (mode === "zapper") {
      filteredNodes.add(target);
      target.remove();
      queueFiltered("zapper", 1);
    } else if (selector) {
      await browser.runtime.sendMessage({ type: "rule:addCosmetic", hostname: location.hostname, selector });
      filteredNodes.add(target);
      target.style.setProperty("display", "none", "important");
      queueFiltered("element-picker", 1);
    }
    stopPicker();
  }

  function startPicker(nextMode) {
    stopPicker();
    mode = nextMode;
    ensureOverlay();
    document.addEventListener("mousemove", pickerMove, true);
    document.addEventListener("click", pickerClick, true);
    document.addEventListener("keydown", pickerKey, true);
  }

  browser.runtime.onMessage.addListener((message) => {
    if (message?.type === "picker:start") { startPicker(message.mode === "zapper" ? "zapper" : "picker"); return true; }
    return undefined;
  });

  init();
})();
