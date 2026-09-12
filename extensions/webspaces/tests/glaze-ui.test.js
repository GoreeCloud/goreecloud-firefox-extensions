import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

const popup = read("ui/popup.html");
const options = read("ui/options.html");
const glaze = read("ui/glaze-webspaces.css");
const popupCss = read("ui/popup.css");
const optionsCss = read("ui/options.css");

test("Webspaces UI declares the current Glaze consumer target", () => {
  assert.match(popup, /data-glaze-version="1\.3"/);
  assert.match(options, /data-glaze-version="1\.3"/);
  assert.match(popup, /href="glaze-webspaces\.css"/);
  assert.match(options, /href="glaze-webspaces\.css"/);
});

test("Glaze adoption remains local and does not require remote UI assets", () => {
  for (const source of [popup, options, glaze, popupCss, optionsCss]) {
    assert.doesNotMatch(source, /https?:\/\//i);
  }
});

test("Glaze adoption preserves accessibility and degraded presentation fallbacks", () => {
  assert.match(glaze, /prefers-reduced-motion:\s*reduce/);
  assert.match(glaze, /prefers-reduced-transparency:\s*reduce/);
  assert.match(glaze, /forced-colors:\s*active/);
  assert.match(glaze, /@supports not \(\(backdrop-filter:/);
});

test("Webspace identity color is an accent rather than the only identity signal", () => {
  assert.match(popup, /id="current-webspace"/);
  assert.match(popup, /id="current-emblem"/);
  assert.match(options, /id="webspace-grid"/);
});
