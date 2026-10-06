# Automation Scripts

The helper scripts in `scripts/`; `npm` commands are in [`DEVELOPMENT.md`](DEVELOPMENT.md).

| Script | Runs | Purpose |
|---|---|---|
| [`new-article.mjs`](#new-articlemjs) | `npm run new` | Scaffold a page and its `pages.json` entry |
| [`reindent-pages.py`](#reindent-pagespy) | by hand | Re-indent page markup; lay out `<E>` equations |
| [`commit.sh`](#commitsh) | by hand | Pull, stage everything, commit, push |
| [`pagefind-ignore-math.mjs`](#pagefind-ignore-mathmjs) | `npm run build` | Hide inline math from the search index |
| [`export-pdf.mjs`](#export-pdfmjs) | `npm run pdf` | Export articles to PDF |

---

## new-article.mjs

```bash
npm run new                                                # prompts for everything
npm run new -- -t article -s my-slug --title "My Title" --topics "C++, Math"
npm run new -- --type post --slug my-slug --description "…" --references
```

Creates `src/pages/<type>s/<slug>/index.astro` in the
[`COMPONENTS.md` §8](COMPONENTS.md#8-cheat-sheet) shape, an empty `public/<type>s/<slug>/`
for images, and the `pages.json` entry (today's `pubDate`) at the top. `--references`
adds an empty `_references.ts` and `<References />`. Refuses an existing folder or `link`.

An article's entry gets `"image": "<slug>.webp"` — the homepage card, served from
`public/media/Images/` — and its page a `<FrontImage>` at `public/articles/<slug>/banner.webp`.

## reindent-pages.py

```bash
python3 scripts/reindent-pages.py                 # dry run
python3 scripts/reindent-pages.py --apply         # every page that uses BaseLayout
python3 scripts/reindent-pages.py src/pages/articles/my-slug/index.astro --apply
```

Whitespace only, never the frontmatter: 2 spaces per nesting level, with multi-line
tags, `{…}`, `<style>`/`<script>` and `is:raw` listings moved as a block. Lays out
`<E>` equations one row per line (skipped if they contain a `%` comment). Pages
whose tags don't balance are reported as `SKIP`.

## commit.sh

```bash
./scripts/commit.sh "Your commit message"
```

Pull `main` → `git add .` → commit → push (which deploys). Stages **everything**.

## pagefind-ignore-math.mjs

Middle step of `npm run build` ([`SEARCH.md` §4](SEARCH.md#4-excluding-inline-math)).

## export-pdf.mjs

```bash
npm run build && npm run pdf                          # every article
npm run pdf -- valgrind-debug-and-profile             # just these slugs
```

Serves `dist/`, opens each article in headless Chromium (Playwright), waits for
KaTeX, fonts and images, and prints `pdf/<slug>.pdf` (gitignored) in light mode with
heading bookmarks. Needs `npx playwright install chromium` once.

The layout is the site's print stylesheet, `src/assets/css/utils/_print.css`, shared
with the "Save as PDF" button. Blocks marked `.print-keep` (equations, figures,
tables, code up to 25 lines — set by `printKeep()` in `src/utils/highlight.ts`)
aren't split across pages.
