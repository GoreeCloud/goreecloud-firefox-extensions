import { BUILTIN_WEBSPACES } from "./constants.js";

async function contextsById() {
  const contexts = await browser.contextualIdentities.query({});
  return new Map(contexts.map((context) => [context.cookieStoreId, context]));
}

export async function ensureBuiltinWebspaces(config) {
  const available = await contextsById();
  const next = structuredClone(config);
  next.webspaces ??= {};

  for (const definition of BUILTIN_WEBSPACES) {
    const existingRecord = next.webspaces[definition.id];
    if (existingRecord?.cookieStoreId && available.has(existingRecord.cookieStoreId)) {
      next.webspaces[definition.id] = {
        ...existingRecord,
        id: definition.id,
        name: definition.name,
        color: existingRecord.color ?? definition.color,
        icon: existingRecord.icon ?? definition.icon,
        builtIn: true
      };
      continue;
    }

    // Never claim an unrelated user-created Firefox identity merely because
    // it has the same display name. Durable ownership comes from our stored
    // Webspace -> cookieStoreId mapping.
    const context = await browser.contextualIdentities.create({
      name: definition.name,
      color: definition.color,
      icon: definition.icon
    });

    available.set(context.cookieStoreId, context);
    next.webspaces[definition.id] = {
      id: definition.id,
      name: definition.name,
      color: definition.color,
      icon: definition.icon,
      builtIn: true,
      cookieStoreId: context.cookieStoreId
    };
  }

  return next;
}
