import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");const read=(f)=>fs.readFileSync(path.join(root,f),"utf8");const popup=read("ui/popup.html"),popupJs=read("ui/popup.js"),options=read("ui/options.html"),optionsJs=read("ui/options.js");
test("popup exposes temporary, move, explain, assignment-removal and Close & Forget controls",()=>{for(const id of["new-temporary","move-tab","why-panel","remove-assignment","close-forget"])assert.match(popup,new RegExp(`id=\\"${id}\\"`));assert.match(popupJs,/webspaces:explain-url/);assert.match(popupJs,/webspaces:move-current/);assert.match(popupJs,/webspaces:close-forget/);});
test("manager exposes lifecycle, assignment, rule-test and portability workflows",()=>{for(const id of["add-assignment","assignment-search","assignment-filter","routing-tester","export-config","import-config"])assert.match(options,new RegExp(`id=\\"${id}\\"`));for(const message of["webspaces:update","webspaces:set-lock","webspaces:duplicate","webspaces:reset","webspaces:delete","webspaces:update-assignment","webspaces:export-config","webspaces:import-config"])assert.match(optionsJs,new RegExp(message.replace(/[.*+?^${}()|[\\]\\]/g,"\\$&")));});
