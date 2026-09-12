import {
  CONFIG_SCHEMA_VERSION,
  DEFAULT_CONFIG,
  STANDARD_WEBSPACE_ID
} from "./constants.js";

const STORAGE_KEY = "webspacesConfig";

function cloneDefault() {
  return structuredClone(DEFAULT_CONFIG);
}

export function migrateConfig(input) {
  if (!input) return cloneDefault();
  const version = input.schemaVersion ?? 1;
  if (version !== 1 && version !== CONFIG_SCHEMA_VERSION) {
    throw new Error(`Unsupported Webspaces configuration schema: ${version}`);
  }

  return {
    ...input,
    schemaVersion: CONFIG_SCHEMA_VERSION,
    defaultBehavior: "webspace",
    defaultWebspaceId: STANDARD_WEBSPACE_ID
  };
}

export async function loadConfig() {
  const stored = await browser.storage.local.get(STORAGE_KEY);
  const config = migrateConfig(stored[STORAGE_KEY]);
  return {
    ...cloneDefault(),
    ...config,
    schemaVersion: CONFIG_SCHEMA_VERSION,
    defaultBehavior: "webspace",
    defaultWebspaceId: STANDARD_WEBSPACE_ID,
    webspaces: { ...(config.webspaces ?? {}) },
    userRules: [...(config.userRules ?? [])],
    exceptions: [...(config.exceptions ?? [])]
  };
}

export async function saveConfig(config) {
  const normalized = migrateConfig(config);
  await browser.storage.local.set({ [STORAGE_KEY]: normalized });
}
