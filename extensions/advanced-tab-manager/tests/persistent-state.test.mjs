import test from "node:test";
import assert from "node:assert/strict";
import {
  PERSISTENT_STATE_KEY,
  PersistentStateError,
  commitPersistentMutation,
  createEmptyPersistentState,
  isRestorableUrl,
  readPersistentStateRecord,
  validatePersistentState
} from "../src/core/persistent-state.js";

function fakeStorage(initial = undefined, { failSetOnce = false } = {}) {
  let hasValue = initial !== undefined;
  let value = initial;
  return {
    async get(key) {
      return hasValue && key === PERSISTENT_STATE_KEY ? { [key]: JSON.parse(JSON.stringify(value)) } : {};
    },
    async set(object) {
      if (failSetOnce) {
        failSetOnce = false;
        throw new Error("simulated storage write failure");
      }
      value = JSON.parse(JSON.stringify(object[PERSISTENT_STATE_KEY]));
      hasValue = true;
    },
    async remove(key) {
      if (key === PERSISTENT_STATE_KEY) {
        hasValue = false;
        value = undefined;
      }
    },
    peek() { return hasValue ? JSON.parse(JSON.stringify(value)) : undefined; }
  };
}

test("missing persistent state reads as an empty schema without writing storage", async () => {
  const storage = fakeStorage();
  const record = await readPersistentStateRecord(storage);
  assert.equal(record.exists, false);
  assert.deepEqual(record.state, createEmptyPersistentState());
  assert.equal(storage.peek(), undefined);
});

test("verified persistent mutation increments revision and commits the complete state", async () => {
  const storage = fakeStorage();
  const result = await commitPersistentMutation({
    storage,
    mutate(state) {
      state.tabSets.push({ id:"set-1", name:"Research", createdAt:1, updatedAt:1, activeItemId:"item-1", groups:[], items:[{ id:"item-1", url:"https://example.com/", title:"Example", pinned:false, sourceIndex:0, groupId:null, parentItemId:null }] });
      return state;
    }
  });
  assert.equal(result.ok, true);
  assert.equal(result.state.revision, 1);
  assert.equal(storage.peek().tabSets[0].name, "Research");
});

test("persistent write failure restores the exact previous valid state", async () => {
  const previous = createEmptyPersistentState();
  previous.revision = 4;
  const storage = fakeStorage(previous, { failSetOnce: true });
  const result = await commitPersistentMutation({
    storage,
    mutate(state) {
      state.stashedItems.push({ id:"stash-1", url:"https://example.com/", title:"Example", pinned:false, createdAt:1, treeParentLogicalId:null, nativeGroup:null });
      return state;
    }
  });
  assert.equal(result.ok, false);
  assert.equal(result.rolledBack, true);
  assert.deepEqual(storage.peek(), previous);
});

test("invalid stored state fails closed instead of being replaced with an empty schema", async () => {
  const storage = fakeStorage({ schemaVersion:1, revision:0, tabSets:"not-an-array", stashedItems:[] });
  await assert.rejects(() => readPersistentStateRecord(storage), (error) => error instanceof PersistentStateError && error.code === "invalid-persistent-state");
  assert.equal(storage.peek().tabSets, "not-an-array");
});

test("Tab Set validation rejects dangling parent relationships and cycles", () => {
  const state = createEmptyPersistentState();
  state.tabSets.push({
    id:"set-1", name:"Broken", createdAt:1, updatedAt:1, activeItemId:null, groups:[],
    items:[
      { id:"a", url:"https://a.example/", title:"A", pinned:false, sourceIndex:0, groupId:null, parentItemId:"b" },
      { id:"b", url:"https://b.example/", title:"B", pinned:false, sourceIndex:1, groupId:null, parentItemId:"a" }
    ]
  });
  assert.throws(() => validatePersistentState(state), /parent cycle/);
});

test("restorable URL boundary permits web pages and about:blank but rejects privileged and data URLs", () => {
  assert.equal(isRestorableUrl("https://example.com/"), true);
  assert.equal(isRestorableUrl("http://example.com/"), true);
  assert.equal(isRestorableUrl("about:blank"), true);
  assert.equal(isRestorableUrl("about:config"), false);
  assert.equal(isRestorableUrl("file:///tmp/example.txt"), false);
  assert.equal(isRestorableUrl("data:text/plain,hello"), false);
});

test("legacy organizational records normalize snapshot settings without rewriting storage", async () => {
  const legacy = { schemaVersion:1, revision:2, tabSets:[], stashedItems:[] };
  const storage = fakeStorage(legacy);
  const record = await readPersistentStateRecord(storage);
  assert.equal(record.exists, true);
  assert.equal(record.state.snapshotRetention, 10);
  assert.deepEqual(record.state.sessionSnapshots, []);
  assert.deepEqual(storage.peek(), legacy);
});

test("session snapshot validation enforces bounded retention and safe captured URLs", () => {
  const state = createEmptyPersistentState();
  state.snapshotRetention = 1;
  state.sessionSnapshots.push({
    id:"snapshot-1",
    createdAt:1,
    windows:[{
      id:"window-1",
      focused:true,
      activeItemId:"item-1",
      groups:[],
      items:[{ id:"item-1", url:"https://example.com/", title:"Example", pinned:false, sourceIndex:0, groupId:null, parentItemId:null }]
    }]
  });
  assert.equal(validatePersistentState(state).sessionSnapshots.length, 1);

  const overflow = structuredClone(state);
  overflow.sessionSnapshots.push({ ...structuredClone(state.sessionSnapshots[0]), id:"snapshot-2", createdAt:2 });
  assert.throws(() => validatePersistentState(overflow), /exceed configured retention/);

  const unsafe = structuredClone(state);
  unsafe.sessionSnapshots[0].windows[0].items[0].url = "file:///tmp/private";
  assert.throws(() => validatePersistentState(unsafe), /is invalid/);
});
