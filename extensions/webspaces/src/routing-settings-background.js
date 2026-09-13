import { applyBulkAssignments } from "./bulk-rules.js";
import {
  applyRoutingPause,
  clearRestartPause,
  getRoutingPause,
  resumeRouting,
  setDefaultBehavior
} from "./routing-controls.js";
import { loadConfig, saveConfig } from "./storage.js";

async function mutate(mutator) {
  const current = await loadConfig();
  const next = await mutator(current);
  await saveConfig(next);
  return next;
}

function assertDefaultChangeAllowed(config, requestedWebspaceId) {
  const currentDefault = config.defaultBehavior === "webspace"
    ? config.webspaces?.[config.defaultWebspaceId]
    : null;
  if (currentDefault?.locked === true && currentDefault.id !== requestedWebspaceId) {
    throw new Error("Unlock the current default Webspace before changing the default browsing behavior.");
  }
}

async function handleControlMessage(message) {
  switch (message.type) {
    case "webspaces-controls:pause":
      return {
        config: await mutate((current) =>
          applyRoutingPause(current, message.mode, {
            hostname: message.hostname,
            now: Date.now()
          })
        )
      };

    case "webspaces-controls:resume":
      return { config: await mutate((current) => resumeRouting(current)) };

    case "webspaces-controls:set-default":
      return {
        config: await mutate((current) => {
          assertDefaultChangeAllowed(current, message.webspaceId ?? null);
          return setDefaultBehavior(current, message.behavior, message.webspaceId ?? null);
        })
      };

    case "webspaces-controls:bulk-assign": {
      let summary = null;
      const config = await mutate((current) => {
        const result = applyBulkAssignments(current, {
          text: message.text,
          kind: message.kind,
          webspaceId: message.webspaceId,
          maxItems: 200
        });
        summary = result.summary;
        return result.config;
      });
      return { config, summary };
    }

    case "webspaces-controls:get-pause": {
      const current = await loadConfig();
      return { pause: getRoutingPause(current) };
    }

    default:
      throw new Error(`Unknown GoreeCloud Webspaces routing-control message: ${message.type}`);
  }
}

browser.runtime.onMessage.addListener((message) => {
  if (!message?.type?.startsWith("webspaces-controls:")) return undefined;
  return handleControlMessage(message);
});

browser.runtime.onStartup.addListener(() => {
  mutate((current) => clearRestartPause(current)).catch((error) =>
    console.warn("GoreeCloud Webspaces: could not clear restart-scoped routing pause", error)
  );
});
