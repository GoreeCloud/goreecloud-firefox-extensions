import test from "node:test";
import assert from "node:assert/strict";
import { buildMenuDefinitions, parseMenuAction, sortedMenuWebspaces } from "../src/context-menus.js";
const webspaces={work:{id:"work",name:"Work",builtIn:false},google:{id:"google",name:"Google",builtIn:true}};
test("context menus expose required Webspace actions",()=>{const d=buildMenuDefinitions(webspaces);assert.ok(d.some(i=>i.id==="webspaces-open-link"));assert.ok(d.some(i=>i.id==="webspaces-move-tab"));assert.ok(d.some(i=>i.id==="webspaces-assign-site"));assert.ok(d.some(i=>i.id==="webspaces-remove-assignment"));assert.ok(d.some(i=>i.id==="webspaces-open-link:google"));assert.ok(d.some(i=>i.id==="webspaces-move-tab:work"));});
test("built-in Webspaces sort before custom Webspaces",()=>assert.deepEqual(sortedMenuWebspaces(webspaces).map(s=>s.id),["google","work"]));
test("menu identifiers parse into deterministic actions",()=>{assert.deepEqual(parseMenuAction("webspaces-open-link:google"),{action:"open-link",webspaceId:"google"});assert.deepEqual(parseMenuAction("webspaces-move-tab:work"),{action:"move-tab",webspaceId:"work"});assert.deepEqual(parseMenuAction("webspaces-assign-site:work"),{action:"assign-site",webspaceId:"work"});assert.deepEqual(parseMenuAction("webspaces-remove-assignment"),{action:"remove-assignment",webspaceId:null});});
