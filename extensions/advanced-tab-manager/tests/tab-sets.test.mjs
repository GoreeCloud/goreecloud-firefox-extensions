import test from "node:test";
import assert from "node:assert/strict";
import { captureWindowAsTabSet, prepareStashedItem } from "../src/core/tab-sets.js";
import { validatePersistentState } from "../src/core/persistent-state.js";

function idFactory(values) {
  let index = 0;
  return () => values[index++] || `generated-${index}`;
}

test("Tab Set capture stores only restorable tabs and preserves order, native groups, pinning, and tree relationships using set-local IDs", () => {
  const captured = captureWindowAsTabSet({
    window: {
      id: 4, focused: true, incognito: false,
      tabs: [
        { id: 11, logicalId:"root-logical", treeParentLogicalId:null, windowId:4, index:0, groupId:7, active:false, pinned:false, incognito:false, title:"Root", url:"https://example.com/root" },
        { id: 12, logicalId:"child-logical", treeParentLogicalId:"root-logical", windowId:4, index:1, groupId:7, active:true, pinned:false, incognito:false, title:"Child", url:"https://example.com/child" },
        { id: 13, logicalId:"internal", treeParentLogicalId:null, windowId:4, index:2, groupId:-1, active:false, pinned:false, incognito:false, title:"Settings", url:"about:config" }
      ]
    },
    groups: [{ id:7, windowId:4, title:"Research", color:"blue", collapsed:true }],
    name:"  Research   Session ",
    idFactory:idFactory(["set","item-root","item-child","group"]),
    now:100
  });
  assert.equal(captured.ok, true);
  assert.equal(captured.skippedTabCount, 1);
  assert.equal(captured.tabSet.name, "Research Session");
  assert.equal(captured.tabSet.items.length, 2);
  assert.equal(captured.tabSet.groups[0].title, "Research");
  assert.equal(captured.tabSet.items[1].parentItemId, "item-root");
  assert.equal(captured.tabSet.activeItemId, "item-child");
  const state={schemaVersion:1,revision:1,tabSets:[captured.tabSet],stashedItems:[]};
  assert.equal(validatePersistentState(state).tabSets[0].groups[0].collapsed, true);
});

test("Tab Set capture excludes a tree parent that was not captured", () => {
  const captured = captureWindowAsTabSet({
    window:{id:1,incognito:false,tabs:[{id:1,logicalId:"child",treeParentLogicalId:"missing",windowId:1,index:0,groupId:-1,active:true,pinned:false,incognito:false,title:"Child",url:"https://example.com/"}]},
    groups:[],
    idFactory:idFactory(["set","item"]),
    now:1
  });
  assert.equal(captured.tabSet.items[0].parentItemId, null);
});

test("empty or privileged-only windows fail without manufacturing restorable state", () => {
  const captured = captureWindowAsTabSet({
    window:{id:1,incognito:false,tabs:[{id:1,windowId:1,index:0,groupId:-1,active:true,pinned:false,incognito:false,title:"Add-ons",url:"about:addons"}]},
    groups:[],
    idFactory:idFactory(["set"]),
    now:1
  });
  assert.equal(captured.ok, false);
  assert.equal(captured.reason, "no-restorable-tabs");
});

test("stash preparation preserves safe local metadata but refuses unsupported URLs and private tabs", () => {
  const ids=idFactory(["stash"]);
  const prepared=prepareStashedItem({
    tab:{id:2,windowId:1,index:0,groupId:9,pinned:true,incognito:false,title:"Docs",url:"https://example.com/docs",treeParentLogicalId:"logical-parent"},
    groups:[{id:9,windowId:1,title:"Docs group",color:"green",collapsed:false}],
    idFactory:ids,
    now:50
  });
  assert.equal(prepared.ok,true);
  assert.equal(prepared.item.pinned,true);
  assert.equal(prepared.item.treeParentLogicalId,"logical-parent");
  assert.equal(prepared.item.nativeGroup.title,"Docs group");

  assert.equal(prepareStashedItem({tab:{incognito:false,url:"about:config"},groups:[],idFactory:()=> "x",now:1}).reason,"unsupported-url");
  assert.equal(prepareStashedItem({tab:{incognito:true,url:"https://example.com/"},groups:[],idFactory:()=> "x",now:1}).reason,"private-window");
});
