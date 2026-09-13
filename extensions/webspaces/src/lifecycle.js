export async function tabsForWebspace(browserApi, cookieStoreId) {
  if (!cookieStoreId) return [];
  return browserApi.tabs.query({ cookieStoreId });
}

export async function closeTabsForWebspace(browserApi, cookieStoreId) {
  const tabs = await tabsForWebspace(browserApi, cookieStoreId);
  const ids = tabs.map((tab) => tab.id).filter((id) => Number.isInteger(id));
  if (ids.length) await browserApi.tabs.remove(ids);
  return ids.length;
}

export async function removeWebspaceIdentity(browserApi, webspace) {
  if (!webspace?.cookieStoreId) throw new Error("Webspace identity is unavailable.");
  const closedTabs = await closeTabsForWebspace(browserApi, webspace.cookieStoreId);
  const removedIdentity = await browserApi.contextualIdentities.remove(webspace.cookieStoreId);
  return { closedTabs, removedIdentity };
}

export async function recreateWebspaceIdentity(browserApi, webspace) {
  if (!webspace?.cookieStoreId) throw new Error("Webspace identity is unavailable.");

  // Create the fresh identity first so reset failure does not destroy the
  // existing identity before Firefox proves a replacement can be created.
  const identity = await browserApi.contextualIdentities.create({
    name: webspace.name,
    color: webspace.color,
    icon: webspace.icon
  });

  try {
    const closedTabs = await closeTabsForWebspace(browserApi, webspace.cookieStoreId);
    await browserApi.contextualIdentities.remove(webspace.cookieStoreId);
    return { closedTabs, identity };
  } catch (error) {
    try {
      await browserApi.contextualIdentities.remove(identity.cookieStoreId);
    } catch {
      // Rollback cleanup is best-effort.
    }
    throw error;
  }
}

export async function updateWebspaceIdentity(browserApi, webspace, definition) {
  if (!webspace?.cookieStoreId) throw new Error("Webspace identity is unavailable.");
  return browserApi.contextualIdentities.update(webspace.cookieStoreId, {
    name: definition.name,
    color: definition.color,
    icon: definition.icon
  });
}
