import test from "node:test";
import assert from "node:assert/strict";
import { analyzeRouting } from "../src/routing.js";
const base={routingEnabled:true,defaultBehavior:"normal",webspaces:{},userRules:[],exceptions:[]};
test("routing analysis exposes the selected rule and priority",()=>{const r=analyzeRouting("https://docs.google.com/document/d/1",{...base,userRules:[{id:"work-docs",kind:"exact",value:"docs.google.com",webspaceId:"work",enabled:true}]});assert.equal(r.decision.webspaceId,"work");assert.equal(r.decision.reason,"exact-hostname-rule");assert.equal(r.decision.priority,500);assert.ok(r.candidates.some(c=>c.id==="work-docs"&&c.selected));});
test("routing analysis shows provider candidates overridden by user choice",()=>{const r=analyzeRouting("https://youtube.com/watch?v=x",{...base,userRules:[{id:"entertainment",kind:"domain",value:"youtube.com",webspaceId:"fun",enabled:true}]});assert.equal(r.decision.webspaceId,"fun");assert.ok(r.candidates.some(c=>c.source==="provider"));assert.ok(r.candidates.some(c=>c.id==="entertainment"&&c.selected));});
