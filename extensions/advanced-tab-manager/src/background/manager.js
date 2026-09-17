import { buildManagerModel } from "../core/manager-model.js";

async function settle(read) {
  try {
    return await read();
  } catch {
    return { ok: false };
  }
}

export function createManagerState({
  getManifest,
  readDashboardState,
  readSnoozeState,
  readRuleState,
  now = Date.now
}) {
  async function readManagerState() {
    const [dashboard, snooze, rules] = await Promise.all([
      settle(readDashboardState),
      settle(readSnoozeState),
      settle(readRuleState)
    ]);

    return {
      ok: true,
      model: buildManagerModel({
        dashboard,
        snooze,
        rules,
        manifest: getManifest(),
        generatedAt: now()
      })
    };
  }

  return { readManagerState };
}
