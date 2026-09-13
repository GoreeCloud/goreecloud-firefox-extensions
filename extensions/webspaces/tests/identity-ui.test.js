import test from "node:test";
import assert from "node:assert/strict";
import { accentFor, glyphFor, iconLabelFor } from "../ui/identity.js";
test("built-in Webspaces keep deterministic identity accents",()=>{assert.equal(accentFor({id:"standard"}),"#5b6b82");assert.equal(accentFor({id:"goreecloud"}),"#3478f6");assert.equal(accentFor({id:"meta"}),"#1c8a8d");assert.equal(accentFor({id:"proton"}),"#7657f6");});
test("built-in and custom Webspaces retain non-color fallback glyphs when a logo cannot render",()=>{assert.equal(glyphFor({id:"standard",name:"Standard"}),"S");assert.equal(glyphFor({id:"goreecloud",name:"GoreeCloud"}),"G");assert.equal(glyphFor({id:"meta",name:"Meta"}),"∞");assert.equal(glyphFor({id:"proton",name:"Proton"}),"P");assert.equal(glyphFor({id:"custom-1",name:"Work",icon:"briefcase"}),"▣");});
test("custom identity labels reflect the configured Firefox icon role",()=>{assert.equal(iconLabelFor({id:"custom-1",builtIn:false,icon:"tree"}),"Nature identity");assert.equal(iconLabelFor({id:"standard",builtIn:true,icon:"circle"}),"Built-in Webspace");});
