export async function persistThenClose({ persist, closeSource, rollbackPersist }) {
  const persisted = await persist();
  if (!persisted?.ok) return { ok: false, phase: "persist", persisted };

  try {
    await closeSource();
    return { ok: true, phase: "complete", persisted };
  } catch (error) {
    const rollback = await rollbackPersist(persisted.previousRecord);
    return { ok: false, phase: "close", error, rolledBack: Boolean(rollback?.ok), persisted };
  }
}

export async function createThenRemoveStored({ createReplacement, removeStored, rollbackReplacement }) {
  let replacement;
  try {
    replacement = await createReplacement();
  } catch (error) {
    return { ok: false, phase: "create", error };
  }

  const removed = await removeStored();
  if (removed?.ok) return { ok: true, phase: "complete", replacement, removed };

  let rollback;
  try {
    rollback = await rollbackReplacement(replacement);
  } catch (error) {
    return { ok: false, phase: "remove-stored", replacement, removed, rolledBack: false, rollbackError: error };
  }
  return { ok: false, phase: "remove-stored", replacement, removed, rolledBack: rollback !== false };
}
