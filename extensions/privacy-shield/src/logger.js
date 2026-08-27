(() => {
  "use strict";
  const tbody = document.querySelector("#rows");
  const filter = document.querySelector("#filter");
  let entries = [];

  function escapeText(value) { return String(value ?? ""); }
  function render() {
    const query = filter.value.trim().toLowerCase();
    tbody.replaceChildren();
    for (const entry of entries.slice().reverse()) {
      const haystack = `${entry.verdict} ${entry.reason} ${entry.type} ${entry.url}`.toLowerCase();
      if (query && !haystack.includes(query)) continue;
      const tr = document.createElement("tr");
      for (const value of [new Date(entry.time).toLocaleTimeString(), entry.verdict, entry.type, entry.reason, entry.url]) {
        const td = document.createElement("td"); td.textContent = escapeText(value); tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
  }

  async function load() { entries = await browser.runtime.sendMessage({ type: "logger:get", limit: 1000 }) || []; render(); }
  browser.runtime.onMessage.addListener((message) => {
    if (message?.type === "logger:event") { entries.push(message.entry); if (entries.length > 1000) entries.shift(); render(); }
  });
  filter.addEventListener("input", render);
  document.querySelector("#clear").addEventListener("click", async () => { await browser.runtime.sendMessage({ type: "logger:clear" }); entries = []; render(); });
  load();
})();
