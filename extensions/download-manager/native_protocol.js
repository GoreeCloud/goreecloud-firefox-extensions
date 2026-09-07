(function () {
  const REQUIRED_PROTOCOL_VERSION = 2;
  const MINIMUM_HELPER_VERSION = "0.2.8";

  function normalizeProtocolVersion(value) {
    const numeric = Number(value);
    return Number.isInteger(numeric) && numeric >= 0 ? numeric : null;
  }

  function validateNativeHello(message) {
    if (!message || message.type !== "hello") {
      return {
        compatible: false,
        helperVersion: null,
        protocolVersion: null,
        requiredProtocolVersion: REQUIRED_PROTOCOL_VERSION,
        error: "Native helper sent an invalid handshake. Reinstall the GoreeCloud native helper."
      };
    }

    const helperVersion = String(message.version || "unknown");
    const protocolVersion = normalizeProtocolVersion(message.protocolVersion);
    if (protocolVersion !== REQUIRED_PROTOCOL_VERSION) {
      const installed = protocolVersion == null ? "legacy/unknown" : String(protocolVersion);
      return {
        compatible: false,
        helperVersion,
        protocolVersion,
        requiredProtocolVersion: REQUIRED_PROTOCOL_VERSION,
        error: `Native helper ${helperVersion} is incompatible (protocol ${installed}; required ${REQUIRED_PROTOCOL_VERSION}). Reinstall the GoreeCloud Download Manager native helper from the current ${MINIMUM_HELPER_VERSION}+ source.`
      };
    }

    return {
      compatible: true,
      helperVersion,
      protocolVersion,
      requiredProtocolVersion: REQUIRED_PROTOCOL_VERSION,
      error: null
    };
  }

  const api = {
    REQUIRED_PROTOCOL_VERSION,
    MINIMUM_HELPER_VERSION,
    normalizeProtocolVersion,
    validateNativeHello
  };

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  if (typeof globalThis === "object") {
    globalThis.GoreeCloudNativeProtocol = api;
  }

  if (
    typeof onNativeMessage === "function" &&
    typeof nativeReady !== "undefined" &&
    typeof nativeReadyReject !== "undefined"
  ) {
    const originalOnNativeMessage = onNativeMessage;
    onNativeMessage = async function protocolAwareNativeMessage(message) {
      if (message?.type === "hello") {
        const result = validateNativeHello(message);
        if (!result.compatible) {
          nativeReady = false;
          if (nativeReadyReject) nativeReadyReject(new Error(result.error));
          return;
        }
      }
      return originalOnNativeMessage(message);
    };
  }
})();
