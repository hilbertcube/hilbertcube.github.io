# Search System

Full-text search across the whole site, powered by [Pagefind](https://pagefind.app)
— a static, client-side search engine. There is no server: at build time Pagefind
crawls the rendered HTML and produces a static index + a tiny WASM engine that runs
entirely in the browser.

This document explains the moving parts. For general dev workflow see
[DEVELOPMENT.md](./DEVELOPMENT.md); for how content/math is authored see
[../scripts/AUTOMATION.md](../scripts/AUTOMATION.md).

---

## 1. The pieces

| Concern | Where |
|---|---|
| Build the index | `package.json` `build` script + `scripts/pagefind-ignore-math.mjs` |
| What gets indexed | `src/layouts/BaseLayout.astro` (`data-pagefind-body` / `data-pagefind-ignore`) |
| Search UI + logic | `public/assets/js/scripts.js` → `SearchBar()` |
| On-page highlight & scroll | `src/layouts/BaseLayout.astro` (inline module) |
| Styling | `src/assets/css/components/_search.css` |
| Offline/dev fallback | `public/assets/json/articles.json` (title-only) |

---

## 2. Build pipeline

The `build` script runs three steps in order:

```jsonc
"build": "astro build && node scripts/pagefind-ignore-math.mjs && pagefind --site dist --exclude-selectors \".equation, .mathjax-definition\""
```

1. **`astro build`** — renders every page to static HTML in `dist/`.
2. **`node scripts/pagefind-ignore-math.mjs`** — wraps inline math so it's excluded
   from the index (see §5).
3. **`pagefind --site dist --exclude-selectors "…"`** — crawls `dist/`, builds the
   index into `dist/pagefind/`, and skips display-math containers.

CI needs no special handling: the GitHub Pages workflow already runs `npm run build`
and uploads `dist/` (which now includes `dist/pagefind/`).

> **Dev note:** `npm run dev` does **not** produce an index, so search there uses the
> fallback (§7). To test real search: `npm run build && npm run preview`.

---

## 3. What gets indexed

Pagefind only indexes the element marked `data-pagefind-body`. In
`BaseLayout.astro` that's `<main class="general-wrapper" data-pagefind-body>`, so:

- **Included:** the article/post/page body.
- **Excluded automatically** (outside `<main>`): the top nav, the sidebar.
- **Excluded explicitly** with `data-pagefind-ignore`: the "More Articles" block and
  the `<footer>` (both live inside `<main>`).

New pages are indexed automatically — anything rendered through `BaseLayout` inherits
the `data-pagefind-body` marker. Just rebuild.

---

## 4. Excluding equations (display math)

Math would otherwise pollute results with LaTeX tokens (`\frac`, `\sum`, …). Display
math is excluded centrally via the `--exclude-selectors` flag, which treats these
containers as if they had `data-pagefind-ignore`:

- **`.equation`** — every `<Equation>` component. All display math must be wrapped in
  `<Equation>` (this is a content rule — see DEVELOPMENT.md §6).
- **`.mathjax-definition`** — the `\newcommand` macro preamble at the top of math
  articles.

## 5. Excluding inline math (`scripts/pagefind-ignore-math.mjs`)

Inline math (`$…$`, `\(…\)`) is woven through prose and has no wrapping element, so a
post-build step handles it. For each page it:

- Operates only inside `<main data-pagefind-body>`.
- Walks the HTML as a **tag tokenizer**, rewriting only text runs (never markup).
- **Skips** `<pre>`, `<code>`, `<script>`, `<style>`, `.equation`, and
  `.mathjax-definition` — so shell `$USER` / `$(uname -r)` in code is never mistaken
  for math, and display math is left alone.
- Wraps each inline-math run in `<span data-pagefind-ignore>…</span>`.

MathJax still renders the math normally; the wrapper only tells Pagefind to skip it.

**Net effect:** searches match article *words*, never LaTeX. If equation gibberish
ever appears in results, it's almost always a display block that wasn't wrapped in
`<Equation>`.

---

## 6. Client-side search (`SearchBar()` in `scripts.js`)

### Engine loading
On the first keystroke, `getEngine()` lazily loads the engine:

- **Pagefind** — dynamically imports `/pagefind/pagefind.js` and calls `init()`.
- **Fallback** — if that import fails (dev / offline / missing index), it fetches
  `articles.json` for a title-only match (§7).

### Query flow (input handler)
1. Read the trimmed query; empty → hide dropdown.
2. Start a **250 ms** timer that shows a "Loading…" state **only if** the search is
   still pending — so it appears mainly on the first (cold WASM) query and never
   flickers on warm ones.
3. `await search(query)` and clear the timer.
4. Ignore the result if it was superseded (Pagefind's `debouncedSearch`, 180 ms) or
   if the input changed while awaiting (out-of-order guard).
5. `renderResults(...)`.

### Building results (`buildPageItem`)
Each Pagefind result becomes one **card** (`.search-group`): the page title + a type
badge, then one **snippet row** (`.search-hit`) per matching region:

- **Snippets from match positions.** Pagefind returns every match position
  (`d.locations` / `d.weighted_locations`) and the full page text (`d.content`).
  `clusterLocations()` groups nearby matches; matches **far apart** (> `CLUSTER_GAP`
  words) become **separate snippets**. `buildSnippet()` renders `CONTEXT` words on
  each side with the matched words highlighted (`escapeHtml`'d first).
- **Relevance ordering.** Each cluster is scored from Pagefind's match weights and the
  snippets are sorted by score, so the tightest / most relevant match (e.g. an exact
  phrase) leads. Capped at `MAX_SNIPPETS` per page.
- **Section heading + link.** `sectionFor()` maps a match to the nearest heading
  anchor at/above it (anchors share the same word-index base as matches). The heading
  text comes from Pagefind's `sub_results` titles, falling back to a prettified
  section `id`; it's hidden when it would just repeat the page title.

Tunables live at the top of `SearchBar()`: `CONTEXT` (16), `CLUSTER_GAP` (30),
`MAX_SNIPPETS` (4).

### Keyboard & mouse
- `↑`/`↓` move through `.search-hit` rows (`autocomplete-active`), `Enter` opens the
  focused row (or the first), `Esc` clears. `/` focuses the bar.
- All results are shown (no cap); the dropdown scrolls.

---

## 7. Fallback (dev / offline)

When the Pagefind index isn't available, `loadEngine()` fetches
`public/assets/json/articles.json` and does a **title-only** substring match, rendered
with the same card layout (topics shown instead of body excerpts). Pagefind does the
real full-text work in production; this just keeps the bar functional in `dev`.

---

## 8. Navigating to a result

Clicking a snippet (or pressing Enter) calls `go(url)`:

- **Different page** → opens in a new tab.
- **Same page** → `window.__pagefindGoInPage(url)` (exposed by BaseLayout): updates
  the URL via `history.replaceState`, re-highlights for the new query, and scrolls in
  place — no reload / new tab.

### The URL
`withHighlight()` builds `…/#<section-id>?pagefind-highlight=<query>`:

- **`#<section-id>`** — the section the match falls in (from `sectionFor`), so the
  browser scrolls there.
- **`?pagefind-highlight=<query>`** — read by `pagefind-highlight.js` on the
  destination page.

### On-page highlight & scroll (BaseLayout inline module)
`pagefind-highlight.js` **marks** the matched words (`<mark class="pagefind-highlight">`,
scoped to `data-pagefind-body`, ignoring `[data-pagefind-ignore]`) but does **not**
scroll. So the inline module:

1. Instantiates the highlighter (`addStyles: false`; styling is in `_search.css`).
2. `scrollToMatch(id)` polls until the marks exist, then scrolls to the first mark
   **inside the linked section** (falling back to the first mark anywhere).
3. **Re-scrolls on `window.load`** — late-loading images shift layout, so it corrects
   the position once the page is fully loaded, *unless* the reader has already scrolled
   (a `userMoved` flag from `wheel`/`touchstart`/`keydown`/`pointerdown`).

---

## 9. Maintenance cheat-sheet

- **Add a page** → it's indexed automatically on the next build (uses `BaseLayout`).
- **Equation noise in results** → wrap the offending display math in `<Equation>`.
- **Change snippet size / count** → `CONTEXT`, `CLUSTER_GAP`, `MAX_SNIPPETS` in
  `SearchBar()`.
- **Change the search-slow threshold** → the `250` in the input handler's loading
  timer; the `180` in `debouncedSearch` is the input debounce.
- **Exclude something else from search** → add `data-pagefind-ignore` to the element,
  or add a selector to `--exclude-selectors` in the build script.
- **Test end-to-end** → `npm run build && npm run preview`, search a body-only word,
  and confirm it jumps to and highlights the exact match.
