(function () {
  const REQUIRED_PROTOCOL_VERSION = 2;
  const MINIMUM_HELPER_VERSION = "0.2.8";
  const REQUIRED_CAPABILITIES = Object.freeze([
    "segmented-range-integrity",
    "same-job-recovery",
    "no-overwrite-publish",
    "ephemeral-request-headers"
  ]);

  function normalizeProtocolVersion(value) {
    const numeric = Number(value);
    return Number.isInteger(numeric) && numeric >= 0 ? numeric : null;
  }

  function parseVersion(value) {
    const match = /^(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/.exec(String(value || "").trim());
    return match ? match.slice(1, 4).map(Number) : null;
  }

  function isVersionAtLeast(value, minimum = MINIMUM_HELPER_VERSION) {
    const actual = parseVersion(value);
    const required = parseVersion(minimum);
    if (!actual || !required) return false;
    for (let index = 0; index < 3; index += 1) {
      if (actual[index] > required[index]) return true;
      if (actual[index] < required[index]) return false;
    }
    return true;
  }

  function normalizeCapabilities(value) {
    if (!Array.isArray(value)) return [];
    return [...new Set(value.map((item) => String(item || "").trim()).filter(Boolean))].sort();
  }

  function incompatibleResult({ helperVersion = null, protocolVersion = null, capabilities = [], missingCapabilities = [], error }) {
    return {
      compatible: false,
      helperVersion,
      protocolVersion,
      capabilities,
      requiredProtocolVersion: REQUIRED_PROTOCOL_VERSION,
      requiredCapabilities: [...REQUIRED_CAPABILITIES],
      missingCapabilities,
      error
    };
  }

  function validateNativeHello(message) {
    if (!message || message.type !== "hello") {
      return incompatibleResult({
        error: "Native helper sent an invalid handshake. Reinstall the GoreeCloud Download Manager native helper from the current source."
      });
    }

    const helperVersion = String(message.version || "unknown");
    const protocolVersion = normalizeProtocolVersion(message.protocolVersion);
    const capabilities = normalizeCapabilities(message.capabilities);

    if (protocolVersion !== REQUIRED_PROTOCOL_VERSION) {
      const installed = protocolVersion == null ? "legacy/unknown" : String(protocolVersion);
      return incompatibleResult({
        helperVersion,
        protocolVersion,
        capabilities,
        error: `Native helper ${helperVersion} is incompatible (protocol ${installed}; required ${REQUIRED_PROTOCOL_VERSION}). Reinstall the GoreeCloud Download Manager native helper from the current ${MINIMUM_HELPER_VERSION}+ source.`
      });
    }

    if (!isVersionAtLeast(helperVersion)) {
      return incompatibleResult({
        helperVersion,
        protocolVersion,
        capabilities,
        error: `Native helper ${helperVersion} is older than the supported ${MINIMUM_HELPER_VERSION}+ helper line. Reinstall the GoreeCloud Download Manager native helper from the current source.`
      });
    }

    const missingCapabilities = REQUIRED_CAPABILITIES.filter((capability) => !capabilities.includes(capability));
    if (missingCapabilities.length) {
      return incompatibleResult({
        helperVersion,
        protocolVersion,
        capabilities,
        missingCapabilities,
        error: `Native helper ${helperVersion} protocol ${protocolVersion} is missing required capabilities: ${missingCapabilities.join(", ")}. Reinstall the GoreeCloud Download Manager native helper from the current source.`
      });
    }

    return {
      compatible: true,
      helperVersion,
      protocolVersion,
      capabilities,
      requiredProtocolVersion: REQUIRED_PROTOCOL_VERSION,
      requiredCapabilities: [...REQUIRED_CAPABILITIES],
      missingCapabilities: [],
      error: null
    };
  }

  const api = {
    REQUIRED_PROTOCOL_VERSION,
    MINIMUM_HELPER_VERSION,
    REQUIRED_CAPABILITIES,
    normalizeProtocolVersion,
    parseVersion,
    isVersionAtLeast,
    normalizeCapabilities,
    validateNativeHello
  };

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  if (typeof globalThis === "object") {
    globalThis.GoreeCloudNativeProtocol = api;
  }
})();
