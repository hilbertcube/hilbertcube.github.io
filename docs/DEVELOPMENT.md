# Development Guide

A practical guide to working on this site. It's an [Astro](https://astro.build) 5
static site: content is authored as hand-written `.astro` pages (not Markdown),
math is typeset by self-hosted KaTeX, and search is powered by Pagefind.

This guide covers the **workflow** — commands, project layout, creating a page,
the data model, and how content reaches search and RSS. Its companions:

| Doc | Covers |
|---|---|
| [`COMPONENTS.md`](COMPONENTS.md) | Every component, its props, and its gotchas |
| [`SEARCH.md`](SEARCH.md) | How search is built, indexed and served |
| [`AUTOMATION.md`](AUTOMATION.md) | The helper scripts in `scripts/` |

---

## 1. Commands — `dev` vs `build` vs `preview`

| Command | What it does | When to use |
|---|---|---|
| `npm run dev` | Astro dev server with hot reload. **No search index.** | Day-to-day writing & styling. Fast. |
| `npm run build` | `astro build` → `pagefind-ignore-math.mjs` → `pagefind`. Outputs `dist/`. | Before deploy, and whenever you need to test **real search**. |
| `npm run preview` | Serves the built `dist/` locally. | After `build`, to test the production output (search, final HTML). |

**Rule of thumb:**

- Writing content or CSS → `npm run dev`.
- Testing search, math exclusion, or anything that depends on the built
  output → `npm run build && npm run preview`.
- In `dev`, the search bar falls back to a **title-only** match over
  `articles.json` (see §6) because Pagefind's index only exists after a build.

Deployment is automatic: `.github/workflows/static-pages.yml` runs `npm ci &&
npm run build` on every push to `main` and publishes `dist/` (including
`dist/pagefind/`). `dist/` is gitignored — never commit it.

---

## 2. Project structure

```
src/
  layouts/BaseLayout.astro     Shared shell for every page (head, nav, sidebar, footer)
  pages/
    articles/<slug>/index.astro  One article per folder
    posts/<slug>/index.astro     One post per folder
    rss/feed.xml.ts              Build-time RSS endpoint
    about/, privacy-policy/, template/, test/, index.astro, 404.astro
  components/                  Grouped by role — see COMPONENTS.md
    site/  article/  listings/  math/  code/  ui/
  utils/                       Build-time helpers shared by components and pages
  content.config.ts            Typed, validated data collections over articles.json
  assets/
    css/                       Styles (bundled once via main.css)
    images/                    Images imported through astro:assets (logo, banner)
public/
  assets/json/articles.json    Catalog of all articles/posts (source of truth)
  assets/js/katex-render.js    KaTeX driver: macros, display math, numbering
  assets/js/scripts.js         Image lightbox + smooth in-page scrolling
  assets/js/blogpage-setting.js  Opens <Solution> blocks, lazy-loads images
  katex/                       Self-hosted KaTeX library and fonts
  articles/<slug>/             Article body images
  media/Images/                Card thumbnail images
scripts/                       Automation (see AUTOMATION.md)
```

**Path aliases** (from `tsconfig.json`) — prefer these over relative paths:

| Alias | Resolves to |
|---|---|
| `@layouts/*` | `src/layouts/*` |
| `@components/*` | `src/components/*` |
| `@utils/*` | `src/utils/*` |
| `@assets/*` | `src/assets/*` |

**Where client JS lives.** Behaviour tied to a component ships in that
component's own `<script>` (nav, dark mode, settings, search, share, copy
buttons, TOC highlighting, the banner canvas). `public/assets/js/scripts.js`
holds only the two site-wide behaviours that have no owning component — the
image lightbox and smooth anchor scrolling.

---

## 3. Creating an article or post

Use the scaffolder — don't hand-create folders:

```bash
./scripts/new-article.sh --type article --slug "my-slug" --title "My Title"
./scripts/new-article.sh --type post --slug "my-slug" --title "My Title"
```

It creates `src/pages/<type>/<slug>/index.astro` **and** inserts an entry at the
top of `public/assets/json/articles.json`. Both are required — the page renders
the prose; the JSON entry drives homepage cards, RSS, search and "More
Articles". A page without a JSON entry won't appear in those lists, and a
malformed entry fails the build (see §4).

> ⚠️ **The scaffolder's template predates the component library** and is due for
> an update. What it emits still works, but it is not the shape any current page
> uses. After scaffolding, replace its header with the canonical one — the
> skeleton in [`COMPONENTS.md` §8](COMPONENTS.md#8-cheat-sheet) is the reference.
> Specifically:
>
> | Scaffold emits | Should be |
> |---|---|
> | `import … from "../../../layouts/…"` | the `@layouts` / `@components` aliases |
> | `<div class="topic">`, `<h1 class="title">`, `<div class="date">` | `<TopicTags>`, `<PageTitle>`, `<PubDate>` fed from `getEntryMeta()` |
> | a hand-written "More Articles" `<section>` | nothing — `BaseLayout` adds it to every article automatically |
> | `<script is:inline src="/assets/js/blogpage-setting.js">` | `<Scripts use={["blog-setting", …]} />` |
> | a MathJax CDN `<script>` | nothing — KaTeX loads on every page (§5) |

Then: fill in the content, drop images in `public/articles/<slug>/`, and
reference them as `/articles/<slug>/<file>.webp` through `<Figure>`.

**Page conventions** beyond the components themselves:

- Wrap the body in a single `<div class="content-grid">`.
- Give each `<section>` an `id` — that is what the Table of Contents anchors to
  (§3.1) and what search results deep-link into.
- Page-specific CSS goes in the `head` slot; page-specific scripts go through
  `<Scripts>` in the `scripts` slot.

### 3.1 Table of Contents

Pass `toc` to `BaseLayout` and the sidebar TOC is built from the page's own
markup at build time, so adding a section is all it takes to add an entry —
there is no list to keep in sync.

Every `<h2>`/`<h3>` becomes an entry, anchored to its own `id` or to the `id` of
the innermost enclosing `<section>` that no earlier heading has claimed. **A
heading with no anchor is skipped** — a TOC row that can't be linked is dead
weight. Nesting follows heading level (`<h3>` under the preceding `<h2>`), not
`<section>` nesting.

```astro
<BaseLayout title="…" toc>            <!-- or toc={{ maxLevel: 4 }} for <h4> too -->
  <section id="analysis">
    <h2>Data Analysis</h2>            <!-- → "Data Analysis" → #analysis -->
    <h3 id="graph">Linearity</h3>     <!-- → nested "Linearity" → #graph -->
  </section>
</BaseLayout>
```

Overrides, on a heading or on its `<section>`:

- `data-toc="Short label"` — use this text instead of the heading's. On a
  `<section>` with no heading of its own (e.g. one wrapping a `<Problem>`), it is
  what puts the section in the TOC at all.
- `data-toc="skip"` — leave it out.

Only *rendered* HTML is inspected, so headings produced by components or `.map()`
loops are picked up like any other, and commented-out markup is not. The
extractor lives in `src/utils/toc.ts`.

---

## 4. Data model — `articles.json` + typed collections

`public/assets/json/articles.json` is the single catalog. It has three arrays:
`articles` (carry `id`, `image`), `posts` (carry `pid`), and `others`
(resources such as About and the license).

It is wrapped by typed, **Zod-validated** collections in `src/content.config.ts`.
Read it through the content API — **never** `fs.readFileSync`.

A page looking up **its own** entry should use `getEntryMeta`, which matches
`Astro.url.pathname` against `data.link` and throws if there is no match, so a
page and its catalog entry can't drift apart silently:

```astro
---
import { getEntryMeta } from "@utils/getEntryMeta";
const meta = await getEntryMeta("articles", Astro.url.pathname);
---
<PageTitle title={meta.title} />
```

For everything else (listings, feeds, panels) use `getCollection("articles" |
"posts" | "others")` directly.

**Rules**

- Every entry needs `title`, `link`, `topics[]`, `description`, and `pubDate`
  (ISO `YYYY-MM-DD`); articles also `id` + `image`, posts also `pid`. `others`
  entries carry a free-form `date` string instead, since they have no real
  publish date.
- A missing or misspelled field **fails the build** with a Zod error. That is
  intentional: it stops content from silently vanishing from the homepage and
  the feed.
- Collection order follows array order in the JSON — newest first, since
  `new-article.sh` inserts at the top. Nothing re-sorts it.
- Keep the raw file in `public/`: the search bar fetches it at runtime as its
  dev/offline fallback (§6).

---

## 5. Math

Math is typeset by **self-hosted KaTeX**. `BaseLayout` loads
`public/assets/js/katex-render.js` on every page, so **a page needs no math
script of its own** — there is nothing to add to the `scripts` slot.

Delimiters: inline `$…$` / `\(…\)`; display `$$…$$` / `\[…\]` /
`\begin{env}…\end{env}`.

For the components themselves — `<E>`, `<M>`, `<Theorem>`, `<Problem>`,
`<Solution>`, and the `tex` raw-template helper — see
[`COMPONENTS.md` §4](COMPONENTS.md#4-math--equations--environments). Two rules
belong here, because they're about **search**, not rendering:

1. **All display math goes inside `<E>`.** Never leave a bare `$$…$$`, `\[…\]`
   or `\begin{…}…\end{…}` loose in prose. `<E>` renders `<div class="equation">`,
   which Pagefind is told to exclude (`--exclude-selectors ".equation, …"` in
   the build script). A bare display block dumps `\frac`, `\sum` and `\begin`
   straight into the search index.
2. **Inline math can stay in prose.** The build's `pagefind-ignore-math.mjs`
   step wraps every inline run in `<span data-pagefind-ignore>` automatically —
   you do nothing. It tokenizes tags rather than pattern-matching text, so it
   never rewrites markup and skips `<pre>`/`<code>`/`<script>`/`<style>`.

**Net effect:** readers search article *words*, never LaTeX. Equation gibberish
in a search result almost always means a display block that wasn't wrapped in
`<E>` — wrap it and rebuild.

Two leftovers from the MathJax era, worth recognising but not worth copying:
`<Equation>` still works as an alias of `<E>`, and `.mathjax-definition` is
still in the Pagefind exclude list although no page uses it — shared macros now
live in the `macros` object at the top of `katex-render.js`.

---

## 6. Search (Pagefind)

Full detail in [`SEARCH.md`](SEARCH.md). The short version:

- **How it works:** `npm run build` builds the site, then Pagefind crawls the
  rendered HTML in `dist/` and writes a client-side index to `dist/pagefind/`.
  The search UI (`src/components/site/topbar/search.ts`, shipped with
  `TopBar.astro`) lazy-loads `/pagefind/pagefind.js` on the first keystroke and
  shows the title plus a highlighted body excerpt.
- **What's indexed:** only the `<main data-pagefind-body>` region, set in
  `BaseLayout`. Nav, sidebar, "More Articles" and the footer are ignored, as are
  `.equation` and inline math (§5).
- **New pages are indexed automatically** — anything using `BaseLayout` gets the
  marker. Just rebuild.
- **Topics become filter facets** through `<TopicTags>`, which is what fills the
  top bar's tag browser.
- **Fallback:** with no index (in `dev`, or offline) the bar fetches
  `articles.json` and does a title-only substring match.
- **To exclude an element:** add `data-pagefind-ignore` to it.
- **To test:** `npm run build && npm run preview`, then search a word that
  appears only in an article body.

---

## 7. Code blocks

Use the components in `src/components/code/` rather than raw `<pre>` — which one
to reach for, their props, and the whitespace trap that eats indentation are all
in [`COMPONENTS.md` §3](COMPONENTS.md#3-code--code-blocks).

Two things specific to this guide:

- **Converting legacy markup:** `python3 scripts/convert-code-blocks.py <file>
  --apply` rewrites old raw `<div class="code-container">` blocks into
  components. Run it without `--apply` first for a diff. Its matcher is narrow —
  it only recognises containers carrying the one legacy `style` string, so
  other hand-rolled shapes (e.g. a `.box`-wrapped block) report "nothing to do"
  and have to be converted by hand.
- **`$` inside code is safe** (`$USER`, `$(uname -r)`): the inline-math step
  skips `<pre>` and `<code>`, so shell variables are never mistaken for math.

---

## 8. Styling

- All CSS is under `src/assets/css/`, bundled via `main.css` and imported once
  in `BaseLayout`. Page-specific CSS goes in the page's `head` slot; rules that
  belong to one component go in that component's own scoped `<style>`.
- The site is theme-aware — a `dark-mode` class on `<html>`, applied before
  first paint by an inline script in `BaseLayout` so there's no flash. Follow
  the existing `--var` custom properties rather than hardcoding colors.
- Readers can override body font, font size and both Prism code themes from the
  settings panel; those write inline styles and swap stylesheets at runtime, so
  don't fight them with `!important`.

---

## 9. RSS feed & committing

- The feed is `src/pages/rss/feed.xml.ts`, a build-time Astro endpoint (using
  `@astrojs/rss`) reading the same `articles` and `posts` collections as
  everything else. It regenerates on every build — there is no script to run and
  nothing to keep in sync.
- Each entry's `pubDate` is the single source of truth for both the feed's
  `<pubDate>` and the on-page date (formatted by `src/utils/formatDate.ts`).
  `new-article.sh` sets it; if you hand-edit `articles.json`, add it yourself or
  the entry fails the schema check.
- Commit with `./scripts/commit.sh "message"` — it pulls `main`, stages
  everything, commits and pushes.

---

## Quick checklist for a new article

- [ ] `./scripts/new-article.sh --type article --slug … --title …`
- [ ] Bring the scaffolded page up to date (§3) — aliases, `getEntryMeta`,
      header components, drop the MathJax script and the duplicate "More Articles"
- [ ] Write content; images in `public/articles/<slug>/`, placed with `<Figure>`
- [ ] Every `<section>` has an `id`; display math wrapped in `<E>`
- [ ] Every code language listed in `<Scripts use={…}>`
- [ ] `npm run dev` to write; `npm run build && npm run preview` to verify search
      and the final render
- [ ] `./scripts/commit.sh "Add: <title>"`
