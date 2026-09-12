function sortedWebspaces(config) {
  return Object.values(config?.webspaces ?? {}).sort((a, b) =>
    String(a?.name ?? a?.id ?? "").localeCompare(String(b?.name ?? b?.id ?? ""))
  );
}

export function buildIsolationHealth(config, contexts = []) {
  const webspaces = sortedWebspaces(config);
  const availableStores = new Set(
    contexts.map((context) => context?.cookieStoreId).filter(Boolean)
  );
  const ownersByStore = new Map();

  for (const webspace of webspaces) {
    const store = webspace?.cookieStoreId;
    if (!store) continue;
    const owners = ownersByStore.get(store) ?? [];
    owners.push(webspace.id);
    ownersByStore.set(store, owners);
  }

  const records = webspaces.map((webspace) => {
    const cookieStoreId = webspace?.cookieStoreId ?? null;
    const owners = cookieStoreId ? (ownersByStore.get(cookieStoreId) ?? []) : [];
    const firefoxIdentityPresent = Boolean(cookieStoreId && availableStores.has(cookieStoreId));
    const uniqueCookieStore = Boolean(cookieStoreId && owners.length === 1);
    const issues = [];

    if (!cookieStoreId) issues.push("missing-cookie-store");
    if (cookieStoreId && !firefoxIdentityPresent) issues.push("missing-firefox-identity");
    if (cookieStoreId && owners.length > 1) issues.push("shared-cookie-store");

    return {
      webspaceId: webspace.id,
      name: webspace.name ?? webspace.id,
      builtIn: webspace.builtIn === true,
      temporary: webspace.temporary === true,
      firefoxIdentityPresent,
      uniqueCookieStore,
      healthy: issues.length === 0,
      issues
    };
  });

  const uniqueCookieStores = new Set(
    webspaces.map((webspace) => webspace?.cookieStoreId).filter(Boolean)
  ).size;
  const issueCount = records.reduce((sum, record) => sum + record.issues.length, 0);

  return {
    healthy: issueCount === 0,
    managedWebspaces: records.length,
    uniqueCookieStores,
    firefoxIdentitiesPresent: records.filter((record) => record.firefoxIdentityPresent).length,
    issueCount,
    records
  };
}
