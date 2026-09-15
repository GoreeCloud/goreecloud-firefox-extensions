function normalizeStoredString(value) {
  return typeof value === "string" && value.length > 0 ? value : null;
}

async function writeValue(sessions, tabId, key, value) {
  if (value) await sessions.setTabValue(tabId, key, value);
  else await sessions.removeTabValue(tabId, key);
}

export async function persistVerifiedTabString({ sessions, tabId, key, value }) {
  const nextValue = normalizeStoredString(value);
  const previousValue = normalizeStoredString(await sessions.getTabValue(tabId, key));
  try {
    await writeValue(sessions, tabId, key, nextValue);
    const verified = normalizeStoredString(await sessions.getTabValue(tabId, key));
    if (verified === nextValue) return { ok: true, value: nextValue, previousValue, rolledBack: false };
  } catch (error) {
    try {
      await writeValue(sessions, tabId, key, previousValue);
    } catch {
      return { ok: false, value: nextValue, previousValue, rolledBack: false, error };
    }
    const rollbackValue = normalizeStoredString(await sessions.getTabValue(tabId, key));
    return { ok: false, value: nextValue, previousValue, rolledBack: rollbackValue === previousValue, error };
  }
  try {
    await writeValue(sessions, tabId, key, previousValue);
    const rollbackValue = normalizeStoredString(await sessions.getTabValue(tabId, key));
    return { ok: false, value: nextValue, previousValue, rolledBack: rollbackValue === previousValue };
  } catch (error) {
    return { ok: false, value: nextValue, previousValue, rolledBack: false, error };
  }
}
