// Checks the theme as Goodfellow will when someone installs it, so a release
// never fails there: its goodfellow-theme.json, the files it names, the blocks
// its header and footer use, what it loads, how readable its colors are, and
// that every part it gives classes is one a built-in block has.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { blocks } from "@goodfellow-cms/blocks";
import {
  contrastProblems,
  FOOTER_FILE,
  HEADER_FILE,
  parseThemeLayout,
  THEME_CSS_END,
  THEME_LAYOUT_BLOCKS,
  themeLoads,
  themeManifestSchema,
  themeUnknownBlocks,
} from "@goodfellow-cms/core";
import { blockParts } from "@goodfellow-cms/react";

const read = (file) => readFile(new URL(`../${file}`, import.meta.url), "utf8");
const pkg = JSON.parse(await read("package.json"));
const manifest = themeManifestSchema.parse(JSON.parse(await read("goodfellow-theme.json")));
const theme = {
  name: pkg.name,
  release: pkg.version,
  manifest,
  ...(manifest.css && { css: await read(manifest.css) }),
  ...(manifest.header && { header: parseThemeLayout(HEADER_FILE, await read(manifest.header)) }),
  ...(manifest.footer && { footer: parseThemeLayout(FOOTER_FILE, await read(manifest.footer)) }),
};

test("is named and described as a theme, for the Goodfellow releases it works with", () => {
  assert.match(pkg.name, /^(@[a-z0-9-]+\/)?goodfellow-theme-[a-z0-9-]+$/);
  assert.ok(pkg.keywords.includes("goodfellow-theme"));
  assert.ok(pkg.peerDependencies?.["@goodfellow-cms/core"], "needs a peerDependencies range on @goodfellow-cms/core");
  for (const file of ["goodfellow-theme.json", manifest.css, manifest.header, manifest.footer, manifest.image]) {
    if (file) assert.ok(pkg.files.includes(file), `package.json's files leaves out ${file}`);
  }
});

test("uses only blocks a theme's header and footer may use", () => {
  assert.deepEqual(themeUnknownBlocks(theme, THEME_LAYOUT_BLOCKS), []);
});

test("loads nothing from other sites", () => {
  assert.deepEqual(themeLoads(theme), []);
  assert.ok(!theme.css?.includes(THEME_CSS_END));
});

test("has colors text is easy to read on, light and dark", () => {
  assert.deepEqual(contrastProblems({ ...manifest.theme, darkMode: true }), []);
});

test("gives classes only to parts built-in blocks have", () => {
  const known = new Set(Object.values(blocks).flatMap((block) => Object.keys(blockParts(block))));
  const unknown = Object.keys(manifest.theme.parts ?? {}).filter((name) => !known.has(name));
  assert.deepEqual(unknown, []);
});
