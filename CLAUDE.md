# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A personal technical blog (math, programming, food) published to
[neumanncondition.com](https://neumanncondition.com) — an **Astro 5 static site**
(`output: 'static'`).

**Content is hand-written `.astro` pages, not Markdown**: each article/post is
`src/pages/{articles,posts}/<slug>/index.astro`, composed from the component library,
with its metadata in `src/data/pages.json`.

## Commands

| Command | Notes |
|---|---|
| `npm run dev` | Astro dev server. **No Pagefind index exists in dev** — the search bar silently falls back to a title-only match over `pages.json`. |
| `npm run build` | `scripts/lint-pages.mjs` → `astro build` → `scripts/pagefind-ignore-math.mjs` → `pagefind`. Output in `dist/` (gitignored). |
| `npm run preview` | Serves built `dist/`. Use `npm run build && npm run preview` to test anything search-, math-exclusion- or final-HTML-related. |
| `npm run check` | `scripts/lint-pages.mjs` (page-authoring rules below) → `astro check` (TypeScript/Astro diagnostics). This is the only "test" gate. |
| `npm run new [-- -t article -s <slug> --title "…"]` | Scaffolds the page in the canonical shape **and** its `pages.json` entry (prompts for anything missing). Both are required. |
| `python3 scripts/reindent-pages.py [--apply]` | Re-indents page markup by nesting (2 spaces) and lays out `<E>` equations one row per line; dry-run without `--apply`. Whitespace only. |
| `npm run build && npm run pdf [-- <slug>…]` | Exports articles to `pdf/<slug>.pdf` via headless Chromium (`scripts/export-pdf.mjs`); print layout is `src/assets/css/utils/_print.css`. |
| `./scripts/commit.sh "msg"` | pull `main` → `add .` → commit → push. |

There is no test suite (`npm test` is a stub). Verify with `npm run check` and
`npm run build`, which fails on lint, schema and alias errors.

Deployment is automatic: `.github/workflows/static-pages.yml` (Node 24) runs `astro check`, builds
and publishes `dist/` on every push to `main`; if either fails, nothing is deployed. It checks out with `fetch-depth: 0` because
`src/utils/repoStats.ts` reads commit history from git **at build time** — shallow
clones would produce wrong sidebar stats.

## Architecture

### One catalog, validated at build time

`src/data/pages.json` is the single source of truth for all page metadata, with three
arrays: `articles` (carry `image`), `posts`, and `others` (standing pages). `link` is
the primary key everywhere — `src/content.config.ts` derives each collection entry's
loader id from it.

`content.config.ts` wraps it in **Zod-validated** Astro collections:

- Read the catalog through `getCollection("articles" | "posts" | "others")` — **never**
  `fs.readFileSync`.
- A page's own entry is found from its URL via `getEntryMeta` / `resolveEntryMeta`
  (`src/utils/getEntryMeta.ts`), which match on `link` and **throw** if there is no match.
  `BaseLayout` (`<title>` from `shortTitle ?? title`, description, keywords = `topics`),
  `TopicTags`, `PageTitle` and `PubDate` do this internally, so an article or post passes
  no metadata props at all — `<BaseLayout toc>`.
- A missing/misspelled field fails the build, so a page can't silently vanish from the
  homepage, RSS and search.
- Collection order is array order (newest first; `npm run new` inserts at the top).
  Nothing re-sorts.

`src/pages/rss/feed.xml.ts` is a build-time endpoint over the same collections.

### BaseLayout renders the body before the sidebar

`src/layouts/BaseLayout.astro` calls `Astro.slots.render("default")` in its frontmatter,
runs `extractToc()` (`src/utils/toc.ts`) over the resulting HTML string, then injects it
with `<Fragment set:html={body} />`. That is what makes the sidebar TOC derive from the
page's real markup (`<section>` / `<h2>`–`<h4>`, with `data-toc="…"` / `data-toc="skip"`
overrides) with no list to maintain.

**The cost: a hydrated island (`client:*`) inside a page body would not survive the string
round-trip.** Every page here is static HTML — keep it that way.

The same string pass numbers theorems, lemmas, definitions, problems and captioned
figures/tables (`numberBlocks()` in `src/utils/numbering.ts` writes `data-number`, which
the CSS labels read) and resolves `<Ref to="id" />` into "Lemma 3" links — so prose never
types a number, and a dangling `Ref` fails the build. Equations are still numbered
client-side by `katex-render.js`.

`BaseLayout` also appends a shuffled "More Articles" strip on any `/articles/*` path, and
marks `<main data-pagefind-body>`, which is what makes new pages searchable automatically.

### Client JS: hoisted component scripts, not a global bundle

Behaviour lives in the owning component's bare `<script>` (Astro bundles and hoists it).
`public/assets/js/` holds only what has no owning component: `katex-render.js` (loaded on
every page by `BaseLayout`) and `scripts.js` (smooth anchor scroll, new-window body links).

**Astro decides which pages a hoisted script lands on from the module graph, not from
whether the markup rendered.** Anything imported by `BaseLayout` therefore ships site-wide,
so every such script must return early when its markup is absent. Follow that pattern.

Top-bar behaviour is split across `src/components/site/topbar/{nav,theme,settings,search,share}.ts`.

### Code is highlighted at build time (Shiki)

`CodeBlock`, `CodeBox` and `ShellScript` run their listing through Shiki (`src/utils/highlight.ts`)
at build time — pages ship coloured HTML and carry no highlighting script or language list.
`language` is a Shiki language id; an unknown one fails the build. Every block is rendered
in **all** the themes in `src/utils/codeThemes.ts` (one `--shiki-<id>` custom property per
theme per token), and generated CSS picks one via `data-code-light` / `data-code-dark` on
`<html>`. Each theme adds to every page's HTML size: keep the list short.

### Math and search are coupled

KaTeX is self-hosted and loaded on **every** page by `BaseLayout` — a page never adds a math
script. Shared macros (`\R`, `\N`, `\pd`, …) live in the `macros` object at the top of
`public/assets/js/katex-render.js`, not per page.

The build's search step is why the math *authoring rules* matter:

1. **All display math must be wrapped in `<E>`** (`<div class="equation">`), which the build
   excludes via `pagefind --exclude-selectors ".equation"`. A bare
   `$$…$$` dumps `\frac`, `\sum`, `\begin` straight into search results.
2. **Inline math needs nothing** — `scripts/pagefind-ignore-math.mjs` wraps every inline run
   in `<span data-pagefind-ignore>` post-build. It tokenizes tags rather than pattern-matching
   text, and skips `<pre>`/`<code>`/`<script>`/`<style>`, so shell `$USER` is never mistaken
   for math.

LaTeX must reach components as a raw template literal — `{tex`…`}` from
`@components/math/tex.astro` — because Astro eats backslashes in quoted attributes.
`@components/code/raw.astro` is the same trick for code blocks.

## Conventions

- **Always import through the path aliases** (`@layouts`, `@components`, `@utils`, `@data`,
  `@assets` — see `tsconfig.json`), never relative paths.
- Don't wrap a page body in `<div class="content-grid">` — `BaseLayout` puts the default
  slot in that column itself (full-width content above it goes in the `hero` slot, as the
  homepage `<HeroBanner slot="hero" art="gradient" />` does). Don't write `id`s on `<section>`s:
  `BaseLayout` generates one at build time from each section's heading (or `data-toc` label)
  via `assignSectionIds()` in `src/utils/toc.ts` — "Data Analysis" → `#data-analysis`. The TOC
  and search deep links anchor to those, so rewording a heading changes its URL fragment.
- Body images go through `<Figure>`, banners through `<FrontImage>`. Don't hand-roll `<img>`
  sizing. Their files live in the page's own folder under `public/` (`public/articles/<slug>/`)
  and `src` is written relative to it — `src="plot.webp"` (`src/utils/pageAsset.ts`).
- References go through `<References />`, which renders the `_references.ts` sitting next to
  the page's `index.astro` (entries typed per `type` in `src/utils/references.ts`) — never a
  hand-written `<ol class="reference">`. The `_` prefix keeps Astro from routing the file.
- Tables go through `<Table>`, which emits the `.table-wrapper` / `.p-table` pair — a
  hand-written table without the wrapper overflows on mobile.
  Inline code goes through `<C>`. Both styles are scoped to their component, so the bare
  classes don't work in page markup.
- Body links are plain `<a href="…">` — no class. Inside `.content-grid`, an unclassed `<a>`
  gets the link colour, stays on one line and opens in a new window (`_typography.css` +
  `scripts.js`) — except a `href="#…"` jump link, which smooth-scrolls in place; add `class="wrap"` for a long label that should break. Any other class opts
  the link out, so buttons and cards keep their own styling.
- Lists work the same way: a plain `<ul>`/`<ol>` of plain `<li>` in the body gets the list
  spacing (`_content.css`) — no class needed.
- Code blocks use the `code/` components, not raw `<pre>`. Write every listing with **`is:raw`**
  (`<CodeBlock language="cpp" is:raw>`), indented to match the page and with `<`/`{` written
  literally: a listing starting on the line after the tag is dedented (`dedent()` in
  `src/utils/highlight.ts`). The listing is plain text — entities and HTML tags are not
  interpreted — so there is no non-`is:raw` form.
- CSS lives in `src/assets/css/`, bundled through `main.css` and imported once by `BaseLayout`.
  Page-specific CSS goes in the `head` slot; component-specific rules in that component's
  scoped `<style>`. Use the existing `--var` custom properties — the site is theme-aware via a
  `dark-mode` class applied before first paint, and readers can override font/size/code theme
  at runtime, so don't fight them with `!important`.

- `scripts/lint-pages.mjs` enforces the markup rules above (raw `<table>`/`<pre>`/`<code>`/`<img>`,
  hand-typed "Lemma 3" / "Fig. 2" instead of `<Ref>`,
  `$$`/`\begin` outside `<E>`, `<section id>`, `content-grid`, listings without `is:raw`,
  relative imports). A page opts out of one rule with a frontmatter line
  `// lint-allow: <rule> — reason`; use it only for a genuine exception.

## Detailed docs

Read the relevant one before non-trivial changes:

| Doc | Covers |
|---|---|
| `docs/DEVELOPMENT.md` | Workflow, project layout, creating a page, data model, styling |
| `docs/COMPONENTS.md` | Every component, its props, and its gotchas (has a cheat-sheet + symptom table) |
| `docs/SEARCH.md` | Pagefind pipeline, snippet building, on-page highlight/scroll |
| `docs/AUTOMATION.md` | The helper scripts in `scripts/` |
| `docs/CSS-ORGANIZATION.md` | CSS file layout |

Keep `README.md`'s Change Log updated for important user-visible changes; it is the
project's history.

Docs and code comments describe only what exists **now**, concisely. When a feature is
removed, delete its documentation rather than noting the removal.
