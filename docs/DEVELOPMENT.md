# Development Guide

An [Astro](https://astro.build) 5 static site: hand-written `.astro` pages (not
Markdown), self-hosted KaTeX for math, Pagefind for search. This guide covers
the workflow; the other docs:

| Doc | Covers |
|---|---|
| [`COMPONENTS.md`](COMPONENTS.md) | Every component, its props and gotchas |
| [`SEARCH.md`](SEARCH.md) | How search is built, indexed and served |
| [`AUTOMATION.md`](AUTOMATION.md) | The scripts in `scripts/` |
| [`CSS-ORGANIZATION.md`](CSS-ORGANIZATION.md) | How `src/assets/css/` is laid out |

---

## 1. Commands

| Command | Does | Use for |
|---|---|---|
| `npm run dev` | Dev server, hot reload. **No search index** — search falls back to title-only. | Writing and styling |
| `npm run build` | `astro build` → `pagefind-ignore-math.mjs` → `pagefind`, into `dist/` | Testing real search and the final HTML |
| `npm run preview` | Serves `dist/` | After `build` |
| `npm run check` | `astro check` | Before committing — there is no test suite |

Pushing to `main` deploys: `.github/workflows/static-pages.yml` builds and
publishes `dist/` (gitignored).

---

## 2. Project structure

```text
src/
  layouts/BaseLayout.astro       Shell of every page
  pages/
    articles/<slug>/index.astro  One article per folder
    posts/<slug>/index.astro     One post per folder
    rss/feed.xml.ts              Build-time RSS endpoint
  components/                    site/ article/ listings/ math/ code/ ui/ — see COMPONENTS.md
  utils/                         Build-time helpers
  content.config.ts              Zod-validated collections over pages.json
  data/pages.json                Catalog of every page (source of truth)
  assets/css/, assets/images/    Styles; images imported through astro:assets
public/
  assets/js/                     katex-render.js (math), scripts.js (anchor scroll, new-window links)
  katex/                         Self-hosted KaTeX
  articles/<slug>/               Body images
  media/Images/                  Card thumbnails
scripts/                         See AUTOMATION.md
```

Import through the aliases in `tsconfig.json` — `@layouts`, `@components`,
`@utils`, `@data`, `@assets` — never relative paths.

---

## 3. Creating an article or post

```bash
npm run new -- --type article --slug "my-slug" --title "My Title"
```

It creates the page **and** its `pages.json` entry. Both are required: the entry
drives the homepage cards, RSS, search and "More Articles". Options are in
[`AUTOMATION.md`](AUTOMATION.md#new-articlemjs).

**Page conventions:**

- Don't wrap the body in `<div class="content-grid">` — `BaseLayout` does.
  Full-width content above it goes in the `hero` slot.
- Don't give `<section>`s an `id` — they're generated (§3.1).
- Page-specific CSS goes in the `head` slot.

### 3.1 Table of Contents

Pass `toc` to `BaseLayout` and the sidebar TOC is built from the page's
rendered markup — no list to maintain.

```astro
<BaseLayout title="…" toc>            <!-- h2–h4; toc={{ maxLevel: 3 }} stops at h3 -->
  <section>
    <h2>Data Analysis</h2>            <!-- entry "Data Analysis" → #data-analysis -->
    <section>
      <h3>Linearity</h3>              <!-- nested entry → #linearity -->
    </section>
  </section>
</BaseLayout>
```

- **Section ids are generated** from each `<section>`'s `data-toc` label or first
  heading ("Chladni's Law" → `#chladnis-law`; clashes get `-2`, `-3`). So
  **rewording a heading changes its URL fragment** — update any `href="#…"`.
  An `id` written by hand still wins.
- Every `<h2>`–`<h4>` inside a section becomes an entry; nesting follows heading
  level, not `<section>` nesting.
- Overrides on a heading or its section: `data-toc="Short label"` (also what puts
  a heading-less section in the TOC) and `data-toc="skip"`.

The code is `src/utils/toc.ts`.

---

## 4. Data model — `pages.json` + typed collections

`src/data/pages.json` holds three arrays: `articles`, `posts` and `others`
(standing pages such as About). `content.config.ts` wraps them in
Zod-validated collections.

- Every entry needs `title`, `link`, `topics[]`, `description` and `pubDate`
  (`YYYY-MM-DD`); articles also need `image`. A missing field **fails the
  build**, deliberately, so a page can't silently vanish from the lists.
- `link` is the primary key and must be unique.
- Order is array order, newest first; nothing re-sorts.
- Read it through `getCollection("articles" | "posts" | "others")`, never
  `fs.readFileSync`. A page reads **its own** entry with `getEntryMeta`, which
  throws if none matches its URL:

```astro
---
import { getEntryMeta } from "@utils/getEntryMeta";
const meta = await getEntryMeta("articles", Astro.url.pathname);
---
<BaseLayout title={meta.title} description={meta.description} toc>
```

---

## 5. Authoring rules

- **Math:** KaTeX loads on every page; a page adds no math script. Inline
  `$…$` / `\(…\)` can sit in prose. **All display math goes in `<E>`** — a bare
  `$$…$$` or `\begin{…}` puts raw LaTeX into search results
  ([`SEARCH.md` §3](SEARCH.md#3-excluding-display-math)). Components and
  macros: [`COMPONENTS.md` §4](COMPONENTS.md#4-math--equations--environments).
- **Code:** use the `code/` components with `is:raw`, never raw `<pre>`
  ([`COMPONENTS.md` §3](COMPONENTS.md#3-code--code-blocks)).
- **Images and tables:** `<Figure>` and `<Table>`, never a bare `<img>` or `<table>`.
- **References:** write entries in `_references.ts` next to the page's
  `index.astro` and put `<References />` where the section goes — never a
  hand-written `<ol class="reference">`
  ([`COMPONENTS.md` §2](COMPONENTS.md#references)).
- **Search:** new pages are indexed automatically; `data-pagefind-ignore` hides
  an element.
- **Styling:** use the `--var` custom properties (they carry dark mode), and no
  `!important` — readers override fonts and code themes at runtime.

---

## 6. RSS, sitemap & committing

- **RSS** (`src/pages/rss/feed.xml.ts`) and the **sitemap** (`@astrojs/sitemap`
  in `astro.config.mjs`) are generated on every build from the same data —
  nothing to run. `/template/` and `/test/` are filtered out of the sitemap; add
  any other private page to that filter.
- An entry's `pubDate` feeds both the feed and the on-page date.
- Commit with `./scripts/commit.sh "message"` — it stages **everything**
  ([`AUTOMATION.md`](AUTOMATION.md#commitsh)).

---

## Checklist for a new article

- [ ] `npm run new -- --type article --slug … --title …`
- [ ] Write; images in `public/articles/<slug>/` via `<Figure>`
- [ ] Every section has a heading (or `data-toc`); display math in `<E>`
- [ ] `npm run check`, then `npm run build && npm run preview`
- [ ] `./scripts/commit.sh "Add: <title>"`
