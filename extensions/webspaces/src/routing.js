import { PROVIDER_RULES } from "./provider-rules.js";
import { RULE_PRIORITY } from "./constants.js";

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

export function evaluateRouting(rawUrl, config) {
  const hostname = hostnameFromUrl(rawUrl);
  if (!hostname) {
    return { action: "normal", reason: "unsupported-or-invalid-url", matchedRule: null, webspaceId: null };
  }

  if (config.routingEnabled === false) {
    return { action: "normal", reason: "routing-paused", matchedRule: null, webspaceId: null };
  }

  const exception = chooseBest(exceptionCandidates(hostname, config));
  if (exception) {
    if (!exception.rule.webspaceId) {
      return { action: "normal", reason: exception.reason, matchedRule: exception.rule, webspaceId: null };
    }
    return { action: "webspace", reason: exception.reason, matchedRule: exception.rule, webspaceId: exception.rule.webspaceId };
  }

  const selected = chooseBest([
    ...userRuleCandidates(hostname, config),
    ...providerCandidates(hostname)
  ]);

  if (selected) {
    return {
      action: "webspace",
      reason: selected.reason,
      matchedRule: selected.rule,
      webspaceId: selected.rule.webspaceId
    };
  }

  if (config.defaultBehavior === "webspace" && config.defaultWebspaceId) {
    return {
      action: "webspace",
      reason: "default-webspace",
      matchedRule: null,
      webspaceId: config.defaultWebspaceId
    };
  }

  return { action: "normal", reason: "no-matching-rule", matchedRule: null, webspaceId: null };
}
