# Component Reference

Every component in `src/components/`: what it renders and how to call it.
Workflow is in [`DEVELOPMENT.md`](DEVELOPMENT.md), search internals in
[`SEARCH.md`](SEARCH.md). Import through the aliases
(`@layouts/…`, `@components/…`), never relative paths.

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

- **Props are typed** (`interface Props`), so a misspelt prop is a build error.
  Children are content (a caption, a body, code); props are configuration.
- **Styles:** a plain `<style>` is scoped to the component; `<style is:global>`
  is used only where rules must reach markup the component doesn't own
  (`ContinueButton`, `HighlightsAndAttribute`). Sitewide rules live in
  `src/assets/css/` ([`CSS-ORGANIZATION.md`](CSS-ORGANIZATION.md)).
- **Scripts:** a bare `<script>` is bundled and hoisted. Astro places it by
  *module graph*, not by whether the markup rendered, so anything imported by
  `BaseLayout` ships site-wide — **every such script returns early when its
  markup is absent.** `<script is:inline>` is only for what must run before first
  paint (the dark-mode snippet) and third-party URLs.
- **Per-instance sizing** goes through a CSS custom property
  (`--figure-img-width`), not inline dimensions, so media queries still win.

---

## 1. BaseLayout

The shell of every page: `<head>`, top bar, sidebar, main region, footer, and
the KaTeX / Pagefind bootstrapping.

| Prop | Type | Default | Meaning |
|---|---|---|---|
| `title` | `string` | — | Rendered as `{title} \| hilbertcube`. |
| `description` | `string` | `""` | `<meta name="description">`. |
| `keywords` | `string` | site default | `<meta name="keywords">`. |
| `activeButton` | `string` | `""` | Id of the nav link to underline: `Home-button`, `About-button` or `Contact-button`. Unset on articles and posts. |
| `toc` | `boolean \| TocOptions` | `false` | Build the sidebar TOC from the page's headings (h2–h4; `{ maxLevel: 3 }` stops at h3). |

| Slot | Lands in |
|---|---|
| default | `<div class="content-grid">` inside `<main data-pagefind-body>`. Pages don't write the wrapper. |
| `hero` | `<main>`, full width above the column (homepage / About banner) |
| `head` | end of `<head>` — page-specific CSS or meta |
| `sidebar` | the left nav, between the TOC and the highlights panel |
| `scripts` | end of `<body>` (currently unused) |

- **The body is rendered to a string first**, so the TOC can be extracted from
  it, then injected with `set:html`. A hydrated island (`client:*`) in a page
  body would not survive — keep pages static.
- **Articles get "More Articles" for free:** on `/articles/*` it appends 4
  shuffled [`ArticleCards`](#articlecards), excluding the current page.

---

## 2. `article/` — page furniture

```astro
<header>
  <TopicTags />
  <PageTitle />
  <PubDate />
  <FrontImage src="/articles/<slug>/banner.webp" />
</header>
```

`TopicTags`, `PageTitle` and `PubDate` **take no props on an article or post**:
each looks up the page's own `pages.json` entry from its URL and fails the build
if there is none. Their props only override that, or serve pages elsewhere.

| Component | Props (all optional) | Renders |
|---|---|---|
| `TopicTags` | `topics: string[]` | `Topics: a, b, c`. Each topic is a `data-pagefind-filter="topic"` span (commas outside it), which feeds the top bar's tag browser. |
| `PageTitle` | `title`, `variant: "article" \| "post"` | The `<h1>`: `.title` or `.post-title`, chosen from the collection. |
| `PubDate` | `pubDate` (ISO) | `Posted <date>` in `.date`. |

### FrontImage

The banner under the title.

| Prop | Type | Default | Notes |
|---|---|---|---|
| `src` | `string` | — | |
| `alt` | `string` | `"banner"` | |
| `width` | `string` | `"100%"` | Desktop only; 100% under 580px. |
| `fetchpriority` | `"high" \| "low" \| "auto"` | `"high"` | It's usually the LCP image. |

Children become the caption. It opens in the [lightbox](#lightbox) like any
body image; `class="no-lightbox"` opts out.

### Figure

**The only way to place a body image.** Sizing, centring and responsiveness are
decided here, not per page.

| Prop | Type | Default | Notes |
|---|---|---|---|
| `src` | `string` | — | Files go in `public/articles/<slug>/`. |
| `alt` | `string` | `""` | `""` is right for decorative figures. |
| `width` | `string` | `"100%"` | Desktop only — 80% under 1080px, 100% under 580px. |
| `maxWidth` | `string` | — | Hard cap, e.g. `"520px"`. |
| `captionWidth` | `string` | full | Narrower caption. |
| `flush` | `boolean` | `false` | Drop the margins. |
| `loading` | `"lazy" \| "eager"` | — | `"lazy"` well below the fold. |

```astro
<Figure src="/articles/<slug>/Bessel1st.webp" width="65%">
  First few Bessel functions of the 1st kind.
</Figure>
```

Children become the numbered `<figcaption>`.

### Table

**The only way to put a table in body copy.** It emits the `.table-wrapper` /
`.p-table` pair; without the wrapper a table overflows on mobile and nothing
catches it. `id` and `class` (plus any other attribute) land on the `<table>`.

```astro
<Table id="growth-table">
  <thead><tr><th>n</th><th>T(n)</th></tr></thead>
  <tbody><tr><td>1</td><td>O(1)</td></tr></tbody>
  <caption>Growth of the running time.</caption>
</Table>
```

Use `<thead>` and `<tbody>` (the rules are drawn on them); a `<caption>` sits
below and is numbered. The styles are scoped to `Table.astro`, so page rules
for a table's *content* need care:

- From a page's scoped `<style>`: `:global(.p-table) td:first-child { … }`
  (see `articles/time-complexity-of-an-algorithm`).
- A global rule on a cell class must outrank the scoped ones:
  `.table-wrapper .p-table .rating` (see `posts/tested-food-places`).

### Quote

The pull quote that opens most articles.

| Prop | Type | Notes |
|---|---|---|
| `content` | `string` | Without quotation marks — CSS adds them. |
| `author` | `string` | Without a dash — CSS adds it. |

### ContinueButton

Previous/next links at the foot of a multi-part article.

| Prop | Type | Default |
|---|---|---|
| `prevHref` / `nextHref` | `string` | — |
| `prevLabel` / `nextLabel` | `string` | `"Previous"` / `"Next"` |

A missing href hides its button but keeps the space, so a lone "Next" stays on
the right.

### TableOfContents

**Normally not rendered by hand** — pass `toc` to `BaseLayout` and it is built
from the page's markup ([`DEVELOPMENT.md` §3.1](DEVELOPMENT.md#31-table-of-contents)).
For a list the markup can't express, pass `items: TocItem[]`
(`{ label, href, children? }`) and optionally `title`.

`tocHighlight.ts` is its script: it marks the entry for the section being read
(the last one above a line a third of the way down the viewport).

---

## 3. `code/` — code blocks

| Component | For | Copy button | Framed |
|---|---|---|---|
| [`CodeBlock`](#codeblock-codebox-shellscript) | generic code / config | yes | no |
| [`CodeBox`](#codeblock-codebox-shellscript) | code needing emphasis, optional line numbers | yes | yes |
| [`ShellScript`](#codeblock-codebox-shellscript) | terminal session with prompts | yes | no |
| [`Sample`](#sample) | console output, pseudo-code | no | no |
| [`TabBox`](#tabbox) | tabs holding any of the above | — | yes |
| [`C`](#c) | inline code in a sentence | — | — |

The first three are highlighted **at build time** by Shiki
(`src/utils/highlight.ts`), in every theme listed in `src/utils/codeThemes.ts`
at once; the reader's setting picks one with CSS. `language` is a
[Shiki language id](https://shiki.style/languages) — an unknown one fails the build.

### Writing a listing: use `is:raw`

```astro
    <CodeBlock language="cpp" is:raw>
      #include <cstdlib>
      int main() {
          return 0;
      }
    </CodeBlock>
```

With `is:raw` the children arrive as literal text (`<`, `{` not parsed), and a
listing that starts on the line **after** the tag is dedented, so it can sit at
the page's indentation. One starting on the tag's own line is taken as written.
The one thing to avoid inside `is:raw` is a literal entity like `&lt;` — it gets
decoded.

Without `is:raw`, the HTML compressor eats whitespace touching the tag, so the
listing must start at column 0 with `<` / `{` escaped. Works the same on all
four block components.

### CodeBlock, CodeBox, ShellScript

| Prop | On | Default | Meaning |
|---|---|---|---|
| `language` | `CodeBlock`, `CodeBox` | `"bash"` | Shiki language id |
| `code` | all three | — | String instead of children (e.g. ``code={raw`…`}``) |
| `lineNumbers` | `CodeBox` | `false` | CSS-counter gutter, never copied |
| `host` | `ShellScript` | `"pc"` | Hostname in the `[user@host] $` prompt |
| `output` | `ShellScript` | — | e.g. `"2-5, 8"`: output lines — no prompt, dimmed |
| `continuationStr` | `ShellScript` | — | A line ending in this gets a `>` prompt on the next (e.g. `{"\\"}`) |

Prompts and line numbers are generated content, so they are never copied.

### Sample

`<pre class="console">`, plain text, **no copy button** — the content isn't
meant to be run. Props: `code`, `id`, `class`, `style` (overrides the default
`margin: 25px auto`).

### TabBox

`tabs: string[]` — one label per child pane, in order.

```astro
<TabBox tabs={["Square", "Circular"]}>
  <Sample is:raw>…</Sample>
  <Sample is:raw>…</Sample>
</TabBox>
```

Panes need no ids. Keyboard (arrows, Home/End) and ARIA roles are handled, and
several TabBoxes can share a page.

### C

Inline code, not highlighted: `<p>Compile with <C>-g</C>.</p>`. Anything with
braces or backslashes goes through `raw`: ``<C code={raw`std::vector<T>{}`} />``.
The `.inline-code` style is scoped here, so a hand-written
`<code class="inline-code">` renders unstyled.

### CopyButton, raw.astro

`CopyButton` is already inside `CodeBlock` / `CodeBox` / `ShellScript`; it copies
from its `closest(".code-container")`. `raw.astro` exports `raw = String.raw`,
the code counterpart of [`tex`](#texastro).

---

## 4. `math/` — equations & environments

Math is typeset by `public/assets/js/katex-render.js`, loaded on every page.
`\begin{equation}` / `\begin{align}` get document-wide numbers; `$$…$$` and
`\[…\]` stay unnumbered. Shared macros (`\R`, `\N`, `\pd`, `\lcm`, …) live in the
`macros` object at the top of that file — add new ones there, not per page.

**All display math goes in `<E>`** — it keeps LaTeX out of search results
([`SEARCH.md` §3](SEARCH.md#3-excluding-display-math)).

### tex.astro

`export const tex = String.raw`. Astro eats backslashes in quoted attributes, so
LaTeX must arrive as ``{tex`…`}``:

```astro
import { tex } from "@components/math/tex.astro";
```

### E and M

Display (`<div class="equation">`) and inline (`<span class="inline-math">`)
math. Both take the LaTeX as children or as `code`.

```astro
<E>{tex`\begin{equation} u_{tt} = c^2\nabla^2 u \end{equation}`}</E>
<M>{tex`u_{tt}`}</M>   <M>x^2</M>
```

Plain text works when there are no braces or backslashes, and so does plain
`$x^2$` in prose. `<Equation>` is a legacy alias of `<E>`.

### Theorem, Problem, Solution, Proof

| Component | Renders | Props |
|---|---|---|
| `Theorem` | `<div class="theorem">` | `name` — shown in parentheses after "Theorem" |
| `Problem` | `<div class="problem">` | — |
| `Solution` | `<details class="solution">`, open by default | `summary` (`"Solution"`), `open` (`true`) |
| `Proof` | `<div class="proof">` with an italic **Proof.** lead-in | `label` (`"Proof"`; the period is added) |

A `Proof` body **must open with a `<p>`** — the lead-in attaches to its first
paragraph. Prose in all four stays searchable; display math in them still goes
in `<E>`.

---

## 5. `listings/` — catalog views

All read the `pages.json` collections at build time; nothing fetches at runtime.

### ArticleCards

| Prop | Type | Default | Notes |
|---|---|---|---|
| `count` | `number` | all | Max cards. |
| `showDetails` | `boolean` | `true` | Tags, description and date. |
| `shuffle` | `boolean` | `false` | Makes the build non-deterministic. |
| `excludePath` | `string` | `""` | Path to drop, normally the current page. |

Card images resolve against `/media/Images/`.

### PostList

Every post, in `pages.json` order. No props.

### MaterialCard

A recommended book: `title`, `author`, `description`, `image`, optional
`imageId`, and `links: { label, href }[]` (listed after "You can buy this on:").

---

## 6. `site/` — chrome on every page

`BaseLayout` renders all of these; pages never touch them (except `HeroBanner`).

### TopBar

Home/about links, hamburger, search, tag browser, RSS, share menu, dark-mode
toggle, settings panel and reading-progress bar. Behaviour lives in
`site/topbar/`:

| Module | Does |
|---|---|
| `nav.ts` | Sidebar open/closed (opens by default at ≥1200px). |
| `theme.ts` | Dark mode and the two code-theme selects, persisted and synced across tabs. |
| `settings.ts` | Font, font size and scroll-indicator selects; the progress bar. |
| `search.ts` | Search field and tag browser — see [`SEARCH.md`](SEARCH.md). |
| `share.ts` | Share dropdown. |

An inline script in `BaseLayout`'s `<head>` applies dark mode and the code theme
before first paint; `theme.ts` takes over after.

**Adding a share platform** takes two edits: an entry in `sharePlatforms` in
`TopBar.astro` (`{ id, title, icon }`, `icon` a Font Awesome brand name) and the
same `id` in `SHARE_URLS` in `share.ts`. Without the second it renders but does
nothing.

### Logo, Footer

`Logo`: the sidebar logo, GitHub badge and collapsible nav list. `Footer`:
copyright, policy/license links and the social row. No props.

### Lightbox

Click any content image to view it fullscreen, with prev/next across the page.
No markup, no props: its script lazy-loads yet-another-react-lightbox
(`site/lightbox/viewer.ts`, plain React, no island) on first click. Everything
opens except `#logoImage`, the sidebar highlights' covers and anything with
`class="no-lightbox"`.

### HeroBanner

The homepage / About banner, in the `hero` slot:
`<HeroBanner slot="hero" art="gradient" />`. A dark panel (title, tagline,
caption) on the left, animated maths art in the rest. The `ARTS` table at the
top of `HeroBanner.astro` maps each `art` to a component in `site/canvas/`:

| `art` | Component | Placement |
|---|---|---|
| `"gradient"` | `GradientCanvas` — gradient lines of drifting Neumann modes, run in a worker | behind the panel |
| `"preprint"` | `PreprintFigure` — "Fig. 1", heat cooling in an insulated rod (SVG) | beside the panel; behind it below 860px |

Where the panel covers the art (phones, narrow "beside") it turns translucent.
The banner is always dark and excluded from search.

**Adding an art:** a component in `site/canvas/` that fills its box and is
transparent where it draws nothing, plus an `ARTS` entry. `EquationsCanvas`,
`MazeCanvas` and `FluidCanvas` are built this way but not registered — each
one's header comment has the entry to paste. Register only arts in use: every
registered art's script ships on both pages. How each art works is documented
in its own source file.

### HighlightsAndAttribute

The lower sidebar: repo stats, featured articles and attribution.

- **Stats** are read from git at build time (`src/utils/repoStats.ts`).
  "Content Updates" are commits touching reader-facing pages, as defined by the
  `CONTENT_PATHS` pathspec there; "Code Updates" is the rest.
- **Featured articles** are the `highlightLinks` array — edit it to change them.

---

## 7. `ui/` — primitives

### Icon

A Font Awesome icon as inline SVG, resolved at build time. Sized `1em`, filled
with `currentColor` — style the parent.

| Prop | Type | Default | Notes |
|---|---|---|---|
| `name` | `string` | — | No `fa-` prefix: `"moon"`, `"github"`. |
| `prefix` | `"fas" \| "fab"` | `"fas"` | Solid vs brands. |
| `class` / `style` / `id` | `string` | — | |

### FeatureSlider

The homepage's feature carousel.

| Prop | Type | Default | Notes |
|---|---|---|---|
| `slides` | `{ id, title }[]` | — | `id` names the slot holding the slide; `title` becomes its `<h1>`. |
| `label` | `string` | `"Featured articles"` | Accessible name. |

```astro
<FeatureSlider slides={[{ id: "chladni", title: "Chladni Patterns" }]}>
  <Fragment slot="chladni">…</Fragment>
</FeatureSlider>
```

The spot is as tall as its tallest slide, so the page doesn't jump between
slides. Arrow keys and swipe work; without JS the first slide shows.

### TwoColumns

`<div class="two-columns-block">` around its children; extra attributes pass
through.

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
import { getEntryMeta } from "@utils/getEntryMeta";

const meta = await getEntryMeta("articles", Astro.url.pathname);
---

<BaseLayout title={meta.title} description={meta.description} toc>
  <header>
    <TopicTags />
    <PageTitle />
    <PubDate />
    <FrontImage src="/articles/<slug>/banner.webp" />
  </header>

  <Quote content="…" author="…" />

  <section>
    <h2>Introduction</h2>
    <p>Inline math like $x^2$ is fine in prose, and <C>--flag</C> is inline code.</p>
    <E>{tex`\begin{equation} u_{tt} = c^2\nabla^2 u \end{equation}`}</E>
    <Figure src="/articles/<slug>/plot.webp" width="70%">A caption.</Figure>
    <CodeBlock language="python" is:raw>
      print("hi")
    </CodeBlock>
  </section>
</BaseLayout>
```

| Symptom | Cause |
|---|---|
| Code loses its indentation, or `{x}` / `<T>` vanish | No `is:raw` ([§3](#writing-a-listing-use-israw)) |
| Build fails: "Language … not found" | `language` isn't a Shiki id |
| TabBox shows the wrong pane | `tabs` labels and child panes out of step |
| LaTeX in search results | Display math not wrapped in `<E>` |
| Backslashes vanish from an equation | LaTeX in a quoted attribute instead of ``{tex`…`}`` |
| Build fails: "Entry metadata not found" | Page path matches no `link` in `pages.json` |
