import { buildExactDuplicateReview, planExactDuplicateCleanup } from "../core/duplicates.js";

export function createDuplicateCleanup({ browser, readLiveSnapshot, broadcastChange }) {
  async function cleanupExactDuplicates({ url, keepTabId }) {
    if (typeof url !== "string" || !url) return { ok: false, reason: "duplicate-url-required" };
    if (!Number.isInteger(keepTabId)) return { ok: false, reason: "selected-keeper-required" };

    const snapshot = await readLiveSnapshot();
    const review = buildExactDuplicateReview(snapshot);
    const duplicateSet = review.sets.find((candidate) => candidate.url === url);
    if (!duplicateSet) return { ok: false, reason: "duplicate-set-no-longer-current" };

    const plan = planExactDuplicateCleanup(duplicateSet, { keepTabId });
    if (!plan.ok) return plan;
    if (!plan.closeTabIds.length) {
      return { ok: true, closed: 0, keepTabId: plan.keepTabId, blocked: plan.blocked };
    }

    try {
      await browser.tabs.remove(plan.closeTabIds);
    } catch (error) {
      broadcastChange("duplicate-cleanup-reconcile");
      return { ok: false, reason: "browser-remove-failed", detail: String(error?.message || error) };
    }

    broadcastChange("duplicate-cleanup");
    return { ok: true, closed: plan.closeTabIds.length, keepTabId: plan.keepTabId, blocked: plan.blocked };
  }

  return { cleanupExactDuplicates };
}
