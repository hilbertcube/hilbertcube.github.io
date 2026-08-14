# Development Guide

A practical guide to working on this site. It's an [Astro](https://astro.build) 5
static site: content is authored as hand-written `.astro` pages (not Markdown),
math is rendered with MathJax, and search is powered by Pagefind. For the helper
scripts (`new-article.sh`, RSS, TOC, code-block conversion) see
[`scripts/AUTOMATION.md`](../scripts/AUTOMATION.md).

---

## 1. Commands — `dev` vs `build` vs `preview`

| Command | What it does | When to use |
|---|---|---|
| `npm run dev` | Astro dev server with hot reload. **No search index.** | Day-to-day writing & styling. Fast. |
| `npm run build` | `astro build` → `pagefind-ignore-math.mjs` → `pagefind`. Outputs `dist/`. | Before deploy, and whenever you need to test **real search**. |
| `npm run preview` | Serves the built `dist/` locally. | After `build`, to test the production output (search, final HTML). |

**Rule of thumb:**

- Writing content or CSS → `npm run dev`.
- Testing search, MathJax exclusion, or anything that depends on the built
  output → `npm run build && npm run preview`.
- In `dev`, the search bar falls back to a **title-only** match over
  `articles.json` (see §7) because Pagefind's index only exists after a build.

Deployment is automatic: GitHub Actions runs `npm run build` and publishes
`dist/` (including `dist/pagefind/`). You don't commit `dist/`.

---

## 2. Project structure

```
src/
  layouts/BaseLayout.astro     Shared shell for every page (nav, sidebar, footer)
  pages/
    articles/<slug>/index.astro  One article per folder
    posts/<slug>/index.astro     One post per folder
    about, tags, ...             Standalone pages
  components/                  Grouped by role; every component lives in one
    site/       Chrome on every page: TopBar, Logo, Footer, ShareButton,
                HighlightsAndAttribute, Banner
    article/    Article/post furniture: TableOfContents, TopicTags, ContinueButton
    listings/   Catalog views: ArticleCards, PostList, MaterialCard
    ui/         Primitives: Icon, TwoColumns
    math/       Equation, Theorem, Problem, Solution, E, M, tex
    code/       ShellScript, CodeBlock, CodeBox, TabBox, CopyButton, Sample
  content.config.ts            Typed, validated data collections over articles.json
  assets/css/                  Styles (imported once via main.css)
public/
  assets/json/articles.json    Catalog of all articles/posts (source of truth)
  assets/js/scripts.js         Global client JS (search, MathJax config, UI)
  articles/<slug>/             Article body images
  media/Images/                Card thumbnail images
scripts/                       Automation (see AUTOMATION.md)
```

**Path aliases** (from `tsconfig.json`): `@layouts/*`, `@components/*`.
Prefer `import BaseLayout from "@layouts/BaseLayout.astro"` over relative paths.

---

## 3. Creating an article or post

Use the scaffolder — don't hand-create folders:

```bash
./scripts/new-article.sh --type article --slug "my-slug" --title "My Title"
./scripts/new-article.sh --type post --slug "my-slug" --title "My Title"
```

It creates `src/pages/<type>/<slug>/index.astro` **and** appends an entry to
`public/assets/json/articles.json`. Both are required — the page renders the
prose; the JSON entry drives homepage cards, the tags/archive page, RSS, and
"More Articles". A page without a JSON entry won't appear in those lists (and the
build will fail if the entry is malformed — see §5).

After scaffolding: fill in the content, drop images in `public/articles/<slug>/`,
and reference them as `/articles/<slug>/<file>.webp`.

---

## 4. Page & layout conventions

Every page wraps its content in `BaseLayout`:

```astro
---
import BaseLayout from "@layouts/BaseLayout.astro";
---
<BaseLayout title="Valgrind" description="…" keywords="…" activeButton="Archive-button" toc>
  <Fragment slot="head"> <style>/* page-specific CSS */</style> </Fragment>

  <div class="content-grid">
    <header>
      <div class="topic">Topics: …</div>
      <h1 class="title">…</h1>
      <div class="date">…</div>
    </header>
    <section id="…"> … </section>
  </div>

  <Fragment slot="scripts"> … </Fragment>
</BaseLayout>
```

Rules:

- **Props**: `title` (required), `description`, `keywords`, `activeButton` (id of
  the nav link to highlight, e.g. `"Archive-button"`), `toc` (sidebar Table of
  Contents — see below).
- **Slots**: `head` (extra styles/meta), `sidebar` (extra content above the
  highlights panel), `scripts` (page-specific scripts).
- Put the main content in a `<div class="content-grid">`.
- **To render math you must load MathJax** in the `scripts` slot — the scaffold
  adds this automatically:
  ```astro
  <Fragment slot="scripts">
    <script is:inline src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-chtml.js" async></script>
  </Fragment>
  ```
  (The MathJax *config* — delimiters, `ams` tags — lives globally in
  `public/assets/js/scripts.js`.)
- Article/post metadata (title, topics, date) can be pulled from the data
  collection instead of hardcoding — see §5.

### Table of Contents

`toc` builds the sidebar TOC from the page's own markup at build time, so adding
a section is all it takes to add a TOC entry — there is no list to keep in sync.
Every `<h2>`/`<h3>` becomes an entry, anchored to its own `id` or to the `id` of
the `<section>` it opens; a heading with neither is skipped. Nesting follows
heading level (`<h3>` under the preceding `<h2>`), not `<section>` nesting.

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

The extractor lives in `src/utils/toc.ts`; `TableOfContents.astro` still takes a
manual `items` array for the rare page that needs one.

---

## 5. Data model — `articles.json` + typed collections

`public/assets/json/articles.json` is the single catalog. It has three arrays:
`articles` (have `id`, `image`), `posts` (have `pid`), and `others` (resources).

It is wrapped by typed, **Zod-validated** collections in `src/content.config.ts`.
Read it in `.astro` files via the content API — **not** `fs.readFileSync`:

```astro
---
import { getCollection } from "astro:content";

// e.g. this page's own metadata:
const slug = Astro.url.pathname.replace(/\/$/, "");
const meta = (await getCollection("articles")).find(
  (e) => e.data.link.replace(/\/$/, "") === slug,
)?.data;
---
<h1 class="title">{meta.title}</h1>
```

Rules:

- Every entry needs `title`, `link`, `topics[]`, `description`, `pubDate`
  (ISO `YYYY-MM-DD`; articles also `id` + `image`; posts also `pid`). `others`
  entries use a free-form `date` string instead, since they have no real
  publish date. A missing/misspelled field
  **fails the build** with a Zod error — that's intentional, it stops content
  from silently vanishing from the homepage/RSS.
- Collection order follows the array order in the JSON (newest first, since
  `new-article.sh` inserts at the top).
- The raw file is still fetched at runtime by the tags page and the search
  fallback, so keep it in `public/`.

---

## 6. Math — the `Equation` tag and friends

MathJax delimiters: inline `$…$` / `\(…\)`, display `$$…$$` / `\[…\]` /
`\begin{env}…\end{env}`. Braces in source are written as HTML entities
(`&#123;` / `&#125;`).

**Rules (these keep both rendering *and* search correct):**

1. **All display math goes inside `<Equation>`.** Never leave a bare `$$…$$`,
   `\[…\]`, or `\begin{…}…\end{…}` loose in prose.
   ```astro
   <Equation>$$ E = mc^2 $$</Equation>
   <Equation>\begin&#123;align*&#125; … \end&#123;align*&#125;</Equation>
   ```
   Why: `<Equation>` renders `<div class="equation">`, which Pagefind is told to
   **exclude from search** (`--exclude-selectors ".equation, …"`). A bare display
   block would dump LaTeX like `\frac`, `\sum`, `\begin` into the search index.
2. **Inline math** (`$x^2$`, `\(\nabla u\)`) can stay in prose. The build's
   `pagefind-ignore-math.mjs` step automatically wraps it so it's excluded from
   search — you don't do anything.
3. **Macro preamble**: put `\newcommand`/`\DeclareMathOperator` definitions in a
   `<div class="mathjax-definition"> \[ … \] </div>` at the top of the article
   (the scaffold/existing articles show the pattern). This class is also excluded
   from search.
4. Other math components: `<Theorem name="…">`, `<Problem>`, `<Solution
   summary="…">` wrap **prose + math** — their text stays searchable, but any
   *display* math inside them still belongs in an `<Equation>`.

**Net effect on search:** readers search article *words*, never LaTeX. If you
ever see equation gibberish in search results, it's almost always a display block
that wasn't wrapped in `<Equation>` — wrap it and rebuild.

---

## 7. Search system (Pagefind)

- **How it works:** `npm run build` builds the site, then Pagefind crawls the
  rendered HTML in `dist/` and produces a client-side index under
  `dist/pagefind/`. The search bar (`SearchBar()` in
  `public/assets/js/scripts.js`) lazy-loads `/pagefind/pagefind.js` on the first
  keystroke and shows title + a highlighted body excerpt.
- **What's indexed:** only the `<main data-pagefind-body>` region (set in
  `BaseLayout`). Nav, sidebar, "More Articles", and the footer are ignored, as
  are `.equation` / `.mathjax-definition` and inline math (§6).
- **New pages are indexed automatically** — anything using `BaseLayout` gets the
  `data-pagefind-body` marker. Just rebuild.
- **Fallback:** if the Pagefind index is missing (e.g. `npm run dev`, or
  offline), search falls back to a **title-only** match over `articles.json`.
- **To exclude a whole element from search:** add `data-pagefind-ignore` to it.
- **To test search:** `npm run build && npm run preview`, then search a word that
  only appears in an article body.

---

## 8. Code blocks

Use the components in `src/components/code/` rather than raw `<pre>`:

- `<ShellScript>` — command-line examples (prompt styling).
- `<CodeBlock>` — generic code / config.
- Plus `CodeBox`, `TabBox`, `CopyButton`, `Sample` for richer layouts.

To convert existing raw `<div class="code-container">` blocks, use
`python3 scripts/convert-code-blocks.py <file> --apply` (see AUTOMATION.md).
Note: `$` inside code (`$USER`, `$(uname -r)`) is safe — the search step skips
`<pre>`/`<code>`, so shell variables are never mistaken for math.

---

## 9. Styling

- All CSS is under `src/assets/css/` and bundled via `src/assets/css/main.css`
  (imported once in `BaseLayout`). Add page-specific CSS in the page's `head`
  slot.
- The site is theme-aware (light/dark via a `dark-mode` class on `<html>`);
  follow the existing `--var` custom properties rather than hardcoding colors.

---

## 10. RSS feed & committing

- The feed lives at `src/pages/rss/feed.xml.ts`, a build-time Astro endpoint
  (using `@astrojs/rss`) that reads straight from the `articles` and `posts`
  content collections — the same `public/assets/json/articles.json` catalog
  everything else uses. It regenerates on every `npm run build`; there is no
  script to run and nothing to keep in sync manually.
- Each article/post entry's `pubDate` (`YYYY-MM-DD`) is the single source of
  truth for both the feed's `<pubDate>` and the on-page date, formatted via
  `formatDate()` in `src/utils/formatDate.ts` — `new-article.sh` sets it for
  you. If you hand-edit `articles.json`, add `pubDate` yourself or the entry
  will fail the `content.config.ts` schema check at build time.
- Commit: `./scripts/commit.sh "message"`. See AUTOMATION.md.

---

## Quick checklist for a new article

- [ ] `./scripts/new-article.sh --type article --slug … --title …`
- [ ] Write content; images in `public/articles/<slug>/`, referenced as `/articles/<slug>/…`
- [ ] All display math wrapped in `<Equation>`; macros in `.mathjax-definition`
- [ ] MathJax script present in the `scripts` slot (if the page uses math)
- [ ] `npm run dev` to write; `npm run build && npm run preview` to verify search + final render
- [ ] `./scripts/commit.sh "Add: <title>"`
