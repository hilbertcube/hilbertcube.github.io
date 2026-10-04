# Search System

Full-text search powered by [Pagefind](https://pagefind.app): at build time it
crawls the rendered HTML and writes a static index plus a small WASM engine that
runs in the browser. No server.

| Concern | Where |
|---|---|
| Build the index | `package.json` `build` script, `scripts/pagefind-ignore-math.mjs` |
| What gets indexed | `BaseLayout.astro` (`data-pagefind-body` / `data-pagefind-ignore`) |
| Search UI and logic | `src/components/site/topbar/search.ts` (`initSearch()`) |
| On-page highlight and scroll | `BaseLayout.astro` (inline module) |
| Styling | `src/components/site/TopBar.css` (bar, dropdowns, results); `_search.css` (on-page marks) |

---

## 1. Build pipeline

```jsonc
"build": "astro build && node scripts/pagefind-ignore-math.mjs && pagefind --site dist --exclude-selectors \".equation\""
```

1. `astro build` renders every page into `dist/`.
2. `pagefind-ignore-math.mjs` hides inline math from the index (§4).
3. `pagefind` builds `dist/pagefind/`, skipping display math (§3).

`npm run dev` builds **no index**; search there uses the fallback (§6). To test
real search: `npm run build && npm run preview`.

## 2. What gets indexed

Only `<main data-pagefind-body>` in `BaseLayout`: the page body. The top bar and
sidebar sit outside it; "More Articles", the footer and the hero banner carry
`data-pagefind-ignore`. Any page using `BaseLayout` is indexed on the next build.

## 3. Excluding display math

`--exclude-selectors` skips **`.equation`** — every `<E>` — so `\frac` and `\sum`
never reach the index. That is why all display math must be wrapped in `<E>`.

## 4. Excluding inline math

Inline `$…$` / `\(…\)` has no wrapping element, so `pagefind-ignore-math.mjs`
wraps each run in `<span data-pagefind-ignore>` after the build. It walks the
HTML as a tag tokenizer — rewriting only text, never markup — inside
`data-pagefind-body`, and skips `<pre>`, `<code>`, `<script>`, `<style>` and
`.equation`, so shell `$USER` in code is never taken for math.

**Net effect:** searches match words, never LaTeX. LaTeX in a result almost
always means a display block not wrapped in `<E>`.

---

## 5. The search UI (`topbar/search.ts`)

**Engine.** On the first keystroke, `getEngine()` imports
`/pagefind/pagefind.js`; if that fails it uses the fallback (§6).

**Query flow.** Each input runs Pagefind's `debouncedSearch` (180 ms). A
"Loading…" state appears only if a search is still pending after 250 ms — in
practice the first, cold query. Superseded or out-of-order results are dropped.

**Results.** Each page is one card (`.search-group`) with one snippet row
(`.search-hit`) per cluster of matches:

- `clusterLocations()` groups match positions; matches more than `CLUSTER_GAP`
  words apart become separate snippets, each `CONTEXT` words either side.
- Snippets are ordered by Pagefind's match weights, up to `MAX_SNIPPETS` per page.
- `sectionFor()` labels each snippet with the nearest heading above it and links
  to that section.

Tunables at the top of `search.ts`: `CONTEXT` (16), `CLUSTER_GAP` (30),
`MAX_SNIPPETS` (4).

**Keys.** `/` focuses the bar; `↑`/`↓` move through rows; `Enter` opens one;
`Esc` clears.

## 6. Fallback (dev / offline)

Without an index, `loadEngine()` imports `src/data/pages.json` (code-split, so it
only downloads on this path) and does a **title-only** substring match in the
same card layout.

## 7. Opening a result

Results link to `…/#<section-id>?pagefind-highlight=<query>`. Another page opens
in a new tab; the same page scrolls in place via
`window.__pagefindGoInPage(url)`, exposed by `BaseLayout`.

On arrival, BaseLayout's inline module runs Pagefind's highlighter (which marks
matches but doesn't scroll), then scrolls to the first mark inside the linked
section. It re-scrolls once on `window.load`, since late images shift the
layout — unless the reader has already scrolled.

---

## 8. Maintenance

| To… | Do |
|---|---|
| Hide an element from search | `data-pagefind-ignore`, or a selector in `--exclude-selectors` |
| Change snippet size or count | `CONTEXT`, `CLUSTER_GAP`, `MAX_SNIPPETS` in `search.ts` |
| Change the loading delay | the `250` in the input handler (`180` is the debounce) |
| Test end to end | `npm run build && npm run preview`, search a body-only word, check it jumps and highlights |
