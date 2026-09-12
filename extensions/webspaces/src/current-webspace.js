function asWebspaceList(webspaces) {
  if (Array.isArray(webspaces)) return webspaces;
  return Object.values(webspaces ?? {});
}

export function resolveCurrentWebspace(webspaces, tab, cookieStores = []) {
  const list = asWebspaceList(webspaces);
  const directStoreId = tab?.cookieStoreId;

  if (directStoreId) {
    const direct = list.find((webspace) => webspace?.cookieStoreId === directStoreId);
    if (direct) return direct;
  }

  const tabId = tab?.id;
  if (!Number.isInteger(tabId)) return null;

  const store = (cookieStores ?? []).find((candidate) =>
    Array.isArray(candidate?.tabIds) && candidate.tabIds.includes(tabId)
  );
  if (!store?.id) return null;

  return list.find((webspace) => webspace?.cookieStoreId === store.id) ?? null;
}
