import test from "node:test";
import assert from "node:assert/strict";
import { createThenRemoveStored, persistThenClose } from "../src/core/stash-transaction.js";

test("stash transaction persists verified recovery state before closing the live source tab", async () => {
  const order=[];
  const result=await persistThenClose({
    persist:async()=>{order.push("persist"); return {ok:true,previousRecord:{}};},
    closeSource:async()=>{order.push("close");},
    rollbackPersist:async()=>{order.push("rollback"); return {ok:true};}
  });
  assert.equal(result.ok,true);
  assert.deepEqual(order,["persist","close"]);
});

test("stash close failure rolls persistent state back and leaves source-preserving failure evidence", async () => {
  const order=[];
  const result=await persistThenClose({
    persist:async()=>{order.push("persist"); return {ok:true,previousRecord:{id:"before"}};},
    closeSource:async()=>{order.push("close"); throw new Error("simulated close failure");},
    rollbackPersist:async(record)=>{order.push(`rollback:${record.id}`); return {ok:true};}
  });
  assert.equal(result.ok,false);
  assert.equal(result.phase,"close");
  assert.equal(result.rolledBack,true);
  assert.deepEqual(order,["persist","close","rollback:before"]);
});

test("stash transaction never closes the live tab when persistence did not verify", async () => {
  let closed=false;
  const result=await persistThenClose({
    persist:async()=>({ok:false,rolledBack:true}),
    closeSource:async()=>{closed=true;},
    rollbackPersist:async()=>({ok:true})
  });
  assert.equal(result.ok,false);
  assert.equal(result.phase,"persist");
  assert.equal(closed,false);
});

test("stash restore creates the replacement before deleting the stored recovery record and rolls back the replacement on storage failure", async () => {
  const order=[];
  const result=await createThenRemoveStored({
    createReplacement:async()=>{order.push("create"); return {tabId:99};},
    removeStored:async()=>{order.push("remove"); return {ok:false};},
    rollbackReplacement:async()=>{order.push("rollback-created"); return true;}
  });
  assert.equal(result.ok,false);
  assert.equal(result.rolledBack,true);
  assert.deepEqual(order,["create","remove","rollback-created"]);
});
