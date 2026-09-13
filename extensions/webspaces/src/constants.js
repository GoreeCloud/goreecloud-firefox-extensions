export const CONFIG_SCHEMA_VERSION = 2;
export const STANDARD_WEBSPACE_ID = "standard";

export const BUILTIN_WEBSPACES = Object.freeze([
  {
    id: STANDARD_WEBSPACE_ID,
    name: "Standard",
    color: "toolbar",
    icon: "circle",
    description: "Default isolated Webspace for websites that are not assigned elsewhere."
  },
  { id: "goreecloud", name: "GoreeCloud", color: "blue", icon: "fingerprint" },
  { id: "google", name: "Google", color: "red", icon: "circle" },
  { id: "microsoft", name: "Microsoft", color: "purple", icon: "briefcase" },
  { id: "meta", name: "Meta", color: "turquoise", icon: "circle" },
  { id: "proton", name: "Proton", color: "purple", icon: "circle", description: "Built-in Proton identity for Proton Mail, Drive, Calendar, Pass, VPN, and related Proton services" }
]);

export const RULE_PRIORITY = Object.freeze({
  USER_EXCEPTION: 700,
  USER_ASSIGNMENT: 600,
  EXACT_HOSTNAME: 500,
  SUBDOMAIN: 400,
  PROVIDER: 300,
  GOREECLOUD_BUILTIN: 200,
  DEFAULT: 0
});

export const DEFAULT_CONFIG = Object.freeze({
  schemaVersion: CONFIG_SCHEMA_VERSION,
  routingEnabled: true,
  defaultBehavior: "webspace",
  defaultWebspaceId: STANDARD_WEBSPACE_ID,
  webspaces: {},
  userRules: [],
  exceptions: []
});
