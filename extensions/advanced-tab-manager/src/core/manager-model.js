function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function recordRevision(record) {
  if (!record || typeof record !== "object") return null;
  return Number.isInteger(record.revision) ? record.revision : null;
}

function recordSchemaVersion(record) {
  if (!record || typeof record !== "object") return null;
  return Number.isInteger(record.schemaVersion) ? record.schemaVersion : null;
}

export function buildManagerModel({ dashboard, snooze, rules, manifest }) {
  const snapshot = dashboard?.snapshot ?? { windows: [], groups: [] };
  const windows = asArray(snapshot.windows);
  const groups = asArray(snapshot.groups);
  const tabs = windows.flatMap((window) => asArray(window?.tabs));
  const organizationalState = dashboard?.ok ? dashboard.state : null;
  const snoozeState = snooze?.ok ? snooze.state : null;
  const ruleState = rules?.ok ? rules.state : null;

  return {
    sourceVersion: String(manifest?.version ?? "unknown"),
    permissions: asArray(manifest?.permissions).map(String).sort(),
    hostPermissions: asArray(manifest?.host_permissions).map(String).sort(),
    incognitoMode: String(manifest?.incognito ?? "unknown"),
    counts: {
      tabs: tabs.length,
      windows: windows.length,
      nativeGroups: groups.length,
      pinned: tabs.filter((tab) => Boolean(tab?.pinned)).length,
      discarded: tabs.filter((tab) => Boolean(tab?.discarded)).length,
      treeChildren: tabs.filter((tab) => Boolean(tab?.treeParentLogicalId)).length,
      tabSets: asArray(organizationalState?.tabSets).length,
      stashed: asArray(organizationalState?.stashedItems).length,
      snoozed: asArray(snoozeState?.items).length,
      rules: asArray(ruleState?.rules).length
    },
    stores: {
      organizational: {
        available: Boolean(dashboard?.ok),
        schemaVersion: recordSchemaVersion(organizationalState),
        revision: recordRevision(organizationalState)
      },
      snooze: {
        available: Boolean(snooze?.ok),
        schemaVersion: recordSchemaVersion(snoozeState),
        revision: recordRevision(snoozeState)
      },
      rules: {
        available: Boolean(rules?.ok),
        schemaVersion: recordSchemaVersion(ruleState),
        revision: recordRevision(ruleState),
        enabled: Boolean(ruleState?.enabled)
      }
    }
  };
}
