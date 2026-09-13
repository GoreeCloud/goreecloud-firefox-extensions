import { STANDARD_WEBSPACE_ID } from "./constants.js";

const FIVE_MINUTES_MS = 5 * 60 * 1000;
const THIRTY_MINUTES_MS = 30 * 60 * 1000;

export const ROUTING_PAUSE_MODES = Object.freeze([
  "five-minutes",
  "thirty-minutes",
  "site",
  "restart",
  "indefinite"
]);

function clone(config) {
  return structuredClone(config);
}

export function createRoutingPause(mode, { hostname = null, now = Date.now() } = {}) {
  if (!ROUTING_PAUSE_MODES.includes(mode)) {
    throw new Error("Unsupported routing pause mode.");
  }

  if (mode === "indefinite") return null;

  if (mode === "site") {
    const value = String(hostname ?? "").trim().toLowerCase();
    if (!value) throw new Error("A current site is required for a site-only routing pause.");
    return { mode: "site", hostname: value, createdAt: new Date(now).toISOString() };
  }

  if (mode === "restart") {
    return { mode: "restart", createdAt: new Date(now).toISOString() };
  }

  const duration = mode === "five-minutes" ? FIVE_MINUTES_MS : THIRTY_MINUTES_MS;
  return {
    mode: "timed",
    durationMinutes: duration / 60000,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + duration).toISOString()
  };
}

export function getRoutingPause(config, now = Date.now()) {
  if (config?.routingEnabled === false) {
    return { mode: "indefinite", active: true };
  }

  const pause = config?.routingPause;
  if (!pause || typeof pause !== "object") return null;

  if (pause.mode === "timed") {
    const expiresAt = Date.parse(pause.expiresAt ?? "");
    if (!Number.isFinite(expiresAt) || expiresAt <= now) return null;
    return { ...pause, active: true, expiresAt };
  }

  if (pause.mode === "site" && pause.hostname) {
    return { ...pause, active: true, hostname: String(pause.hostname).toLowerCase() };
  }

  if (pause.mode === "restart") {
    return { ...pause, active: true };
  }

  return null;
}

export function pauseAppliesToHostname(pause, hostname) {
  if (!pause?.active) return false;
  if (pause.mode !== "site") return true;
  return Boolean(hostname) && String(hostname).toLowerCase() === pause.hostname;
}

export function applyRoutingPause(config, mode, options = {}) {
  const next = clone(config);
  if (mode === "indefinite") {
    next.routingEnabled = false;
    delete next.routingPause;
    return next;
  }

  next.routingEnabled = true;
  next.routingPause = createRoutingPause(mode, options);
  return next;
}

export function resumeRouting(config) {
  const next = clone(config);
  next.routingEnabled = true;
  delete next.routingPause;
  return next;
}

export function clearRestartPause(config) {
  if (config?.routingPause?.mode !== "restart") return config;
  const next = clone(config);
  delete next.routingPause;
  return next;
}

export function setDefaultBehavior(config, behavior, webspaceId = STANDARD_WEBSPACE_ID) {
  if (behavior !== "webspace" || webspaceId !== STANDARD_WEBSPACE_ID) {
    throw new Error("Standard is the fixed fallback Webspace for unassigned websites.");
  }
  const next = clone(config);
  const target = next.webspaces?.[STANDARD_WEBSPACE_ID];
  if (!target) throw new Error("The Standard Webspace is unavailable.");
  next.defaultBehavior = "webspace";
  next.defaultWebspaceId = STANDARD_WEBSPACE_ID;
  return next;
}
