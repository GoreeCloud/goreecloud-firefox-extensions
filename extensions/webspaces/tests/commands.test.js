import test from "node:test";
import assert from "node:assert/strict";
import { COMMAND_WEBSPACE_TARGETS, WEBSPACES_COMMANDS, resolveWebspacesCommand } from "../src/commands.js";

test("built-in Webspace commands resolve to canonical Webspace IDs", () => {
  for (const [command, id] of Object.entries({
    "open-standard-webspace":"standard",
    "open-goreecloud-webspace":"goreecloud",
    "open-google-webspace":"google",
    "open-microsoft-webspace":"microsoft",
    "open-meta-webspace":"meta",
    "open-proton-webspace":"proton"
  })) {
    assert.deepEqual(resolveWebspacesCommand(command), { type:"open-webspace", webspaceId:id });
  }
});
test("launcher, routing, and manager commands resolve explicitly", () => {assert.deepEqual(resolveWebspacesCommand("open-webspaces-launcher"),{type:"open-popup"});assert.deepEqual(resolveWebspacesCommand("toggle-routing-pause"),{type:"toggle-routing-pause"});assert.deepEqual(resolveWebspacesCommand("open-webspaces-manager"),{type:"open-manager"});});
test("unknown commands are ignored",()=>assert.equal(resolveWebspacesCommand("not-a-webspaces-command"),null));
test("command registry stays complete and duplicate-free",()=>{assert.equal(new Set(WEBSPACES_COMMANDS).size,WEBSPACES_COMMANDS.length);for(const command of Object.keys(COMMAND_WEBSPACE_TARGETS))assert.ok(WEBSPACES_COMMANDS.includes(command));});
