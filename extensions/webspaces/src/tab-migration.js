export async function migrateTab(browserApi, {
  sourceTabId,
  url,
  targetCookieStoreId,
  onTransition = () => {}
}) {
  const source = await browserApi.tabs.get(sourceTabId);
  if (source.cookieStoreId === targetCookieStoreId) {
    return { status: "already-target", tabId: source.id };
  }

  onTransition(source.id);

  // Establish the destination Webspace before starting the real navigation.
  // Creating directly with the requested URL can race webNavigation callbacks
  // before the replacement tab has been marked as an internal transition.
  const replacement = await browserApi.tabs.create({
    url: "about:blank",
    cookieStoreId: targetCookieStoreId,
    windowId: source.windowId,
    index: source.index,
    active: false,
    pinned: source.pinned
  });

  onTransition(replacement.id);

  try {
    await browserApi.tabs.update(replacement.id, { url });
    if (source.active) {
      await browserApi.tabs.update(replacement.id, { active: true });
    }
  } catch (error) {
    // Destination setup failed. Keep the original tab and remove only the
    // incomplete replacement so a routing failure cannot strand the user.
    try {
      await browserApi.tabs.remove(replacement.id);
    } catch {
      // Best-effort cleanup only.
    }
    throw error;
  }

  // Destination navigation is established. If source cleanup fails, keep the
  // replacement rather than risking navigation loss.
  try {
    await browserApi.tabs.remove(source.id);
  } catch (error) {
    console.warn("GoreeCloud Webspaces: source tab cleanup failed", error);
  }

  return { status: "migrated", tabId: replacement.id };
}
