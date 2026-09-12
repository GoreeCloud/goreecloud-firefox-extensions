import { resolveCurrentWebspace } from "../src/current-webspace.js";
import { applyAccent, glyphFor } from "./identity.js";

let resolving = false;

async function reconcileCurrentWebspace() {
  if (resolving) return;
  resolving = true;
  try {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    if (!tab) return;

    const [state, cookieStores] = await Promise.all([
      browser.runtime.sendMessage({ type: "webspaces:get-state" }),
      browser.cookies.getAllCookieStores()
    ]);

    const current = resolveCurrentWebspace(state?.config?.webspaces, tab, cookieStores);
    if (!current) return;

    const card = document.querySelector("#current-card");
    const emblem = document.querySelector("#current-emblem");
    const name = document.querySelector("#current-webspace");
    if (!card || !emblem || !name) return;

    applyAccent(card, current);
    applyAccent(emblem, current);
    if (name.textContent !== current.name) name.textContent = current.name;
    if (!emblem.querySelector("img.provider-logo")) emblem.textContent = glyphFor(current);

    const closeForget = document.querySelector("#close-forget");
    if (closeForget) {
      closeForget.hidden = current.temporary !== true;
      closeForget.dataset.webspaceId = current.temporary ? current.id : "";
    }

    const moveTarget = document.querySelector("#move-target");
    if (moveTarget?.querySelector(`option[value="${CSS.escape(current.id)}"]`)) {
      moveTarget.value = current.id;
    }
  } catch (error) {
    console.warn("GoreeCloud Webspaces could not reconcile the current Firefox identity", error);
  } finally {
    resolving = false;
  }
}

function startCurrentWebspaceReconciliation() {
  const name = document.querySelector("#current-webspace");
  if (!name) return;

  const observer = new MutationObserver(() => {
    void reconcileCurrentWebspace();
  });
  observer.observe(name, { childList: true, characterData: true, subtree: true });
  void reconcileCurrentWebspace();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startCurrentWebspaceReconciliation, { once: true });
} else {
  startCurrentWebspaceReconciliation();
}
