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

function manifestArray(manifest, key) {
  return asArray(manifest?.[key]).map(String).sort();
}

function snapshotTabCount(snapshot) {
  return asArray(snapshot?.windows).reduce(
    (sum, window) => sum + asArray(window?.items).length,
    0
  );
}

function snapshotMetadata(snapshot) {
  return {
    id: String(snapshot?.id ?? ""),
    createdAt: Number.isInteger(snapshot?.createdAt) ? snapshot.createdAt : 0,
    windows: asArray(snapshot?.windows).length,
    tabs: snapshotTabCount(snapshot)
  };
}

export function buildManagerModel({ dashboard, snooze, rules, manifest, generatedAt = Date.now() }) {
  const snapshot = dashboard?.snapshot ?? { windows: [], groups: [] };
  const windows = asArray(snapshot.windows);
  const groups = asArray(snapshot.groups);
  const tabs = windows.flatMap((window) => asArray(window?.tabs));
  const organizationalState = dashboard?.ok ? dashboard.state : null;
  const snoozeState = snooze?.ok ? snooze.state : null;
  const ruleState = rules?.ok ? rules.state : null;
  const permissions = manifestArray(manifest, "permissions");
  const hostPermissions = manifestArray(manifest, "host_permissions");
  const contentScripts = asArray(manifest?.content_scripts);

  return {
    generatedAt,
    source: {
      version: String(manifest?.version ?? "unknown"),
      state: "source-candidate",
      lifecycle: "In Development",
      componentClass: "Browser extension",
      minimumFirefoxVersion: String(manifest?.browser_specific_settings?.gecko?.strict_min_version ?? "unknown")
    },
    permissions: {
      extension: permissions,
      hosts: hostPermissions,
      contentScripts: contentScripts.length,
      incognitoMode: String(manifest?.incognito ?? "unknown")
    },
    availability: {
      liveBrowserState: Boolean(dashboard?.snapshot),
      organizationalState: Boolean(dashboard?.ok),
      snoozeState: Boolean(snooze?.ok),
      ruleState: Boolean(rules?.ok)
    },
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
      rules: asArray(ruleState?.rules).length,
      sessionSnapshots: asArray(organizationalState?.sessionSnapshots).length
    },
    snapshots: {
      retention: Number.isInteger(organizationalState?.snapshotRetention) ? organizationalState.snapshotRetention : 10,
      items: asArray(organizationalState?.sessionSnapshots).map(snapshotMetadata)
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
