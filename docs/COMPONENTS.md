# Component Reference

Every component in `src/components/`. Workflow is in [`DEVELOPMENT.md`](DEVELOPMENT.md),
search in [`SEARCH.md`](SEARCH.md). Import through the aliases (`@layouts/…`,
`@components/…`).

- [§0 Conventions](#0-conventions)
- [§1 BaseLayout](#1-baselayout)
- [§2 `article/`](#2-article--page-furniture)
- [§3 `code/`](#3-code--code-blocks)
- [§4 `math/`](#4-math--equations--environments)
- [§5 `listings/`](#5-listings--catalog-views)
- [§6 `site/`](#6-site--chrome-on-every-page)
- [§7 `ui/`](#7-ui--primitives)
- [§8 Cheat-sheet](#8-cheat-sheet)

---

## 0. Conventions

- **Props are typed** (`interface Props`), so a misspelt prop fails the check.
- **Styles:** `<style>` is scoped; `<style is:global>` only where rules must reach
  markup the component doesn't own. Sitewide rules: [`CSS-ORGANIZATION.md`](CSS-ORGANIZATION.md).
- **Scripts:** a bare `<script>` is bundled and placed by *module graph*, so anything
  imported by `BaseLayout` ships site-wide — **such scripts return early when their
  markup is absent.** `<script is:inline>` only for pre-paint code and third-party URLs.
- **Per-instance sizing** goes through a CSS custom property (`--figure-img-width`),
  so media queries still win.

---

## 1. BaseLayout

The shell of every page: `<head>`, top bar, sidebar, main region, footer, KaTeX and Pagefind.

| Prop | Type | Default | Meaning |
|---|---|---|---|
| `title` | `string` | entry's `shortTitle ?? title` | Rendered as `{title} \| hilbertcube`; posts get a `Post - ` prefix. Required off `/articles/*` and `/posts/*`. |
| `description` | `string` | entry's `description` | `<meta name="description">`. |
| `keywords` | `string` | entry's `topics` | `<meta name="keywords">`; site default off the catalog. |
| `activeButton` | `string` | `""` | Nav link to underline: `Home-button`, `About-button`, `Contact-button`. |
| `toc` | `boolean \| TocOptions` | `false` | Sidebar TOC from the page's h2–h4 (`{ maxLevel: 3 }` stops at h3). |

| Slot | Lands in |
|---|---|
| default | `<div class="content-grid">` inside `<main data-pagefind-body>` |
| `hero` | `<main>`, full width above the column |
| `head` | end of `<head>` |
| `sidebar` | left nav, between the TOC and the highlights panel |
| `scripts` | end of `<body>` |

The body is rendered to a string first (for the TOC), then injected with `set:html`,
so a `client:*` island in a page body would not survive. On `/articles/*` it appends
4 shuffled [`ArticleCards`](#articlecards) as "More Articles".

---

## 2. `article/` — page furniture

```astro
<header>
  <TopicTags />
  <PageTitle />
  <PubDate />
  <FrontImage src="banner.webp" />
</header>
```

`TopicTags`, `PageTitle` and `PubDate` **take no props on an article or post**: each
reads the page's `pages.json` entry from its URL and fails the build if there is none.
Props only override that.

| Component | Props (optional) | Renders |
|---|---|---|
| `TopicTags` | `topics: string[]` | `Topics: a, b, c`; each topic is a `data-pagefind-filter="topic"` span (feeds the tag browser) |
| `PageTitle` | `title`, `variant: "article" \| "post"` | The `<h1>` (`.title` / `.post-title`) |
| `PubDate` | `pubDate` (ISO) | `Posted <date>` plus the "Save as PDF" button (`SavePdf`) |

### FrontImage

The banner under the title. Children become the caption; it opens in the
[lightbox](#lightbox) (`class="no-lightbox"` opts out).

| Prop | Default | Notes |
|---|---|---|
| `src` | — | Relative to the page's `public/` folder (below). |
| `alt` | `"banner"` | |
| `width` | `"100%"` | Desktop only; 100% under 580px. |
| `fetchpriority` | `"high"` | Usually the LCP image. |

### Figure

**The only way to place a body image.** Children become the numbered `<figcaption>`.

| Prop | Default | Notes |
|---|---|---|
| `src` | — | A relative path is in the page's own `public/` folder: on `/articles/<slug>`, `"plot.webp"` → `/articles/<slug>/plot.webp` (subfolders work). Absolute paths and URLs pass through. |
| `alt` | `""` | |
| `width` | `"100%"` | Desktop only — 80% under 1080px, 100% under 580px. |
| `maxWidth` | — | Hard cap, e.g. `"520px"`. |
| `captionWidth` | full | Narrower caption. |
| `flush` | `false` | Drop the margins. |
| `loading` | — | `"lazy"` well below the fold. |

```astro
<Figure src="Bessel1st.webp" width="65%">
  First few Bessel functions of the 1st kind.
</Figure>
```

### Table

**The only way to put a table in body copy.** Emits the `.table-wrapper` / `.p-table`
pair (without the wrapper a table overflows on mobile). Attributes land on the `<table>`.

```astro
<Table id="growth-table">
  <thead><tr><th>n</th><th>T(n)</th></tr></thead>
  <tbody><tr><td>1</td><td>O(1)</td></tr></tbody>
  <caption>Growth of the running time.</caption>
</Table>
```

Use `<thead>`/`<tbody>`; a `<caption>` sits below and is numbered. Styles are scoped,
so page rules for cell content need `:global(.p-table) td { … }` in a scoped style,
or `.table-wrapper .p-table .cls` globally.

### Quote

Pull quote. `content` and `author`, without quotation marks or dash — CSS adds them.

### ContinueButton

Previous/next links at the foot of a multi-part article. `<ContinueButton />` links
the entries in `pages.json` that share this page's `series`, in `pubDate` order (the
build fails if it has none). `prevHref` / `nextHref` override that;
`prevLabel` / `nextLabel` default to `"Previous"` / `"Next"`. A missing neighbour
hides its button but keeps the space.

### References

Renders the `_references.ts` next to the page's `index.astro` (the `_` keeps Astro
from routing it). No props except `title` (default `"References"`); fails the build
if the file is missing. Entries are numbered in written order, each with
`id="ref-<key>"` for `<a href="#ref-lowe2004">[3]</a>`.

```ts
import { defineReferences } from "@utils/references";

export default defineReferences({
  rosten2006: {
    type: "inproceedings",
    authors: ["Edward Rosten", "Tom Drummond"],
    title: "Machine learning for high-speed corner detection",
    proceedings: "European Conference on Computer Vision (ECCV)",
    pages: "430-443",
    year: 2006,
  },
});
```

| `type` | Required | Optional |
|---|---|---|
| `article` | `journal` | `volume`, `issue`, `pages` |
| `inproceedings` | `proceedings` | `pages`, `location`, `publisher` |
| `book` | — | `publisher`, `location`, `edition` |
| `chapter` | — | `book`, `pages`, `publisher`, `location`, `edition` |
| `thesis` | `degree`, `institution` | `location` |
| `report` | — | `institution`, `pages`, `location` |
| `web` | — | `site` |

All types take `title` (required), `authors` (list or string), `year`, `note`,
`url` / `doi` and `accessed`. Titles print as written, page ranges get an en dash,
`edition: 4` prints "4th edition", `doi` becomes a link. Fields are typed in
`src/utils/references.ts`; a wrong field fails `npm run check`.

### TableOfContents

Built by `BaseLayout` from `toc` ([`DEVELOPMENT.md` §3.1](DEVELOPMENT.md#31-table-of-contents)).
By hand only for a custom list: `items: TocItem[]` (`{ label, href, children? }`),
optional `title`. `tocHighlight.ts` marks the entry for the section a third of the
way down the viewport.

---

## 3. `code/` — code blocks

| Component | For | Copy button |
|---|---|---|
| `CodeBlock` | code / config | yes |
| `CodeBox` | framed code, optional line numbers | yes |
| `ShellScript` | terminal session with prompts | yes |
| `Sample` | console output, pseudo-code (not highlighted) | no |
| `TabBox` | tabs holding any of the above | — |
| `C` | inline code | — |

The first three are highlighted at build time by Shiki (`src/utils/highlight.ts`) in
every theme in `src/utils/codeThemes.ts`; CSS picks the reader's. `language` is a
[Shiki language id](https://shiki.style/languages); an unknown one fails the build.

### Writing a listing: `is:raw`

```astro
    <CodeBlock language="cpp" is:raw>
      #include <cstdlib>
      int main() {
          return 0;
      }
    </CodeBlock>
```

`is:raw` is required on the four block components: children arrive as literal text,
and a listing starting on the line after the tag is dedented. The listing is plain
text — entities and tags are not interpreted.

### CodeBlock, CodeBox, ShellScript

| Prop | On | Default | Meaning |
|---|---|---|---|
| `language` | `CodeBlock`, `CodeBox` | `"bash"` | Shiki language id |
| `code` | all three | — | String instead of children (``code={raw`…`}``) |
| `lineNumbers` | `CodeBox` | `false` | Line-number gutter |
| `host` | `ShellScript` | `"pc"` | Hostname in the `[user@host] $` prompt |
| `output` | `ShellScript` | — | e.g. `"2-5, 8"`: output lines, no prompt, dimmed |
| `continuationStr` | `ShellScript` | — | A line ending in it gets a `>` prompt on the next |

Prompts and line numbers are never copied.

### Sample

`<pre class="console">`, no copy button. Props: `code`, `id`, `class`, `style`.

### TabBox

`tabs: string[]`, one label per child pane, in order. Keyboard and ARIA handled.

```astro
<TabBox tabs={["Square", "Circular"]}>
  <Sample is:raw>…</Sample>
  <Sample is:raw>…</Sample>
</TabBox>
```

### C

Inline code: `<C>-g</C>`, or ``<C code={raw`std::vector<T>{}`} />`` for braces and
backslashes. The style is scoped here.

### CopyButton, raw.astro

`CopyButton` is built into the three highlighted blocks. `raw.astro` exports
`raw = String.raw`.

---

## 4. `math/` — equations & environments

Math is typeset by `public/assets/js/katex-render.js` (every page).
`\begin{equation}` / `\begin{align}` are numbered document-wide; `$$…$$` and `\[…\]`
are not. Shared macros (`\R`, `\N`, `\pd`, …) are in its `macros` object.

**All display math goes in `<E>`** ([`SEARCH.md` §3](SEARCH.md#3-excluding-display-math)).

### tex.astro

`export const tex = String.raw`. Astro eats backslashes in quoted attributes, so LaTeX
is passed as ``{tex`…`}``.

### E and M

Display (`<div class="equation">`) and inline (`<span class="inline-math">`) math;
LaTeX as children or `code`. Plain `$x^2$` in prose also works.

```astro
<E>{tex`\begin{equation} u_{tt} = c^2\nabla^2 u \end{equation}`}</E>
<M>{tex`u_{tt}`}</M>   <M>x^2</M>
```

### Theorem, Lemma, Definition, Problem, Solution, Proof

| Component | Renders | Props |
|---|---|---|
| `Theorem` | `<div class="theorem">` | `name` (after "Theorem") |
| `Lemma` | `<div class="lemma">` | `name` (after "Lemma") |
| `Definition` | `<div class="definition">` | `name` (after "Definition") |
| `Problem` | `<div class="problem">` | — |
| `Solution` | `<details class="solution">` | `summary` (`"Solution"`), `open` (`true`) |
| `Proof` | `<div class="proof">`, italic **Proof.** lead-in | `label` (`"Proof"`) |

A `Proof` body must open with a `<p>` — the lead-in attaches to it.

---

## 5. `listings/` — catalog views

All read the `pages.json` collections at build time.

### ArticleCards

| Prop | Default | Notes |
|---|---|---|
| `count` | all | Max cards. |
| `showDetails` | `true` | Tags, description, date. |
| `shuffle` | `false` | |
| `excludePath` | `""` | Path to drop, normally the current page. |

Images resolve against `/media/Images/`.

### PostList

Every post, in `pages.json` order. No props.

### MaterialCard

A recommended book: `title`, `author`, `description`, `image`, optional `imageId`,
`links: { label, href }[]`.

---

## 6. `site/` — chrome on every page

Rendered by `BaseLayout`; pages only use `HeroBanner`.

### TopBar

Links, hamburger, search, tag browser, RSS, share menu, dark-mode toggle, settings
panel, reading-progress bar. Behaviour in `site/topbar/`:

| Module | Does |
|---|---|
| `nav.ts` | Sidebar open/closed (open by default at ≥1200px) |
| `theme.ts` | Dark mode and the two code-theme selects |
| `settings.ts` | Font, font size, scroll indicator; progress bar |
| `search.ts` | Search and tag browser ([`SEARCH.md`](SEARCH.md)) |
| `share.ts` | Share dropdown |

Dark mode is a `dark-mode` class on `<html>`, stored in `localStorage.mode`; an inline
script in `BaseLayout`'s `<head>` applies it and the code theme before first paint.

**Adding a share platform:** an entry in `sharePlatforms` in `TopBar.astro`
(`{ id, title, icon }`) and the same `id` in `SHARE_URLS` in `share.ts`.

### Logo, Footer

Sidebar logo and nav list; footer links. No props.

### Lightbox

Click a content image to view it fullscreen. Its script lazy-loads
yet-another-react-lightbox (`site/lightbox/viewer.ts`) on first click. Excluded:
`#logoImage`, sidebar highlight covers, `class="no-lightbox"`.

### HeroBanner

`<HeroBanner slot="hero" art="gradient" />`: a dark panel on the left, animated art in
the rest. The `ARTS` table in `HeroBanner.astro` maps `art` to a `site/canvas/` component:

| `art` | Component | Placement |
|---|---|---|
| `"gradient"` | `GradientCanvas` (worker) | behind the panel |
| `"preprint"` | `PreprintFigure` (SVG) | beside the panel; behind it below 860px |

**Adding an art:** a `site/canvas/` component that fills its box, plus an `ARTS`
entry. `EquationsCanvas`, `MazeCanvas` and `FluidCanvas` exist but aren't registered;
each one's header has the entry to paste. Every registered art ships on both banner pages.

### HighlightsAndAttribute

Lower sidebar. Stats are read from git at build time (`src/utils/repoStats.ts`;
"Content Updates" are commits matching its `CONTENT_PATHS`). Featured articles are
the `highlightLinks` array.

---

## 7. `ui/` — primitives

### Icon

Font Awesome icon as inline SVG, resolved at build time; `1em`, `currentColor`.
Props: `name` (no `fa-` prefix), `prefix` (`"fas"` | `"fab"`, default `"fas"`),
`class`, `style`, `id`.

### FeatureSlider

Homepage carousel. `slides: { id, title }[]` (`id` names the slot), `label`
(default `"Featured articles"`).

```astro
<FeatureSlider slides={[{ id: "chladni", title: "Chladni Patterns" }]}>
  <Fragment slot="chladni">…</Fragment>
</FeatureSlider>
```

### TwoColumns

`<div class="two-columns-block">` around its children.

---

## 8. Cheat-sheet

```astro
---
import BaseLayout from "@layouts/BaseLayout.astro";
import TopicTags from "@components/article/TopicTags.astro";
import PageTitle from "@components/article/PageTitle.astro";
import PubDate from "@components/article/PubDate.astro";
import FrontImage from "@components/article/FrontImage.astro";
import Quote from "@components/article/Quote.astro";
import Figure from "@components/article/Figure.astro";
import Table from "@components/article/Table.astro";
import E from "@components/math/E.astro";
import { tex } from "@components/math/tex.astro";
import CodeBlock from "@components/code/CodeBlock.astro";
import C from "@components/code/C.astro";
---

<BaseLayout toc>
  <header>
    <TopicTags />
    <PageTitle />
    <PubDate />
    <FrontImage src="banner.webp" />
  </header>

  <Quote content="…" author="…" />

  <section>
    <h2>Introduction</h2>
    <p>Inline math like $x^2$ is fine in prose, and <C>--flag</C> is inline code.</p>
    <E>{tex`\begin{equation} u_{tt} = c^2\nabla^2 u \end{equation}`}</E>
    <Figure src="plot.webp" width="70%">A caption.</Figure>
    <CodeBlock language="python" is:raw>
      print("hi")
    </CodeBlock>
  </section>
</BaseLayout>
```

| Symptom | Cause |
|---|---|
| Code loses indentation, `{x}` / `<T>` vanish | No `is:raw` |
| Build fails: "Language … not found" | `language` isn't a Shiki id |
| TabBox shows the wrong pane | `tabs` and child panes out of step |
| LaTeX in search results | Display math not in `<E>` |
| Backslashes vanish from an equation | LaTeX in a quoted attribute instead of ``{tex`…`}`` |
| Build fails: "Entry metadata not found" | Page path matches no `link` in `pages.json` |
| Build fails: `<References>: no _references.ts next to the page` | Missing `_references.ts` |
