# Automation Scripts

The helper scripts in `scripts/`; `npm` commands are in
[`DEVELOPMENT.md`](DEVELOPMENT.md). The TOC and RSS feed need no script — both
are generated at build time.

| Script | Runs | Purpose |
|---|---|---|
| [`new-article.sh`](#new-articlesh) | by hand | Scaffold a page and its `pages.json` entry |
| [`reindent-pages.py`](#reindent-pagespy) | by hand | Re-indent page markup; lay out `<E>` equations |
| [`commit.sh`](#commitsh) | by hand | Pull, stage everything, commit, push |
| [`pagefind-ignore-math.mjs`](#pagefind-ignore-mathmjs) | `npm run build` | Hide inline math from the search index |
| [`export-pdf.mjs`](#export-pdfmjs) | `npm run pdf` | Export articles to PDF with headless Chromium |
| [`convert-code-blocks.py`](#convert-code-blockspy) | by hand | Legacy: convert raw code containers to components |

---

## new-article.sh

```bash
./scripts/new-article.sh                                   # interactive
./scripts/new-article.sh -t article -s my-slug --title "My Title"
./scripts/new-article.sh --type post --slug my-slug --title "My Title" --description "…"
```

Creates the page **and** inserts its `pages.json` entry (with today's `pubDate`)
at the top. Its template is outdated — see
[`DEVELOPMENT.md` §3](DEVELOPMENT.md#3-creating-an-article-or-post) for what to fix.

## reindent-pages.py

```bash
python3 scripts/reindent-pages.py                 # dry run: list pages that would change
python3 scripts/reindent-pages.py --apply         # every page that uses BaseLayout
python3 scripts/reindent-pages.py src/pages/articles/my-slug/index.astro --apply
```

Whitespace only, never the frontmatter. Indents the template 2 spaces per
nesting level; multi-line tags, `{…}`, `<style>`/`<script>` and `is:raw`
listings move as a block, while listings without `is:raw` and `<pre>` stay
byte-for-byte. Pages whose tags don't balance are reported as `SKIP`.

It also lays out `<E>` equations: `\begin`/`\end` on their own lines, one row
per line, nested environments one level deeper. Equations containing a `%`
comment are left alone.

## commit.sh

```bash
./scripts/commit.sh "Your commit message"
```

Pull `main` → `git add .` → commit → push (which deploys). It stages
**everything**, so check `git status` first.

## pagefind-ignore-math.mjs

The middle step of `npm run build`: hides inline math from the search index
([`SEARCH.md` §4](SEARCH.md#4-excluding-inline-math)).

## export-pdf.mjs

```bash
npm run build && npm run pdf                          # every article
npm run pdf -- valgrind-debug-and-profile             # just these slugs
```

Serves `dist/` locally, opens each article in headless Chromium (Playwright),
waits for KaTeX, fonts and lazy images, then prints it to `pdf/<slug>.pdf`
(gitignored): vector text, PDF bookmarks from the headings, always in light mode. Needs Chromium once: `npx playwright install chromium`.

The layout is not the script's: it is the site's own print styling, which the
"Save as PDF" button readers see beside each date (`SavePdf`) uses too. That is
the `@media print` block in `src/assets/css/utils/_print.css` (author name atop
every page and page numbers below it, via `@page` margin boxes, which only
Chromium renders; hides the site chrome; keeps equations, figures, tables and code blocks of up to 25 lines whole
via `.print-keep`, set at build time by `printKeep()` in `src/utils/highlight.ts`),
plus TabBox's own rule that prints every pane under its tab label.

## convert-code-blocks.py

```bash
python3 scripts/convert-code-blocks.py <file>            # dry run, prints a diff
python3 scripts/convert-code-blocks.py <file> --apply
```

Legacy: rewrites pre-Astro `<div class="code-container">` blocks into
`<ShellScript>` / `<CodeBlock>`. Every page is already converted. It only
recognises the one legacy `style` string; anything else must be done by hand.
