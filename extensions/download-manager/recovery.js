const RECOVERABLE_NATIVE_STATES = new Set(["interrupted", "error"]);
const STALE_NATIVE_ACTIVE_STATES = new Set(["starting", "in_progress", "downloading"]);

function isRecoverableNativeJob(job) {
  return Boolean(job?.native && job.nativeStarted && RECOVERABLE_NATIVE_STATES.has(job.state));
}

async function recoverNativeJob(id) {
  const job = await getJob(id);
  if (!isRecoverableNativeJob(job)) return false;

  // Prove the native host can be reached before changing queue state. This avoids
  // converting a recoverable native job into a Firefox fallback merely because
  // the helper or Flatpak portal is temporarily unavailable.
  try {
    await readyNativePort();
  } catch (error) {
    await updateJob(job.id, {
      state: "interrupted",
      paused: false,
      speedBps: 0,
      error: `Native recovery unavailable: ${String(error)}`
    });
    return false;
  }

  await updateJob(job.id, {
    state: "queued",
    paused: false,
    speedBps: 0,
    error: null,
    engine: "native",
    native: true,
    nativeStarted: true,
    notifiedTerminalState: null,
    recoveryRequestedAt: Date.now()
  });
  pumpQueue().catch(() => {});
  return true;
}

async function recoverPersistedNativeJobs() {
  const jobs = await rawJobs();
  const stale = jobs.filter((job) =>
    job.native && job.nativeStarted && STALE_NATIVE_ACTIVE_STATES.has(job.state)
  );
  if (!stale.length) return false;

  try {
    await readyNativePort();
  } catch (error) {
    for (const job of stale) {
      await updateJob(job.id, {
        state: "interrupted",
        paused: false,
        speedBps: 0,
        error: `Native download needs recovery: ${String(error)}`
      });
    }
    return false;
  }

  for (const job of stale) {
    await updateJob(job.id, {
      state: "queued",
      paused: false,
      speedBps: 0,
      error: null,
      engine: "native",
      native: true,
      nativeStarted: true,
      notifiedTerminalState: null,
      recoveryRequestedAt: Date.now()
    });
  }
  pumpQueue().catch(() => {});
  return true;
}

browser.runtime.onMessage.addListener((message) => {
  if (message?.type !== "recover-job") return undefined;
  return recoverNativeJob(message.id);
});

browser.runtime.onStartup.addListener(() => recoverPersistedNativeJobs().catch(() => {}));

// A non-persistent MV3 background page can be recreated without a browser
// startup event. Reconcile stale native-active jobs whenever this background
// context is created. Paused and already-interrupted jobs remain user-controlled.
queueMicrotask(() => recoverPersistedNativeJobs().catch(() => {}));
