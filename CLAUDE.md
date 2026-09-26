# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A personal technical blog (math, programming, food) published to
[neumanncondition.com](https://neumanncondition.com) — an **Astro 5 static site**
(`output: 'static'`). It began as a hand-built HTML/CSS/vanilla-JS site and was
migrated to Astro; some of that lineage still shows in `public/assets/js/`.

**Content is authored as hand-written `.astro` pages, not Markdown.** There is no
content-collection-of-Markdown model here: each article/post is
`src/pages/articles/<slug>/index.astro` composed from the component library, and
its metadata lives separately in `src/data/pages.json`.

## Commands

| Command | Notes |
|---|---|
| `npm run dev` | Astro dev server. **No Pagefind index exists in dev** — the search bar silently falls back to a title-only match over `pages.json`. |
| `npm run build` | `astro build` → `scripts/pagefind-ignore-math.mjs` → `pagefind`. Output in `dist/` (gitignored). |
| `npm run preview` | Serves built `dist/`. Use `npm run build && npm run preview` to test anything search-, math-exclusion- or final-HTML-related. |
| `npm run check` | `astro check` — TypeScript/Astro diagnostics. This is the only "test" gate. |
| `./scripts/new-article.sh -t article -s <slug> --title "…"` | Scaffolds the page **and** the `pages.json` entry. Both are required. |
| `./scripts/commit.sh "msg"` | pull `main` → `add .` → commit → push. |

`npm test` is an unimplemented stub — there is no test suite. Verification is
`npm run check` plus `npm run build`, which fails loudly on schema and alias errors.

Deployment is automatic: `.github/workflows/static-pages.yml` builds and publishes
`dist/` on every push to `main`. It checks out with `fetch-depth: 0` because
`src/utils/repoStats.ts` reads commit history from git **at build time** — shallow
clones would produce wrong sidebar stats.

## Architecture

### One catalog, validated at build time

`src/data/pages.json` is the single source of truth for all page metadata, with three
arrays: `articles` (carry `image`), `posts`, and `others` (standing pages). `link` is
the primary key everywhere — `src/content.config.ts` derives each collection entry's
loader id from it.

`content.config.ts` wraps that JSON in typed, **Zod-validated** Astro collections.
Consequences worth internalising:

- Read the catalog through `getCollection("articles" | "posts" | "others")` — **never**
  `fs.readFileSync`.
- A page looks up **its own** entry via `getEntryMeta(collection, Astro.url.pathname)`,
  which matches on `link` and **throws** if there is no match. `TopicTags`, `PageTitle`
  and `PubDate` do this internally, so pages usually pass no props at all.
- A missing/misspelled field fails the build with a Zod error. This is deliberate: it
  stops a page from silently vanishing from the homepage, RSS and search.
- Collection order is array order (newest first; `new-article.sh` inserts at the top).
  Nothing re-sorts.

`src/pages/rss/feed.xml.ts` is a build-time endpoint over those same collections, so
the feed cannot drift from the site. There is no RSS script to run.

### BaseLayout renders the body before the sidebar

`src/layouts/BaseLayout.astro` calls `Astro.slots.render("default")` in its frontmatter,
runs `extractToc()` (`src/utils/toc.ts`) over the resulting HTML string, then injects it
with `<Fragment set:html={body} />`. That is what makes the sidebar TOC derive from the
page's real markup (`<section>` / `<h2>` / `<h3>`, with `data-toc="…"` / `data-toc="skip"`
overrides) with no list to maintain.

**The cost: a hydrated island (`client:*`) inside a page body would not survive the string
round-trip.** Every page here is static HTML — keep it that way.

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
`language` is a Shiki language id; an unknown one fails the build. Every block is rendered in **all** the themes in `src/utils/codeThemes.ts` at once
(one `--shiki-<id>` custom property per theme per token), and CSS generated from that same list
picks one via `data-code-light` / `data-code-dark` on `<html>` — so switching is instant. Each
theme adds to every page's HTML size: keep the list short.

### Math and search are coupled

KaTeX is self-hosted and loaded on **every** page by `BaseLayout` — a page never adds a math
script. Shared macros (`\R`, `\N`, `\pd`, …) live in the `macros` object at the top of
`public/assets/js/katex-render.js`, not per page.

The build's search step is why the math *authoring rules* matter:

1. **All display math must be wrapped in `<E>`** (`<div class="equation">`), which the build
   excludes via `pagefind --exclude-selectors ".equation, .mathjax-definition"`. A bare
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
- Wrap a page body in a single `<div class="content-grid">`; give every `<section>` an `id`
  (the TOC anchors to it and search results deep-link into it).
- Body images go through `<Figure>` (files in `public/articles/<slug>/`), banners through
  `<FrontImage>`. Don't hand-roll `<img>` sizing.
- Tables go through `<Table>`, which emits the `.table-wrapper` / `.p-table` pair — a
  hand-written table without the wrapper overflows on mobile and nothing catches it.
  Inline code goes through `<C>`; both styles are scoped to their component, so the bare
  classes no longer work in page markup.
- Body links are plain `<a href="…">` — no class. Inside `.content-grid`, an unclassed `<a>`
  gets the link colour, stays on one line and opens in a new window (`_typography.css` +
  `scripts.js`); add `class="wrap"` for a long label that should break. Any other class opts
  the link out, so buttons and cards keep their own styling.
- Lists work the same way: a plain `<ul>`/`<ol>` of plain `<li>` in the body gets the list
  spacing (`_content.css`) — no `class="bullet"` (removed).
- Code blocks use the `code/` components, not raw `<pre>`. Write new listings with **`is:raw`**
  (`<CodeBlock language="cpp" is:raw>`), indented to match the page and with `<`/`{` written
  literally: a listing starting on the line after the tag is dedented (`dedent()` in
  `src/utils/highlight.ts`). Without `is:raw`, the HTML compressor eats indentation touching
  the tag, so plain children must start at column 0 with `<`/`{` escaped.
- CSS lives in `src/assets/css/`, bundled through `main.css` and imported once by `BaseLayout`.
  Page-specific CSS goes in the `head` slot; component-specific rules in that component's
  scoped `<style>`. Use the existing `--var` custom properties — the site is theme-aware via a
  `dark-mode` class applied before first paint, and readers can override font/size/code theme
  at runtime, so don't fight them with `!important`.
- The `new-article.sh` template **predates the component library**. After scaffolding, replace
  its header with the canonical shape from `docs/COMPONENTS.md` §8 (aliases, `getEntryMeta`,
  `<TopicTags>/<PageTitle>/<PubDate>`, no hand-written "More Articles", no MathJax script).

## Detailed docs

This repo carries unusually thorough documentation — read the relevant one before making
non-trivial changes:

| Doc | Covers |
|---|---|
| `docs/DEVELOPMENT.md` | Workflow, project layout, creating a page, data model, styling |
| `docs/COMPONENTS.md` | Every component, its props, and its gotchas (has a cheat-sheet + symptom table) |
| `docs/SEARCH.md` | Pagefind pipeline, snippet building, on-page highlight/scroll |
| `docs/AUTOMATION.md` | The helper scripts in `scripts/` |
| `src/assets/css/CSS-ORGANIZATION.md` | CSS file layout |

One live inconsistency they can't fix themselves: `scripts/new-article.sh` still emits
`<script is:inline src="/assets/js/blogpage-setting.js">`, and that file no longer exists.
Delete that line from any scaffolded page (`docs/DEVELOPMENT.md` §3 lists the rest of the
scaffolder's outdated output).

Keep `README.md`'s Change Log updated for user-visible changes; it is the project's history.
