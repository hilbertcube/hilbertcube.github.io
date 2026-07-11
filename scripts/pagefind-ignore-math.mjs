/**
 * pagefind-ignore-math.mjs
 * ========================
 * Post-build step (runs after `astro build`, before `pagefind`).
 *
 * Display math is already excluded from the Pagefind index via
 * `--exclude-selectors ".equation, .mathjax-definition"`. This step handles the
 * remaining INLINE math ($...$ and \(...\)) woven through the prose, which would
 * otherwise index as noise ("frac", "nabla", single letters, …).
 *
 * It wraps each inline-math run in <span data-pagefind-ignore> so Pagefind skips
 * it. To stay safe against inconsistently-authored HTML it works as a tiny tag
 * tokenizer: it only rewrites TEXT runs (never markup) and skips the contents of
 * <pre>/<code>/<script>/<style> (shell `$USER`, `$(uname -r)`, …) and the already
 * excluded .equation / .mathjax-definition containers. MathJax still typesets the
 * math normally — the wrapper is invisible to the reader.
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const DIST = "dist";

function htmlFiles(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) {
      if (name === "pagefind") continue; // never touch the index itself
      out.push(...htmlFiles(p));
    } else if (name.endsWith(".html")) {
      out.push(p);
    }
  }
  return out;
}

// Wrap inline math inside a single HTML text run (no tags — `<`/`>` inside math
// are already entities, and display `$$` only lives in skipped containers).
function wrapInline(text) {
  return text
    .replace(/\\\([\s\S]*?\\\)/g, (m) => `<span data-pagefind-ignore>${m}</span>`)
    .replace(/\$[^$]+?\$/g, (m) => `<span data-pagefind-ignore>${m}</span>`);
}

// Rewrite the <main data-pagefind-body> region, skipping code + display-math subtrees.
function processMain(main) {
  const tokens = main.split(/(<[^>]+>)/); // alternating text / tag / text / tag …
  let skipUntil = null; // closing tag that ends the current skip region
  let out = "";
  for (const tok of tokens) {
    if (!tok) continue;
    const isTag = tok[0] === "<";
    if (skipUntil) {
      out += tok;
      if (isTag && tok.toLowerCase().startsWith(skipUntil)) skipUntil = null;
      continue;
    }
    if (isTag) {
      const t = tok.toLowerCase();
      if (t.startsWith("<pre")) skipUntil = "</pre";
      else if (t.startsWith("<code")) skipUntil = "</code";
      else if (t.startsWith("<script")) skipUntil = "</script";
      else if (t.startsWith("<style")) skipUntil = "</style";
      else if (/^<div class="equation"/.test(tok) || /^<div class="mathjax-definition"/.test(tok))
        skipUntil = "</div";
      out += tok;
    } else {
      out += wrapInline(tok);
    }
  }
  return out;
}

let pages = 0;
let spans = 0;
for (const file of htmlFiles(DIST)) {
  const html = readFileSync(file, "utf8");
  const main = html.match(/<main[^>]*data-pagefind-body[^>]*>[\s\S]*?<\/main>/);
  if (!main) continue;
  const processed = processMain(main[0]);
  if (processed === main[0]) continue;
  spans += (processed.match(/data-pagefind-ignore/g) || []).length;
  writeFileSync(file, html.replace(main[0], processed));
  pages++;
}
console.log(
  `pagefind-ignore-math: wrapped inline math on ${pages} page(s) (${spans} span(s)).`,
);
