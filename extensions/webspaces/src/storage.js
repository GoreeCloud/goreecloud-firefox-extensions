import { CONFIG_SCHEMA_VERSION, DEFAULT_CONFIG } from "./constants.js";

const STORAGE_KEY = "webspacesConfig";

function cloneDefault() {
  return structuredClone(DEFAULT_CONFIG);
}

export async function loadConfig() {
  const stored = await browser.storage.local.get(STORAGE_KEY);
  const config = stored[STORAGE_KEY];
  if (!config) return cloneDefault();
  if (config.schemaVersion !== CONFIG_SCHEMA_VERSION) {
    throw new Error(`Unsupported Webspaces configuration schema: ${config.schemaVersion}`);
  }
  return {
    ...cloneDefault(),
    ...config,
    webspaces: { ...config.webspaces },
    userRules: [...(config.userRules ?? [])],
    exceptions: [...(config.exceptions ?? [])]
  };
}

export async function saveConfig(config) {
  await browser.storage.local.set({ [STORAGE_KEY]: config });
}
