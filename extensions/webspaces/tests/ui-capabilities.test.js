import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const popup = read("ui/popup.html");
const popupJs = read("ui/popup.js");
const options = read("ui/options.html");
const optionsJs = read("ui/options.js");
const routingSettings = read("ui/routing-settings-ui.js");
const providerLogos = read("ui/provider-logos.js");
const isolationHealthUi = read("ui/isolation-health-ui.js");
const isolationHealthBackground = read("src/isolation-health-background.js");
const mainBackground = read("src/background.js");

test("popup exposes temporary, move, explain, assignment-removal and Close & Forget controls", () => {
  for (const id of ["new-temporary", "move-tab", "why-panel", "remove-assignment", "close-forget"]) {
    assert.match(popup, new RegExp(`id=\\"${id}\\"`));
  }
  assert.match(popupJs, /webspaces:explain-url/);
  assert.match(popupJs, /webspaces:move-current/);
  assert.match(popupJs, /webspaces:close-forget/);
});

test("popup explains Standard fallback decisions", () => {
  assert.match(popupJs, /standard-fallback/);
  assert.match(popupJs, /Standard fallback for an unassigned website/);
});

test("manager exposes lifecycle, assignment, rule-test and portability workflows", () => {
  for (const id of ["add-assignment", "assignment-search", "assignment-filter", "routing-tester", "export-config", "import-config"]) {
    assert.match(options, new RegExp(`id=\\"${id}\\"`));
  }
  for (const message of [
    "webspaces:update",
    "webspaces:set-lock",
    "webspaces:duplicate",
    "webspaces:reset",
    "webspaces:delete",
    "webspaces:update-assignment",
    "webspaces:export-config",
    "webspaces:import-config"
  ]) {
    assert.match(optionsJs, new RegExp(message.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")));
  }
});

test("manager presents Standard as fixed unassigned-site destination", () => {
  assert.match(routingSettings, /Standard Webspace/);
  assert.match(routingSettings, /without a more specific rule open in the isolated Standard Webspace/);
  assert.doesNotMatch(routingSettings, /id=\\"default-behavior\\"/);
});

test("built-in provider identities use local logo assets on popup and manager surfaces", () => {
  for (const html of [popup, options]) {
    assert.match(html, /provider-logos\.css/);
    assert.match(html, /provider-logos\.js/);
  }
  for (const id of ["standard", "goreecloud", "google", "microsoft", "meta", "proton"]) {
    assert.match(providerLogos, new RegExp(`${id}.*icons/providers/${id}\\.svg`));
  }
});

test("Isolation Health uses a dedicated runtime-message namespace", () => {
  const message = "webspaces-health:get-isolation-health";
  assert.match(isolationHealthUi, new RegExp(message));
  assert.match(isolationHealthBackground, new RegExp(message));
  assert.doesNotMatch(isolationHealthUi, /webspaces:get-isolation-health/);
  assert.doesNotMatch(isolationHealthBackground, /webspaces:get-isolation-health/);
  assert.match(mainBackground, /startsWith\("webspaces:"\)/);
});
