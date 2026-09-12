import { PROVIDER_RULES } from "./provider-rules.js";
import { RULE_PRIORITY } from "./constants.js";
import { getRoutingPause, pauseAppliesToHostname } from "./routing-controls.js";

export function normalizeHostname(hostname) {
  return hostname.trim().replace(/^\.+|\.+$/g, "").toLowerCase();
}

export function hostnameFromUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return normalizeHostname(url.hostname);
  } catch {
    return null;
  }
}

export function domainMatches(hostname, domain) {
  const host = normalizeHostname(hostname);
  const base = normalizeHostname(domain);
  return host === base || host.endsWith(`.${base}`);
}

function candidate(rule, priority, reason) {
  return { rule, priority, reason };
}

function chooseBest(candidates) {
  if (candidates.length === 0) return null;
  return candidates
    .map((value, index) => ({ ...value, index }))
    .sort((a, b) => b.priority - a.priority || a.index - b.index)[0];
}

function userRuleCandidates(hostname, config) {
  const candidates = [];
  for (const rule of config.userRules ?? []) {
    if (rule.enabled === false) continue;
    const value = normalizeHostname(rule.value ?? "");
    if (!value) continue;

    if (rule.kind === "exact" && hostname === value) {
      candidates.push(candidate(rule, RULE_PRIORITY.EXACT_HOSTNAME, "exact-hostname-rule"));
    } else if (rule.kind === "domain" && domainMatches(hostname, value)) {
      const exact = hostname === value;
      candidates.push(candidate(
        rule,
        exact ? RULE_PRIORITY.USER_ASSIGNMENT : RULE_PRIORITY.SUBDOMAIN,
        exact ? "user-site-assignment" : "user-subdomain-rule"
      ));
    }
  }
  return candidates;
}

function exceptionCandidates(hostname, config) {
  return (config.exceptions ?? [])
    .filter((rule) => rule.enabled !== false)
    .filter((rule) => {
      const value = normalizeHostname(rule.value ?? "");
      if (!value) return false;
      return rule.kind === "exact" ? hostname === value : domainMatches(hostname, value);
    })
    .map((rule) => candidate(rule, RULE_PRIORITY.USER_EXCEPTION, "user-exception"));
}

function providerCandidates(hostname) {
  return PROVIDER_RULES
    .filter((rule) => domainMatches(hostname, rule.value))
    .map((rule) => candidate(
      rule,
      rule.source === "builtin-goreecloud" ? RULE_PRIORITY.GOREECLOUD_BUILTIN : RULE_PRIORITY.PROVIDER,
      rule.source === "builtin-goreecloud" ? "goreecloud-built-in-rule" : "provider-rule"
    ));
}

function serializeCandidate(candidateValue, selected = false) {
  return {
    id: candidateValue.rule?.id ?? null,
    kind: candidateValue.rule?.kind ?? null,
    value: candidateValue.rule?.value ?? null,
    webspaceId: candidateValue.rule?.webspaceId ?? null,
    source: candidateValue.rule?.source ?? "user",
    priority: candidateValue.priority,
    reason: candidateValue.reason,
    selected
  };
}

function pauseDecision(pause) {
  let reason = "routing-paused";
  if (pause?.mode === "timed") reason = "routing-paused-timed";
  if (pause?.mode === "site") reason = "routing-paused-site";
  if (pause?.mode === "restart") reason = "routing-paused-restart";
  return {
    action: "normal",
    reason,
    matchedRule: null,
    webspaceId: null,
    priority: null,
    pause
  };
}

export function analyzeRouting(rawUrl, config, now = Date.now()) {
  const hostname = hostnameFromUrl(rawUrl);
  if (!hostname) {
    const decision = { action: "normal", reason: "unsupported-or-invalid-url", matchedRule: null, webspaceId: null, priority: null };
    return { hostname: null, decision, candidates: [] };
  }

  const pause = getRoutingPause(config, now);
  if (pauseAppliesToHostname(pause, hostname)) {
    return { hostname, decision: pauseDecision(pause), candidates: [] };
  }

  const exceptions = exceptionCandidates(hostname, config);
  const ordinary = [...userRuleCandidates(hostname, config), ...providerCandidates(hostname)];
  const allCandidates = [...exceptions, ...ordinary];

  const exception = chooseBest(exceptions);
  if (exception) {
    const decision = exception.rule.webspaceId
      ? { action: "webspace", reason: exception.reason, matchedRule: exception.rule, webspaceId: exception.rule.webspaceId, priority: exception.priority }
      : { action: "normal", reason: exception.reason, matchedRule: exception.rule, webspaceId: null, priority: exception.priority };
    return {
      hostname,
      decision,
      candidates: allCandidates
        .map((entry) => serializeCandidate(entry, entry.rule.id === exception.rule.id))
        .sort((a, b) => b.priority - a.priority)
    };
  }

  const selected = chooseBest(ordinary);
  if (selected) {
    const decision = {
      action: "webspace",
      reason: selected.reason,
      matchedRule: selected.rule,
      webspaceId: selected.rule.webspaceId,
      priority: selected.priority
    };
    return {
      hostname,
      decision,
      candidates: allCandidates
        .map((entry) => serializeCandidate(entry, entry.rule.id === selected.rule.id))
        .sort((a, b) => b.priority - a.priority)
    };
  }

  const defaultTarget = config.defaultBehavior === "webspace"
    ? config.webspaces?.[config.defaultWebspaceId]
    : null;
  if (defaultTarget?.id) {
    const decision = {
      action: "webspace",
      reason: "default-webspace",
      matchedRule: null,
      webspaceId: defaultTarget.id,
      priority: RULE_PRIORITY.DEFAULT
    };
    return { hostname, decision, candidates: [] };
  }

  const decision = { action: "normal", reason: "no-matching-rule", matchedRule: null, webspaceId: null, priority: null };
  return { hostname, decision, candidates: [] };
}

export function evaluateRouting(rawUrl, config, now = Date.now()) {
  return analyzeRouting(rawUrl, config, now).decision;
}
