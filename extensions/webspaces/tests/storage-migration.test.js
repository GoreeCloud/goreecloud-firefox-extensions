import test from "node:test";
import assert from "node:assert/strict";
import { migrateConfig } from "../src/storage.js";

test("schema-1 configuration migrates to schema 2 with Standard as fallback",()=>{const migrated=migrateConfig({schemaVersion:1,routingEnabled:true,defaultBehavior:"normal",webspaces:{work:{id:"work"}},userRules:[],exceptions:[]});assert.equal(migrated.schemaVersion,2);assert.equal(migrated.defaultBehavior,"webspace");assert.equal(migrated.defaultWebspaceId,"standard");assert.ok(migrated.webspaces.work);});
test("schema-2 configuration cannot persist an alternate global fallback",()=>{const migrated=migrateConfig({schemaVersion:2,routingEnabled:true,defaultBehavior:"webspace",defaultWebspaceId:"work",webspaces:{},userRules:[],exceptions:[]});assert.equal(migrated.defaultWebspaceId,"standard");});
test("unknown future configuration schemas remain fail-closed",()=>{assert.throws(()=>migrateConfig({schemaVersion:99}),/Unsupported/);});
