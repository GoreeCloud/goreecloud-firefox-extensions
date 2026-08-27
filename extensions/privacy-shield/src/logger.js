(() => {
  "use strict";

  const tbody = document.querySelector("#rows");
  const filter = document.querySelector("#filter");
  const domainFilter = document.querySelector("#domainFilter");
  const typeFilter = document.querySelector("#typeFilter");
  const verdictFilter = document.querySelector("#verdictFilter");
  const revealed = new Map();
  let entries = [];

  function displayReason(reason) {
    const labels = {
      "hyperlink-auditing-ping": "hyperlink auditing ping",
      "telemetry-beacon": "telemetry beacon",
      "tracking-parameter-cleanup": "tracking parameter cleanup",
      "local-resource-substitution": "local resource substitution",
      "ad-domain": "ad domain",
      "tracker-domain": "tracker domain",
      "cryptocurrency-miner-domain": "cryptocurrency miner",
      "malicious-domain": "malicious domain",
      "third-party-script": "third-party script",
      "third-party-frame": "third-party frame",
      "media-request": "media/object request",
      "custom-domain-rule": "custom domain rule",
      "custom-url-rule": "custom URL rule",
      "no-rule-match": "no rule match"
    };
    return labels[reason] || String(reason || "").replace(/-/g, " ");
  }

  function optionValues(key) {
    return Array.from(new Set(entries.map((entry) => String(entry[key] || "")).filter(Boolean))).sort((a, b) => a.localeCompare(b));
  }

  function syncSelect(select, values, allLabel) {
    const current = select.value;
    select.replaceChildren();
    const all = document.createElement("option");
    all.value = "";
    all.textContent = allLabel;
    select.appendChild(all);
    for (const value of values) {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = value;
      select.appendChild(option);
    }
    if (values.includes(current)) select.value = current;
  }

  function matchesFilters(entry) {
    if (domainFilter.value && entry.hostname !== domainFilter.value) return false;
    if (typeFilter.value && entry.type !== typeFilter.value) return false;
    if (verdictFilter.value && entry.verdict !== verdictFilter.value) return false;
    const query = filter.value.trim().toLowerCase();
    if (!query) return true;
    const haystack = `${entry.verdict} ${entry.reason} ${displayReason(entry.reason)} ${entry.type} ${entry.hostname} ${entry.url} ${entry.finalUrl || ""}`.toLowerCase();
    return haystack.includes(query);
  }

  function updateSummary(visible) {
    document.querySelector("#visibleCount").textContent = visible.length;
    document.querySelector("#blockedCount").textContent = visible.filter((entry) => entry.verdict === "blocked").length;
    document.querySelector("#redirectedCount").textContent = visible.filter((entry) => entry.verdict === "redirected").length;
    document.querySelector("#domainCount").textContent = new Set(visible.map((entry) => entry.hostname).filter(Boolean)).size;
  }

  function urlBlock(entry) {
    const wrapper = document.createElement("div");
    wrapper.className = "logger-url-block";
    const raw = revealed.get(entry.id);
    const shownUrl = raw?.url || entry.url;

    const request = document.createElement("code");
    request.className = raw ? "logger-url logger-url-revealed" : "logger-url";
    request.textContent = shownUrl || "";
    request.title = shownUrl || "";
    wrapper.appendChild(request);

    const finalShown = raw?.finalUrl || entry.finalUrl;
    if (finalShown) {
      const final = document.createElement("code");
      final.className = raw ? "logger-final-url logger-url-revealed" : "logger-final-url";
      final.textContent = `→ ${finalShown}`;
      final.title = finalShown;
      wrapper.appendChild(final);
    }

    if (entry.redacted && !raw) {
      const note = document.createElement("span");
      note.className = "redaction-label";
      note.textContent = "sensitive values redacted";
      wrapper.appendChild(note);
    }
    return wrapper;
  }

  async function toggleReveal(entry) {
    if (revealed.has(entry.id)) {
      revealed.delete(entry.id);
      render();
      return;
    }
    const raw = await browser.runtime.sendMessage({ type: "logger:reveal", id: entry.id });
    if (raw) revealed.set(entry.id, raw);
    render();
  }

  async function copySafe(entry, button) {
    try {
      await navigator.clipboard.writeText(entry.url || "");
      const previous = button.textContent;
      button.textContent = "Copied";
      setTimeout(() => { button.textContent = previous; }, 900);
    } catch {
      button.textContent = "Copy failed";
    }
  }

  function actionCell(entry) {
    const cell = document.createElement("td");
    cell.className = "logger-actions";

    const copy = document.createElement("button");
    copy.textContent = "Copy safe URL";
    copy.addEventListener("click", () => copySafe(entry, copy));
    cell.appendChild(copy);

    if (entry.redacted) {
      const reveal = document.createElement("button");
      reveal.className = "secondary-danger";
      reveal.textContent = revealed.has(entry.id) ? "Hide full URL" : "Reveal full URL";
      reveal.addEventListener("click", () => toggleReveal(entry));
      cell.appendChild(reveal);
    }
    return cell;
  }

  function render() {
    syncSelect(domainFilter, optionValues("hostname"), "All domains");
    syncSelect(typeFilter, optionValues("type"), "All types");
    syncSelect(verdictFilter, optionValues("verdict"), "All verdicts");

    const visible = entries.filter(matchesFilters).slice().reverse();
    updateSummary(visible);
    tbody.replaceChildren();

    for (const entry of visible) {
      const tr = document.createElement("tr");
      const values = [
        new Date(entry.time).toLocaleTimeString(),
        entry.verdict,
        entry.type,
        entry.hostname || "—",
        displayReason(entry.reason)
      ];
      values.forEach((value, index) => {
        const td = document.createElement("td");
        td.textContent = String(value ?? "");
        if (index === 1) td.className = `verdict verdict-${entry.verdict}`;
        tr.appendChild(td);
      });
      const urlCell = document.createElement("td");
      urlCell.appendChild(urlBlock(entry));
      tr.appendChild(urlCell, actionCell(entry));
      tbody.appendChild(tr);
    }
  }

  async function load() {
    entries = await browser.runtime.sendMessage({ type: "logger:get", limit: 1000 }) || [];
    render();
  }

  browser.runtime.onMessage.addListener((message) => {
    if (message?.type === "logger:event") {
      entries.push(message.entry);
      if (entries.length > 1000) entries.shift();
      render();
    }
  });

  [filter, domainFilter, typeFilter, verdictFilter].forEach((control) => control.addEventListener(control === filter ? "input" : "change", render));
  document.querySelector("#clear").addEventListener("click", async () => {
    await browser.runtime.sendMessage({ type: "logger:clear" });
    entries = [];
    revealed.clear();
    render();
  });

  load();
})();
