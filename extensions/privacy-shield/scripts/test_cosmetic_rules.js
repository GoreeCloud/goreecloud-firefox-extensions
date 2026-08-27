"use strict";

const assert = require("node:assert/strict");
require("../src/cosmetic-rules.js");

const R = globalThis.PrivacyShieldCosmeticRules;
const text = [
  "||tracker.example^",
  "github.com##header .AppHeader-logo",
  "example.com##.sponsored",
  "github.com##.HeaderMenu-link"
].join("\n");

const rules = R.list(text);
assert.equal(rules.length, 3);
assert.equal(rules[0].domain, "github.com");
assert.equal(rules[0].selector, "header .AppHeader-logo");

const undo = R.undoLast(text, "www.github.com");
assert.equal(undo.removed, true);
assert.equal(undo.item.selector, ".HeaderMenu-link");
assert.equal(undo.text.includes("github.com##.HeaderMenu-link"), false);
assert.equal(undo.text.includes("github.com##header .AppHeader-logo"), true);

const restore = R.removeAt(undo.text, 1, "github.com##header .AppHeader-logo");
assert.equal(restore.removed, true);
assert.equal(restore.text.includes("AppHeader-logo"), false);

console.log("Privacy Shield cosmetic recovery tests passed.");
