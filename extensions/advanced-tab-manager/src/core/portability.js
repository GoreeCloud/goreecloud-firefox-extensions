export const PORTABILITY_FORMAT = "goreecloud.advancedTabManager.backup";
export const PORTABILITY_SCHEMA_VERSION = 1;
export const PORTABILITY_GECKO_ID = "advanced-tab-manager@goreecloud.com";
export const PORTABILITY_MAX_BYTES = 16 * 1024 * 1024;

export class PortabilityError extends Error {
  constructor(code, message = code) {
    super(message);
    this.name = "PortabilityError";
    this.code = code;
  }
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isTimestamp(value) {
  return Number.isInteger(value) && value >= 0;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function requireExactKeys(value, expected, path) {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    throw new PortabilityError("invalid-backup-envelope", `${path} has unexpected fields`);
  }
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!isObject(value)) return value;
  const result = {};
  for (const key of Object.keys(value).sort()) result[key] = canonicalize(value[key]);
  return result;
}

export function canonicalJson(value) {
  return JSON.stringify(canonicalize(value));
}

export async function sha256Hex(text, cryptoImpl = globalThis.crypto) {
  if (!cryptoImpl?.subtle) throw new PortabilityError("hash-unavailable");
  const bytes = new TextEncoder().encode(text);
  const digest = await cryptoImpl.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function validateStoreObject(value, path) {
  if (!isObject(value)) throw new PortabilityError("invalid-backup-envelope", `${path} must be an object`);
}

function createPayload({ extensionVersion, exportedAt, organizationalState, snoozeState, ruleState }) {
  if (!isNonEmptyString(extensionVersion)) throw new PortabilityError("invalid-extension-version");
  if (!isTimestamp(exportedAt)) throw new PortabilityError("invalid-export-timestamp");
  validateStoreObject(organizationalState, "stores.organizational");
  validateStoreObject(snoozeState, "stores.snooze");
  validateStoreObject(ruleState, "stores.rules");
  return {
    format: PORTABILITY_FORMAT,
    schemaVersion: PORTABILITY_SCHEMA_VERSION,
    exportedAt,
    source: {
      product: "GoreeCloud Advanced Tab Manager",
      extensionVersion: extensionVersion.trim(),
      geckoId: PORTABILITY_GECKO_ID
    },
    stores: {
      organizational: clone(organizationalState),
      snooze: clone(snoozeState),
      rules: clone(ruleState)
    }
  };
}

function enforceBundleSize(value) {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  if (bytes.length > PORTABILITY_MAX_BYTES) throw new PortabilityError("backup-too-large");
}

export async function createBackupBundle(input, { digestHex = sha256Hex } = {}) {
  const payload = createPayload(input);
  enforceBundleSize(payload);
  const digest = await digestHex(canonicalJson(payload));
  if (!/^[a-f0-9]{64}$/i.test(digest)) throw new PortabilityError("invalid-integrity-digest");
  return {
    ...payload,
    integrity: {
      algorithm: "SHA-256",
      digest: digest.toLowerCase()
    }
  };
}

export async function verifyBackupBundle(bundle, { digestHex = sha256Hex } = {}) {
  if (!isObject(bundle)) throw new PortabilityError("invalid-backup-envelope");
  enforceBundleSize(bundle);
  requireExactKeys(bundle, ["format", "schemaVersion", "exportedAt", "source", "stores", "integrity"], "backup");
  if (bundle.format !== PORTABILITY_FORMAT) throw new PortabilityError("unsupported-backup-format");
  if (bundle.schemaVersion !== PORTABILITY_SCHEMA_VERSION) throw new PortabilityError("unsupported-backup-schema");
  if (!isTimestamp(bundle.exportedAt)) throw new PortabilityError("invalid-export-timestamp");

  if (!isObject(bundle.source)) throw new PortabilityError("invalid-backup-envelope", "source must be an object");
  requireExactKeys(bundle.source, ["product", "extensionVersion", "geckoId"], "source");
  if (bundle.source.product !== "GoreeCloud Advanced Tab Manager") throw new PortabilityError("wrong-product");
  if (!isNonEmptyString(bundle.source.extensionVersion)) throw new PortabilityError("invalid-extension-version");
  if (bundle.source.geckoId !== PORTABILITY_GECKO_ID) throw new PortabilityError("wrong-extension-identity");

  if (!isObject(bundle.stores)) throw new PortabilityError("invalid-backup-envelope", "stores must be an object");
  requireExactKeys(bundle.stores, ["organizational", "snooze", "rules"], "stores");
  validateStoreObject(bundle.stores.organizational, "stores.organizational");
  validateStoreObject(bundle.stores.snooze, "stores.snooze");
  validateStoreObject(bundle.stores.rules, "stores.rules");

  if (!isObject(bundle.integrity)) throw new PortabilityError("invalid-backup-envelope", "integrity must be an object");
  requireExactKeys(bundle.integrity, ["algorithm", "digest"], "integrity");
  if (bundle.integrity.algorithm !== "SHA-256" || !/^[a-f0-9]{64}$/i.test(bundle.integrity.digest)) {
    throw new PortabilityError("invalid-integrity-digest");
  }

  const payload = {
    format: bundle.format,
    schemaVersion: bundle.schemaVersion,
    exportedAt: bundle.exportedAt,
    source: clone(bundle.source),
    stores: clone(bundle.stores)
  };
  const expected = (await digestHex(canonicalJson(payload))).toLowerCase();
  if (expected !== bundle.integrity.digest.toLowerCase()) throw new PortabilityError("backup-integrity-mismatch");
  return payload;
}

function idSet(items) {
  return new Set((Array.isArray(items) ? items : []).map((item) => item?.id).filter(isNonEmptyString));
}

function intersectionCount(left, right) {
  const rightIds = idSet(right);
  let count = 0;
  for (const id of idSet(left)) if (rightIds.has(id)) count += 1;
  return count;
}

function revision(state) {
  return Number.isInteger(state?.revision) && state.revision >= 0 ? state.revision : null;
}

export function buildImportPreview({ current, imported }) {
  for (const [name, value] of Object.entries({ ...current, ...imported })) {
    if (!isObject(value)) throw new PortabilityError("invalid-import-state", `${name} must be an object`);
  }
  return {
    willReplace: true,
    opensTabs: false,
    expectedRevisions: {
      organizational: revision(current.organizational),
      snooze: revision(current.snooze),
      rules: revision(current.rules)
    },
    importedCounts: {
      tabSets: Array.isArray(imported.organizational.tabSets) ? imported.organizational.tabSets.length : 0,
      stashed: Array.isArray(imported.organizational.stashedItems) ? imported.organizational.stashedItems.length : 0,
      sessionSnapshots: Array.isArray(imported.organizational.sessionSnapshots) ? imported.organizational.sessionSnapshots.length : 0,
      snoozed: Array.isArray(imported.snooze.items) ? imported.snooze.items.length : 0,
      rules: Array.isArray(imported.rules.rules) ? imported.rules.rules.length : 0
    },
    conflictCounts: {
      tabSets: intersectionCount(current.organizational.tabSets, imported.organizational.tabSets),
      stashed: intersectionCount(current.organizational.stashedItems, imported.organizational.stashedItems),
      sessionSnapshots: intersectionCount(current.organizational.sessionSnapshots, imported.organizational.sessionSnapshots),
      snoozed: intersectionCount(current.snooze.items, imported.snooze.items),
      rules: intersectionCount(current.rules.rules, imported.rules.rules)
    }
  };
}
