function validLogicalId(value) {
  return typeof value === "string" && value.length > 0;
}

export function tabsByLogicalId(tabs) {
  return new Map(tabs.filter((tab) => validLogicalId(tab.logicalId)).map((tab) => [tab.logicalId, tab]));
}

function candidateParentMap(tabs) {
  const byLogicalId = tabsByLogicalId(tabs);
  const parentByChild = new Map();
  const statusByLogicalId = new Map();
  for (const tab of tabs) {
    if (!validLogicalId(tab.logicalId)) continue;
    const parentLogicalId = validLogicalId(tab.treeParentLogicalId) ? tab.treeParentLogicalId : null;
    if (!parentLogicalId) {
      statusByLogicalId.set(tab.logicalId, "root");
      continue;
    }
    if (parentLogicalId === tab.logicalId) {
      statusByLogicalId.set(tab.logicalId, "cycle");
      continue;
    }
    const parent = byLogicalId.get(parentLogicalId);
    if (!parent || parent.windowId !== tab.windowId) {
      statusByLogicalId.set(tab.logicalId, "orphaned");
      continue;
    }
    parentByChild.set(tab.logicalId, parentLogicalId);
    statusByLogicalId.set(tab.logicalId, "attached");
  }
  return { byLogicalId, parentByChild, statusByLogicalId };
}

function findCycleNodes(parentByChild) {
  const cycleNodes = new Set();
  const complete = new Set();
  for (const start of parentByChild.keys()) {
    if (complete.has(start)) continue;
    const path = [];
    const position = new Map();
    let cursor = start;
    while (parentByChild.has(cursor) && !complete.has(cursor)) {
      if (position.has(cursor)) {
        for (let i = position.get(cursor); i < path.length; i += 1) cycleNodes.add(path[i]);
        break;
      }
      position.set(cursor, path.length);
      path.push(cursor);
      cursor = parentByChild.get(cursor);
    }
    for (const logicalId of path) complete.add(logicalId);
  }
  return cycleNodes;
}

export function analyzeTree(tabs) {
  const { byLogicalId, parentByChild, statusByLogicalId } = candidateParentMap(tabs);
  const cycleNodes = findCycleNodes(parentByChild);
  for (const logicalId of cycleNodes) {
    parentByChild.delete(logicalId);
    statusByLogicalId.set(logicalId, "cycle");
  }
  return { byLogicalId, parentByChild, statusByLogicalId, cycleNodes };
}

export function buildTreeRows(tabs) {
  const orderedTabs = [...tabs].sort((a, b) => a.index - b.index || a.id - b.id);
  const { byLogicalId, parentByChild, statusByLogicalId } = analyzeTree(orderedTabs);
  const childrenByParent = new Map();
  for (const [childLogicalId, parentLogicalId] of parentByChild) {
    if (!childrenByParent.has(parentLogicalId)) childrenByParent.set(parentLogicalId, []);
    childrenByParent.get(parentLogicalId).push(childLogicalId);
  }
  for (const childIds of childrenByParent.values()) {
    childIds.sort((leftId, rightId) => {
      const left = byLogicalId.get(leftId);
      const right = byLogicalId.get(rightId);
      return left.index - right.index || left.id - right.id;
    });
  }
  const rows = [];
  const emitted = new Set();
  const emit = (tab, depth) => {
    if (!tab || emitted.has(tab.logicalId)) return;
    emitted.add(tab.logicalId);
    rows.push({ tab, depth, treeStatus: statusByLogicalId.get(tab.logicalId) || "root" });
    for (const childLogicalId of childrenByParent.get(tab.logicalId) || []) emit(byLogicalId.get(childLogicalId), depth + 1);
  };
  for (const tab of orderedTabs) {
    if (!validLogicalId(tab.logicalId)) {
      rows.push({ tab, depth: 0, treeStatus: "untracked" });
      continue;
    }
    if (!parentByChild.has(tab.logicalId)) emit(tab, 0);
  }
  for (const tab of orderedTabs) {
    if (validLogicalId(tab.logicalId) && !emitted.has(tab.logicalId)) emit(tab, 0);
  }
  return rows;
}

export function wouldCreateCycle(tabs, childLogicalId, proposedParentLogicalId) {
  if (!validLogicalId(childLogicalId) || !validLogicalId(proposedParentLogicalId)) return false;
  if (childLogicalId === proposedParentLogicalId) return true;
  const byLogicalId = tabsByLogicalId(tabs);
  const visited = new Set();
  let cursor = proposedParentLogicalId;
  while (validLogicalId(cursor)) {
    if (cursor === childLogicalId) return true;
    if (visited.has(cursor)) return true;
    visited.add(cursor);
    const tab = byLogicalId.get(cursor);
    if (!tab) return false;
    cursor = validLogicalId(tab.treeParentLogicalId) ? tab.treeParentLogicalId : null;
  }
  return false;
}
