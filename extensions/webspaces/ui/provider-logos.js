export const PROVIDER_LOGOS = Object.freeze({
  standard: Object.freeze({ src: new URL("../icons/providers/standard.svg", import.meta.url).href, monochrome: false }),
  goreecloud: Object.freeze({ src: new URL("../icons/providers/goreecloud.svg", import.meta.url).href, monochrome: false }),
  google: Object.freeze({ src: new URL("../icons/providers/google.svg", import.meta.url).href, monochrome: true }),
  microsoft: Object.freeze({ src: new URL("../icons/providers/microsoft.svg", import.meta.url).href, monochrome: true }),
  meta: Object.freeze({ src: new URL("../icons/providers/meta.svg", import.meta.url).href, monochrome: true }),
  proton: Object.freeze({ src: new URL("../icons/providers/proton.svg", import.meta.url).href, monochrome: true })
});

const PROVIDER_ID_BY_NAME = Object.freeze({
  Standard: "standard",
  GoreeCloud: "goreecloud",
  Google: "google",
  Microsoft: "microsoft",
  Meta: "meta",
  Proton: "proton"
});

export function providerLogoFor(webspaceOrId) {
  const id = typeof webspaceOrId === "string" ? webspaceOrId : webspaceOrId?.id;
  return id ? PROVIDER_LOGOS[id] ?? null : null;
}

export function providerIdFromName(name) {
  return PROVIDER_ID_BY_NAME[String(name ?? "").trim()] ?? null;
}

function decorateEmblem(emblem, providerId) {
  const logo = providerLogoFor(providerId);
  if (!emblem || !logo) return;
  if (emblem.dataset.providerLogo === providerId && emblem.querySelector("img.provider-logo")) return;

  const image = document.createElement("img");
  image.className = "provider-logo";
  image.src = logo.src;
  image.alt = "";
  image.width = 24;
  image.height = 24;
  image.decoding = "async";
  if (logo.monochrome) image.dataset.monochrome = "true";

  emblem.replaceChildren(image);
  emblem.dataset.providerLogo = providerId;
}

export function refreshProviderLogos(root = document) {
  for (const emblem of root.querySelectorAll(".card[data-webspace-id] .space-emblem")) {
    const providerId = emblem.closest(".card[data-webspace-id]")?.dataset.webspaceId;
    if (providerId) decorateEmblem(emblem, providerId);
  }

  for (const launcher of root.querySelectorAll(".webspace")) {
    const name = launcher.querySelector(".space-name")?.textContent;
    const providerId = providerIdFromName(name);
    if (providerId) decorateEmblem(launcher.querySelector(".space-emblem"), providerId);
  }

  const currentName = root.querySelector("#current-webspace")?.textContent;
  const currentProviderId = providerIdFromName(currentName);
  if (currentProviderId) decorateEmblem(root.querySelector("#current-emblem"), currentProviderId);
}

function startProviderLogoObserver() {
  let queued = false;
  const scheduleRefresh = () => {
    if (queued) return;
    queued = true;
    queueMicrotask(() => {
      queued = false;
      refreshProviderLogos();
    });
  };

  refreshProviderLogos();
  const observer = new MutationObserver(scheduleRefresh);
  observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
}

if (typeof document !== "undefined" && typeof MutationObserver !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startProviderLogoObserver, { once: true });
  } else {
    startProviderLogoObserver();
  }
}
