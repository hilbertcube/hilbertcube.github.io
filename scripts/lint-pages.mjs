#!/usr/bin/env node
/**
 * lint-pages.mjs
 * ==============
 * Enforce the page-authoring rules in CLAUDE.md / docs/COMPONENTS.md that the
 * build can't: each one is a mistake that renders without error but breaks
 * search, mobile layout, styling or the generated ids. Runs first in
 * `npm run check` and `npm run build`.
 *
 * Scans src/pages/**\/*.astro (not src/pages/test/). Contents of <style>,
 * <script>, comments, `is:raw` listings and template literals are skipped, so a
 * rule never fires on code or LaTeX that merely mentions a tag.
 *
 * A page opts out of a rule with a frontmatter line naming it and why:
 *   // lint-allow: img — thumbnail gallery for the lightbox, not figures
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const PAGES = path.join(ROOT, "src/pages");
const SKIP_DIRS = new Set([path.join(PAGES, "test")]);

const CODE_COMPONENTS = "CodeBlock|CodeBox|ShellScript|Sample";

/** Body rules: matched against the masked markup. */
const RULES = [
  {
    id: "display-math",
    re: /\$\$(?:[\s\S]*?\$\$)?/g,
    msg: "bare $$…$$ — wrap display math in <E>{tex`…`}</E> (raw LaTeX leaks into search)",
  },
  {
    id: "display-math",
    re: /\\begin\{/g,
    msg: "\\begin{…} outside <E>{tex`…`}</E> — raw LaTeX leaks into search",
  },
  { id: "table", re: /<table\b/g, msg: "raw <table> — use <Table> (adds the mobile scroll wrapper)" },
  { id: "pre", re: /<pre\b/g, msg: "raw <pre> — use <CodeBlock>/<CodeBox>/<ShellScript>/<Sample> with is:raw" },
  { id: "code", re: /<code\b/g, msg: "raw <code> — use <C> for inline code" },
  { id: "img", re: /<img\b/g, msg: "raw <img> — use <Figure> (or <FrontImage> for the banner)" },
  {
    id: "section-id",
    re: /<section\b[^>]*\sid=/g,
    msg: "id on <section> — ids are generated from the heading (or data-toc)",
  },
  {
    id: "content-grid",
    re: /class="[^"]*\bcontent-grid\b/g,
    msg: "content-grid wrapper — BaseLayout provides the column (use the hero slot for full width)",
  },
  {
    id: "references",
    re: /<ol\s+class="reference"/g,
    msg: "hand-written reference list — use <References /> with _references.ts",
  },
  {
    id: "hand-ref",
    re: /\b(?:Theorem|Lemma|Definition|Problem|Figure|Fig\.|Table)s?\s+\(?\d+\b/g,
    msg: 'hand-typed number — cite the block with <Ref to="its-id" /> so it follows renumbering',
  },
  {
    id: "is-raw",
    re: new RegExp(`<(?:${CODE_COMPONENTS})\\b(?![^>]*\\bis:raw\\b)[^>]*>`, "g"),
    msg: "code listing without is:raw — indentation, < and { get mangled",
  },
];

/** Frontmatter rules. */
const FM_RULES = [
  {
    id: "alias-import",
    re: /\bfrom\s+["']\.\.?\//g,
    msg: "relative import — use @layouts / @components / @utils / @data / @assets",
  },
];

/** Blank out [start, end) but keep newlines, so offsets and line numbers hold. */
const blank = (s, start, end) =>
  s.slice(0, start) + s.slice(start, end).replace(/[^\n]/g, " ") + s.slice(end);

function maskBody(src) {
  let s = src;
  const maskAll = (re) => {
    for (const m of [...s.matchAll(re)]) s = blank(s, m.index, m.index + m[0].length);
  };
  maskAll(/<!--[\s\S]*?-->/g);
  maskAll(/\{\/\*[\s\S]*?\*\/\}/g);
  maskAll(/<(style|script)\b[^>]*>[\s\S]*?<\/\1>/g);
  // `is:raw` listings: keep the opening tag (the is:raw rule reads it), mask the content.
  for (const m of [...s.matchAll(/<([A-Za-z][\w.-]*)\b[^>]*\bis:raw\b[^>]*>/g)]) {
    const start = m.index + m[0].length;
    const close = s.indexOf(`</${m[1]}>`, start);
    if (close !== -1) s = blank(s, start, close);
  }
  maskAll(/`(?:\\[\s\S]|[^`\\])*`/g);
  return s;
}

function lintFile(file) {
  const src = fs.readFileSync(file, "utf8");
  const fm = src.match(/^---\n([\s\S]*?)\n---\n/);
  const fmText = fm ? fm[1] : "";
  const bodyOffset = fm ? fm[0].length : 0;

  const allowed = new Set(
    [...fmText.matchAll(/\/\/\s*lint-allow:\s*([\w-]+(?:\s*,\s*[\w-]+)*)/g)].flatMap((m) =>
      m[1].split(",").map((r) => r.trim()),
    ),
  );

  const lineOf = (offset) => src.slice(0, offset).split("\n").length;
  const problems = [];
  const run = (rules, text, base) => {
    for (const { id, re, msg } of rules) {
      if (allowed.has(id)) continue;
      for (const m of text.matchAll(re)) problems.push({ line: lineOf(base + m.index), id, msg });
    }
  };

  // Frontmatter starts after the opening "---\n".
  run(FM_RULES, fmText, 4);
  run(RULES, maskBody(src.slice(bodyOffset)), bodyOffset);
  return problems.sort((a, b) => a.line - b.line);
}

function* walk(dir) {
  if (SKIP_DIRS.has(dir)) return;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else if (e.name.endsWith(".astro")) yield p;
  }
}

let count = 0;
for (const file of walk(PAGES)) {
  for (const { line, id, msg } of lintFile(file)) {
    console.error(`${path.relative(ROOT, file)}:${line}  ${msg}  [${id}]`);
    count++;
  }
}

if (count) {
  console.error(`\n✗ ${count} page-authoring problem${count === 1 ? "" : "s"}` +
    ` (opt a page out with "// lint-allow: <rule> — reason" in its frontmatter)`);
  process.exit(1);
}
console.log("✓ pages follow the authoring rules");
