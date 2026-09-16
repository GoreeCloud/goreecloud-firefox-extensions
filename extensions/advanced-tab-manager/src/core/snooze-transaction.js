async function safeClear(clearSchedule) {
  try {
    const result = await clearSchedule();
    return result !== false;
  } catch {
    return false;
  }
}

export async function persistScheduleThenClose({
  persist,
  schedule,
  verifySchedule,
  closeSource,
  rollbackPersist,
  clearSchedule
}) {
  const persisted = await persist();
  if (!persisted?.ok) return { ok: false, phase: "persist", persisted };

  try {
    await schedule();
    if (!(await verifySchedule())) throw new Error("snooze alarm verification failed");
  } catch (error) {
    const scheduleCleared = await safeClear(clearSchedule);
    const rollback = await rollbackPersist(persisted.previousRecord);
    return {
      ok: false,
      phase: "schedule",
      error,
      scheduleCleared,
      rolledBack: Boolean(rollback?.ok),
      persisted
    };
  }

  try {
    await closeSource();
    return { ok: true, phase: "complete", persisted };
  } catch (error) {
    const scheduleCleared = await safeClear(clearSchedule);
    const rollback = await rollbackPersist(persisted.previousRecord);
    return {
      ok: false,
      phase: "close",
      error,
      scheduleCleared,
      rolledBack: Boolean(rollback?.ok),
      persisted
    };
  }
}
