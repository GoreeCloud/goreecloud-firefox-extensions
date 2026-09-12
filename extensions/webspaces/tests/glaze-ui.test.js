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
const manifest = JSON.parse(read("manifest.json"));

test("Webspaces UI declares the current Glaze consumer target", () => {
  assert.match(popup, /data-glaze-version="1\.3"/);
  assert.match(options, /data-glaze-version="1\.3"/);
  assert.match(popup, /href="glaze-webspaces\.css"/);
  assert.match(options, /href="glaze-webspaces\.css"/);
});

test("Glaze adoption remains local and does not require remote UI assets", () => {
  for (const source of [popup, options]) {
    assert.doesNotMatch(source, /(?:src|href)\s*=\s*["']https?:\/\//i);
  }
  for (const source of [glaze, popupCss, optionsCss]) {
    assert.doesNotMatch(source, /(?:@import\s+(?:url\()?|url\()\s*["']?https?:\/\//i);
  }
  assert.match(popup, /\.\.\/icons\/webspaces\.svg/);
  assert.match(options, /\.\.\/icons\/webspaces\.svg/);
});

test("manifest uses the first-party Webspaces identity mark", () => {
  assert.equal(manifest.action.default_icon, "icons/webspaces.svg");
  assert.equal(manifest.icons["48"], "icons/webspaces.svg");
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

test("popup hidden controls stay hidden when Glaze button styles apply", () => {
  assert.match(popup, /id="close-forget"[^>]*hidden/);
  assert.match(popupCss, /\[hidden\]\s*\{\s*display:\s*none\s*!important;\s*\}/);
});
