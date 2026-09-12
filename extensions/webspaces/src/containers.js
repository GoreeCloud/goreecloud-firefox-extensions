import { BUILTIN_WEBSPACES } from "./constants.js";

async function contextsById() {
  const contexts = await browser.contextualIdentities.query({});
  return new Map(contexts.map((context) => [context.cookieStoreId, context]));
}

export function assertDistinctCookieStores(config) {
  const owners = new Map();

  for (const [webspaceId, webspace] of Object.entries(config.webspaces ?? {})) {
    const cookieStoreId = webspace?.cookieStoreId;
    if (!cookieStoreId) {
      throw new Error(`Webspace isolation invariant violated: ${webspaceId} has no Firefox cookie store.`);
    }

    const existingOwner = owners.get(cookieStoreId);
    if (existingOwner) {
      throw new Error(
        `Webspace isolation invariant violated: ${existingOwner} and ${webspaceId} share Firefox cookie store ${cookieStoreId}.`
      );
    }

    owners.set(cookieStoreId, webspaceId);
  }

  return true;
}

export async function ensureBuiltinWebspaces(config) {
  const available = await contextsById();
  const next = structuredClone(config);
  next.webspaces ??= {};

  for (const definition of BUILTIN_WEBSPACES) {
    const existingRecord = next.webspaces[definition.id];
    if (existingRecord?.cookieStoreId && available.has(existingRecord.cookieStoreId)) {
      const context = available.get(existingRecord.cookieStoreId);
      next.webspaces[definition.id] = {
        ...existingRecord,
        id: definition.id,
        name: definition.name,
        color: context?.color ?? existingRecord.color ?? definition.color,
        icon: context?.icon ?? existingRecord.icon ?? definition.icon,
        description: existingRecord.description ?? definition.description ?? "",
        builtIn: true,
        temporary: false
      };
      continue;
    }

    const context = await browser.contextualIdentities.create({
      name: definition.name,
      color: definition.color,
      icon: definition.icon
    });

    available.set(context.cookieStoreId, context);
    next.webspaces[definition.id] = {
      id: definition.id,
      name: definition.name,
      color: context.color ?? definition.color,
      icon: context.icon ?? definition.icon,
      description: definition.description ?? "",
      builtIn: true,
      temporary: false,
      locked: existingRecord?.locked === true,
      cookieStoreId: context.cookieStoreId
    };
  }

  // Isolation is a hard product invariant: every GoreeCloud-managed Webspace
  // must own a distinct Firefox contextual identity/cookie store. If persisted
  // configuration ever maps two Webspaces to the same store, fail closed
  // rather than operate with silently shared authenticated site state.
  assertDistinctCookieStores(next);
  return next;
}
