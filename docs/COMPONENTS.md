# Component Reference

Every `.astro` component in `src/components/`, what it renders, and how to call
it. For the workflow around them (commands, creating a page, search, styling)
see [`DEVELOPMENT.md`](DEVELOPMENT.md); for the search internals see
[`SEARCH.md`](SEARCH.md).

Import through the path aliases, never relative paths:

```astro
import BaseLayout from "@layouts/BaseLayout.astro";
import Figure from "@components/article/Figure.astro";
```

---

## Contents

- [§0 Conventions](#0-conventions)
- [§1 `layouts/` — BaseLayout](#1-layouts--baselayout)
- [§2 `article/` — page furniture](#2-article--page-furniture)
- [§3 `code/` — code blocks](#3-code--code-blocks)
- [§4 `math/` — equations & environments](#4-math--equations--environments)
- [§5 `listings/` — catalog views](#5-listings--catalog-views)
- [§6 `site/` — chrome on every page](#6-site--chrome-on-every-page)
- [§7 `ui/` — primitives](#7-ui--primitives)
- [§8 Cheat-sheet](#8-cheat-sheet)

---

## 0. Conventions

A few patterns hold across the whole tree; knowing them means most components
need no explanation beyond their props.

**Props are typed.** Each component declares `interface Props` in its
frontmatter and destructures `Astro.props` with defaults. TypeScript checks call
sites, so a typo in a prop name is a build error, not a silent no-op.

**Children are content, props are configuration.** `<Figure>`'s children are its
caption, `<Theorem>`'s children are its body, `<CodeBox>`'s children are the
code. Components that take no children (`PageTitle`, `PubDate`, `Icon`) are pure
configuration.

**Two kinds of `<style>`.** A plain `<style>` block is scoped by Astro to that
component's own markup (`Figure`, `FrontImage`, `Icon`, `Logo`, `TopicTags`).
`<style is:global>` escapes scoping and is used where the rules must reach markup
the component doesn't own (`ContinueButton`, `HighlightsAndAttribute`). Sitewide
rules live in `src/assets/css/`, not in components.

**Two kinds of `<script>`.** A bare `<script>` in a component is bundled and
hoisted by Astro — it ships once, module-scoped, and is how `TabBox`,
`CopyButton`, `TableOfContents`, `TopBar`, `Lightbox`, `Banner` and
`HighlightsAndAttribute` get their behaviour. `<script is:inline>` opts out of
bundling and is reserved for what must run before first paint (`BaseLayout`'s
dark-mode / code-theme snippet) and third-party assets loaded by URL (Google
Analytics).

Because Astro decides which pages a hoisted script lands on from the *module
graph* — not from whether the markup actually rendered — a component imported by
`BaseLayout` ships its script site-wide even on pages where it renders nothing.
Every such script therefore returns early when its markup is absent.

**Styling hooks.** Components that need per-instance sizing set a CSS custom
property in a `style` attribute (`--figure-img-width`, `--front-img-width`)
rather than hard-coded inline dimensions, so media queries can still win without
`!important`.

---

## 1. `layouts/` — BaseLayout

### BaseLayout

The shell every page renders into: `<head>`, top bar, sidebar, main region,
"More Articles", footer, and the KaTeX / Pagefind bootstrapping.

| Prop | Type | Default | Meaning |
|---|---|---|---|
| `title` | `string` | — | Page title; rendered as `{title} \| hilbertcube`. |
| `description` | `string` | `""` | `<meta name="description">`. |
| `keywords` | `string` | site default | `<meta name="keywords">`. |
| `activeButton` | `string` | `""` | ID of the nav element to underline. Injects `#<id> { text-decoration: underline }` into the head, so it must be a real id — the nav ids are `Home-button` and `About-button`. |
| `toc` | `boolean \| TocOptions` | `false` | Build the sidebar Table of Contents from this page's own headings. Covers `<h2>`–`<h4>`; `{ maxLevel: 3 }` to stop at `<h3>`. |

**Slots**

| Slot | Lands in |
|---|---|
| default | `<main class="general-wrapper" data-pagefind-body>` — the page body |
| `head` | end of `<head>`, for page-specific stylesheets or meta |
| `sidebar` | the left nav, between the TOC and the highlights panel |
| `scripts` | end of `<body>`, for page-specific scripts (currently unused) |

```astro
<BaseLayout title="Chladni Patterns, Part 2" description="…" activeButton="articles" toc>
  <div class="content-grid"> … </div>
</BaseLayout>
```

**Two behaviours worth knowing.**

*The body is rendered before the sidebar.* `BaseLayout` calls
`Astro.slots.render("default")` in its frontmatter, runs `extractToc()` over the
resulting HTML, then injects it with `<Fragment set:html={body} />`. That is what
lets the TOC be derived from the page's real markup. The cost: the body passes
through a string, so a **hydrated island (`client:*`) inside a page body would
not survive**. Every page here is static HTML, so this is a non-issue in
practice — but it is the reason to keep it that way.

*Articles get a "More Articles" strip for free.* When the pathname starts with
`/articles/`, `BaseLayout` appends an [`ArticleCards`](#articlecards) block
(4 cards, shuffled, current page excluded) marked `data-pagefind-ignore`.

---

## 2. `article/` — page furniture

The header stack of a typical article, in the order it appears:

```astro
const meta = await getEntryMeta("articles", Astro.url.pathname);

<TopicTags topics={meta.topics} />
<PageTitle title={meta.title} />
<PubDate pubDate={meta.pubDate} />
<FrontImage src="/articles/<slug>/banner.webp" />
```

`getEntryMeta` (in `src/utils/`) finds the page's own entry in the `articles` /
`posts` collection by matching `Astro.url.pathname` against `data.link`, and
throws if there is no match — so a page and its `pages.json` entry can't
drift apart silently.

### TopicTags

Renders `Topics: a, b, c` under the banner.

| Prop | Type | Default |
|---|---|---|
| `topics` | `string[]` | `[]` |

Each topic sits in its own `<span data-pagefind-filter="topic">`, which is what
feeds the top bar's tag browser. **The commas are outside those spans** so they
never become part of a filter value. Renders nothing for an empty list.

### PageTitle

The page `<h1>`.

| Prop | Type | Default | Notes |
|---|---|---|---|
| `title` | `string` | — | |
| `variant` | `"article" \| "post"` | `"article"` | Picks `.title` vs `.post-title`. |

### PubDate

| Prop | Type |
|---|---|
| `pubDate` | `string` (ISO `YYYY-MM-DD`) |

Renders `Posted <date>` in `.date`. It runs `formatDate()` internally, so pages
hand over the raw `meta.pubDate` and never import the formatter.

### FrontImage

The banner image under the title. Owns the `figure` wrapper and the `.front-img`
rule that articles used to repeat in their own `<style>` blocks.

| Prop | Type | Default | Notes |
|---|---|---|---|
| `src` | `string` | — | |
| `alt` | `string` | `"banner"` | |
| `width` | `string` | `"100%"` | Desktop width; always collapses to 100% under 580px. |
| `fetchpriority` | `"high" \| "low" \| "auto"` | `"high"` | It's the LCP image on most articles. |

Children become the caption. Article front images **do** open in the lightbox —
`Lightbox.astro` uses a blacklist (`#logoImage`, `#home-banner img`,
`.recommend-img img`, `.no-lightbox`), so add `no-lightbox` to opt an image out. The viewer itself is
yet-another-react-lightbox, mounted with plain React from
`components/site/lightbox/viewer.ts` — no React integration, no island.

### Figure

**The single way to place an image in article or post body copy.** Width,
centering, rounding and responsive behaviour are decided here instead of per
page — it replaced the old `.image-block` / `.image` classes whose sizes had to
be written inline or hung off per-page ids.

| Prop | Type | Default | Notes |
|---|---|---|---|
| `src` | `string` | — | |
| `alt` | `string` | `""` | `""` is correct for decorative figures. |
| `width` | `string` | `"100%"` | **Desktop only** — 1080px drops everything to 80%, 580px to 100%. |
| `maxWidth` | `string` | container | Hard cap, e.g. `"520px"`. |
| `captionWidth` | `string` | full | Narrower caption than the figure. |
| `flush` | `boolean` | `false` | Drops the figure's margins, for tight columns. |
| `loading` | `"lazy" \| "eager"` | — | Use `"lazy"` well below the fold. |

```astro
<Figure src="/articles/<slug>/Bessel1st.webp" width="65%">
  First few Bessel functions of the 1st kind.
</Figure>
```

Children become the `<figcaption>`; figure numbering and caption colors come
from the global rules in `base/_typography.css`.

### Table

**The single way to put a table in body copy.** It renders the
`.table-wrapper` / `.p-table` pair together — the wrapper is what gives the
table horizontal scroll on a phone, and a hand-written table that omits it
looks fine on a desktop and overflows the page on mobile with nothing in the
build to catch it.

| Prop | Type | Notes |
|---|---|---|
| `id` | `string` | Lands on the `<table>`. |
| `class` | `string` | Added alongside `.p-table`. |

Anything else is spread onto the `<table>`.

```astro
<Table id="growth-table">
  <thead><tr><th>n</th><th>T(n)</th></tr></thead>
  <tbody><tr><td>1</td><td>O(1)</td></tr></tbody>
  <caption>Growth of the running time.</caption>
</Table>
```

Use `<thead>` and `<tbody>`: the header rule is drawn on `thead`, the row rules
inside `tbody`. A `<caption>` sits below the table and is numbered
("Table. 1: …") by the global rule in `base/_typography.css`.

**Per-table rules.** A page styles its own table's *content* — which columns
centre, which may not wrap — never the look itself. Two gotchas when writing
them, both from the style now being scoped to this component:

- The `<table>` is `Table.astro`'s element, so it carries *its* scope id, not
  the page's. A page's scoped `<style>` reaches it with
  `:global(.p-table) td:first-child { … }` — the cells are slot content and
  stay page-scoped, so the `td` half still pins the rule to that page
  (see `articles/time-complexity-of-an-algorithm`).
- Scoping buys the component's cell rules an extra attribute of specificity,
  so a *global* page rule aimed at a cell class has to be qualified to outrank
  them: `.table-wrapper .p-table .rating`, not `.p-table .rating`
  (see `posts/tested-food-places`).

### ContinueButton

Previous/next navigation at the foot of a multi-part article.

| Prop | Type | Default |
|---|---|---|
| `prevHref` / `nextHref` | `string` | — |
| `prevLabel` / `nextLabel` | `string` | `"Previous"` / `"Next"` |

```astro
<ContinueButton
  prevHref="../the-quest-to-finding-chladni-patterns-1"
  nextHref="../the-quest-to-finding-chladni-patterns-3"
/>
```

A missing href hides that button with `visibility: hidden` rather than removing
it, so a lone "Next" stays on the right where readers expect it.

### TableOfContents

**You normally don't render this.** Pass `toc` to `BaseLayout` and it builds the
list from the page's own `<section>` / `<h2>`–`<h4>` markup — adding a section
to the page is all it takes to add it to the TOC.

| Prop | Type | Default |
|---|---|---|
| `items` | `TocItem[]` | — |
| `title` | `string` | `"Table of Contents"` |

Render it by hand only for a list the markup can't express:

```astro
<TableOfContents items={[
  { label: "Introduction", href: "#intro" },
  { label: "Methods", href: "#methods", children: [{ label: "A", href: "#a" }] },
]} />
```

Labels come from page markup, so they are HTML-escaped before being emitted.
To relabel or skip a heading in the automatic list, use `data-toc="…"` /
`data-toc="skip"` — see `src/utils/toc.ts`.

### tocHighlight.ts

Not a component — the hoisted script behind `TableOfContents`. It marks the TOC
entry for the section being read: the last entry starting above a "reading line"
about a third of the way down the viewport (never above the fixed top bar). Once
the page runs out of scroll the line slides to the viewport bottom, so trailing
short sections still get their turn. Positions are re-read every pass and a
`ResizeObserver` re-runs it, so late layout shifts from images or KaTeX need no
bookkeeping.

---

## 3. `code/` — code blocks

Five containers with different chrome. Pick by what the block *is*:

| Component | Renders | Copy button | Framed box |
|---|---|---|---|
| [`CodeBlock`](#codeblock) | generic code / config | yes | no |
| [`CodeBox`](#codebox) | code needing emphasis, optional line numbers | yes | yes |
| [`ShellScript`](#shellscript) | interactive terminal session, with prompt | yes | no |
| [`Sample`](#sample) | console output, pseudo-code — not a runnable listing | no | no |
| [`TabBox`](#tabbox) | tabbed container holding any of the above | — | yes |

`CodeBlock`, `CodeBox` and `ShellScript` are highlighted **at build time** by
Shiki (`src/utils/highlight.ts`): pages ship finished, coloured HTML and need no
script or language list. `language` is a [Shiki language id](https://shiki.style/languages)
(`cpp`, `python`, `bash`, `json`, `cmake`, …); an unknown one fails the build.
Each block is rendered in every code theme at once, and the reader's choice in
Settings picks one with CSS — see `src/utils/codeThemes.ts` to change the list.

For a run of code *inside a sentence* — a flag, an identifier, a filename —
use [`C`](#c), which is not a container and is not highlighted.

> To convert legacy raw `<div class="code-container">` markup, run
> `python3 scripts/convert-code-blocks.py <file> --apply`
> (see [`AUTOMATION.md`](AUTOMATION.md)).

### CodeBlock

`<div class="code-container"><CopyButton /><pre class="shiki">…`.

| Prop | Type | Default |
|---|---|---|
| `language` | `string` | `"bash"` |
| `code` | `string` | — |

Write the listing with `is:raw` so it can be indented to match the page — see
[indenting a listing](#the-indentation-gotcha). `code` replaces the children
with a string (e.g. `code={raw`…`}`).

### CodeBox

`CodeBlock` inside a `.box` frame, plus optional line numbers (a CSS-counter
gutter, so they are never selected or copied).

| Prop | Type | Default |
|---|---|---|
| `language` | `string` | `"bash"` |
| `lineNumbers` | `boolean` | `false` |
| `code` | `string` | — |

```astro
<CodeBox language="python" lineNumbers>import numpy as np
…
</CodeBox>
```


### ShellScript

A bash block with a `[user@host] $` prompt in front of every command. The
prompts are generated content, so they are never selected or copied.

| Prop | Type | Default | Meaning |
|---|---|---|---|
| `host` | `string` | `"pc"` | the hostname in the prompt |
| `output` | `string` | — | e.g. `"2-5, 8"` — lines that are output, not input: no prompt, no highlighting, dimmed |
| `continuationStr` | `string` | — | a line ending in this continues onto the next, which gets a `>` prompt (e.g. `{"\\"}`) |
| `code` | `string` | — | replaces the children, as on `CodeBlock` |

### Sample

Console output or pseudo-code: `<pre class="console"><code>`. **No copy
button** — deliberately, because the content isn't meant to be run. Written
like the highlighted blocks (`is:raw`, indented, `<` literal), but not
highlighted. The content is plain text, not HTML: tags show as typed.

| Prop | Type | Notes |
|---|---|---|
| `code` | `string` | Alternative to children. |
| `id` | `string` | Set on the container. |
| `class` | `string` | Merged onto the container. |
| `style` | `string` | Inline style on the container; overrides the default `margin: 25px auto`. |

### TabBox

A tabbed container. Each child is one pane, paired with a label by position.

| Prop | Type | Notes |
|---|---|---|
| `tabs` | `string[]` | One label per pane, in pane order. |

```astro
<TabBox tabs={["Square", "Circular"]}>
  <Sample is:raw>
    …
  </Sample>
  <Sample is:raw>
    …
  </Sample>
</TabBox>
```

The first pane shows on load; CSS hides the rest until the script runs, so
panes need no `id`, shared class or inline `display: none`. The script adds the
`tablist` / `tab` / `tabpanel` roles and `aria-selected`, supports arrow keys and
Home/End, and only touches panes inside its own box — several TabBoxes can share
a page. Panes lose their own margin and get a square top-left corner where they
meet the tab strip; the tab styling is scoped to `TabBox.astro`.

### C

Inline code — `<code class="inline-code">`, styled but not highlighted. The
code-side twin of [`M`](#m), and the only member of `code/` that isn't a block.

| Prop | Type | Default |
|---|---|---|
| `code` | `string` | — (falls back to the slot) |

```astro
<p>Compile with <C>-g</C> to embed DWARF debug information.</p>
<C code={raw`std::vector<T>{}`} />
```

Plain slot text is fine when the content has no braces or backslashes; braces
open an Astro expression and quoted attributes eat backslashes, so anything
carrying either goes through [`raw`](#rawastro), exactly as with `M`/`tex`.

The `.inline-code` rule is **scoped to this component** — a hand-written
`<code class="inline-code">` in a page renders unstyled. Use `<C>`.

### CopyButton

`<button class="copy-btn">Copy</button>`, already included by `CodeBlock`,
`CodeBox` and `ShellScript`. Render it directly only in a hand-rolled container.
It finds its code with `button.closest(".code-container")`, so it copies the
right block regardless of document order — and containers without a button
(`Sample`) don't shift it.

### raw.astro

Not a component: `export const raw = String.raw`, the code-block counterpart of
[`tex`](#texastro).

```astro
import { raw } from "@components/code/raw.astro";
```

### The indentation gotcha

The `<pre>` lives *inside* these components, so plain slot children are **not**
whitespace-protected in the calling page: Astro's HTML compressor collapses
whitespace that touches a tag, and `{`, `<` are parsed as Astro. That is why a
plain listing has to start at column 0 against the opening tag, with `<` / `{`
escaped as `&lt;` / `&#123;`.

**Add `is:raw` instead.** It is Astro's own directive: the children reach the
component as literal text — whitespace kept, `<`, `{`, `}` not parsed — and the
component strips the indentation the lines share. So the block can sit at the
page's indentation, written exactly as the code reads:

```astro
    <p>Here is a minimal program with a definite leak:</p>
    <CodeBlock language="cpp" is:raw>
      #include <cstdlib>
      int main() {
          return 0;
      }
    </CodeBlock>
```

This works the same on `CodeBlock`, `CodeBox`, `ShellScript` and `Sample`.

The rule the components apply: a listing that starts on the line **after** its
opening tag is dedented; one that starts on the tag's own line is taken exactly
as written, so an excerpt that is deliberately indented stays indented. Inside
`is:raw`, the one thing to avoid is a literal `&lt;`-style entity in the code —
it is decoded like an escaped one.

---

## 4. `math/` — equations & environments

Math is typeset by `public/assets/js/katex-render.js`, which `BaseLayout` loads
on every page — **a page needs no math script of its own.** `\begin{equation}`
and `\begin{align}` get document-wide sequential numbers (KaTeX restarts its
counter per render call, so the driver strips that and injects a running
`\tag{n}`); `$$…$$` and `\[…\]` stay unnumbered.

Shared `\newcommand` / `\DeclareMathOperator` macros — `\R`, `\N`, `\Z`, `\pd`,
`\lbrac`, `\lcm`, … — live in the `macros` object at the top of
`katex-render.js`. Add new ones there rather than per page.

**Display math must be wrapped**, never left loose in the page, because
`.equation` is excluded from the Pagefind index — a bare `$$…$$` would dump
`\frac`, `\sum` and `\begin` into search results. See
[`DEVELOPMENT.md` §5](DEVELOPMENT.md#5-math).

### tex.astro

`export const tex = String.raw`. Astro eats backslashes in quoted attributes and
treats `{` specially in template text, so LaTeX has to arrive as a raw template
literal:

```astro
import { tex } from "@components/math/tex.astro";
```

### E

Display equation — `<div class="equation">`.

```astro
<E>{tex`\begin{equation} u_{tt} = c^2\nabla^2 u \end{equation}`}</E>
<E code={tex`\begin{equation} c = \frac{2Lf}{\sqrt{n^2 + m^2}} \end{equation}`} />
```

| Prop | Type | Notes |
|---|---|---|
| `code` | `string` | Alternative to children. |

The default slot also accepts the legacy escaped form (`&#123;`, `&#125;`,
`&amp;`), which is what migrated articles use.

### Equation

Backward-compatible alias of `<E>`, kept so existing usages keep working. Prefer
`<E>` in new articles.

### M

Inline math — `<span class="inline-math">`, typeset in inline mode.

```astro
<M>{tex`u_{tt}`}</M>   <M>x^2</M>   <M code={tex`\lambda = \mu + \nu`} />
```

Plain text is fine when there are no braces or backslashes. Note that ordinary
`$x^2$` in prose also works: the build's `pagefind-ignore-math.mjs` wraps inline
math automatically so it stays out of the index.

### Theorem

`<div class="theorem">` with an optional name.

| Prop | Type | Notes |
|---|---|---|
| `name` | `string` | Rendered by CSS from `data-theorem-name`, formatted as ` (name)`. |

### Problem

`<div class="problem">`. No props — children are the body.

### Solution

A collapsible `<details class="solution">`, **expanded by default**.

| Prop | Type | Default | Notes |
|---|---|---|---|
| `summary` | `string` | `"Solution"` | |
| `open` | `boolean` | `true` | `open={false}` to start collapsed. |

The `open` attribute is rendered into the markup rather than set by a script after
load, so the block never renders closed and then pops open.

Prose inside `Theorem` / `Problem` / `Solution` stays searchable; display math
inside them still belongs in an `<E>`.

---

## 5. `listings/` — catalog views

These read the typed content collections (`src/content.config.ts` over
`src/data/pages.json`) at build time. Nothing here fetches at
runtime.

### ArticleCards

The article card grid, rendered at build time (it replaced a client-side
`article()` function).

| Prop | Type | Default | Notes |
|---|---|---|---|
| `count` | `number` | all | Max cards. |
| `showDetails` | `boolean` | `true` | Tags, description and date under the title. |
| `shuffle` | `boolean` | `false` | Fisher-Yates; note this makes the build non-deterministic. |
| `excludePath` | `string` | `""` | URL path to drop, normally the current page. |

Images resolve against `/media/Images/`. `BaseLayout` already renders this on article pages — see
[§1](#1-layouts--baselayout).

### PostList

The full list of posts, in `pages.json` order — the collection does no
sorting of its own. No props; renders "No posts available" when the collection
is empty.

### MaterialCard

A recommended book/material, with cover art and purchase links.

| Prop | Type | Notes |
|---|---|---|
| `title` | `string` | |
| `author` | `string` | Rendered as `by <author>`. |
| `description` | `string` | |
| `links` | `{ label, href }[]` | Comma-joined after "You can buy this on:". |
| `image` | `string` | Cover image path. |
| `imageId` | `string` | Optional `id` on the `<img>` for CSS overrides. |

---

## 6. `site/` — chrome on every page

`BaseLayout` renders all of these; pages never touch them.

### TopBar

The fixed top bar: home/about links, hamburger, search field, tag browser, RSS
link, share menu, dark-mode toggle, the settings panel, and the reading-progress
bar. The markup lives in `TopBar.astro`; behaviour is split into `site/topbar/`:

| Module | Responsibility |
|---|---|
| `nav.ts` | Sidebar open/closed, from the hamburger and from viewport width (opens at ≥1200px). Enables transitions only after first paint so the sidebar doesn't slide in on load. |
| `theme.ts` | Dark mode and the two code-theme `<select>`s. One `mode` key in localStorage drives the root class and the toggle icon; re-syncs on `pageshow` so bfcache restores don't come back light. The code themes are `data-code-light` / `data-code-dark` on `<html>` — every block already carries every theme's colours, so a change applies instantly and is mirrored to other tabs. |
| `settings.ts` | Body font, font size and scroll-indicator selects, each persisted and mirrored across tabs; plus the progress bar. |
| `search.ts` | Search field and tag browser. Pagefind when its index exists, `pages.json` metadata when it doesn't (i.e. `astro dev`). Documented in depth in [`SEARCH.md`](SEARCH.md). |
| `share.ts` | The share dropdown: opens each platform's share URL for the current page in a new tab, and closes on Escape or an outside click. |

A flash-preventing inline script in `BaseLayout`'s `<head>` adds `.dark-mode`
and the code-theme attributes before first paint; `theme.ts` takes over after.

### Logo

The sidebar logo (a responsive `astro:assets` `<Image>`), the GitHub repo badge
under it, and the collapsible sidebar navigation list.

### Footer

Copyright with the current year, privacy-policy and license links, and the
social row. No props.

### Banner

The home/about banner: a `<canvas>` on the left, the banner image and site title
on the right.

### bannerCanvas.ts

The canvas animation behind `Banner`. Equation SVGs drift and bounce inside the
frame, respawn when they leave it, and a click drops a temporary extra one at
the pointer (`ADDED_LIFETIME_MS`). Speed, rotation, target FPS and the SVG list
are constants at the top of the file.

### HighlightsAndAttribute

The lower sidebar: a build-time repo-stats panel, the highlights list, and the
site attribution block.

Stats come from `getRepoStats()`, **read from git during the build** rather than
from the GitHub API in the browser. The panel renders with
`white-space: pre-line`, so the lines are built without indentation — leading
spaces would collapse.

"Total Updates" counts every human commit, then splits it in two: "Content
Updates" are the commits that touched a page a reader reads (articles, posts,
home, About, privacy policy, their images and their catalog entries), and "Code
Updates" is the remainder — components, styling, build config, tooling, docs. A
commit that revises a page *and* the code behind it counts as content, so the
two never overlap and always add back up to the total.

What counts as content is the `CONTENT_PATHS` / `CONTENT_EXCLUDES` pathspec in
`src/utils/repoStats.ts`, which lists the pre-Astro top-level `blogs/`,
`articles/`, `about/` … layout as well as the current one so the count spans the
whole history. Moving a path between the two buckets means editing that
pathspec — "Code Updates" is derived by subtraction, never listed directly.

The highlights are a hard-coded list of article links (`highlightLinks`)
resolved against the `articles` collection. **To change what's featured, edit that array.** Each entry
expands on click to reveal its cover image, and its link only becomes clickable
once expanded, so the first tap expands instead of navigating.

### The share menu

**Not a component** — the share button lives in the top bar, not in a floating
widget of its own. Its markup is the `share-container` block in `TopBar.astro`,
driven by the `sharePlatforms` array in that file's frontmatter; its behaviour is
`topbar/share.ts`. Each option opens that platform's share URL, built from
`location.href` and `document.title`.

To add a platform you must edit **both** halves: an entry in `sharePlatforms`
(`{ id, title, icon }`, where `icon` is a Font Awesome brand name) and a matching
`id` key in `SHARE_URLS` in `share.ts`. An option whose `id` has no `SHARE_URLS`
entry renders but does nothing.

---

## 7. `ui/` — primitives

### Icon

One Font Awesome icon as inline SVG, resolved at build time by
`getIconSvg()` — no icon font, no client-side FA.

| Prop | Type | Default | Notes |
|---|---|---|---|
| `name` | `string` | — | Without the `fa-` prefix: `"moon"`, `"github"`. |
| `prefix` | `"fas" \| "fab"` | `"fas"` | Solid vs brands. |
| `class` / `style` / `id` | `string` | — | |

```astro
<Icon name="moon" />
<Icon name="github" prefix="fab" />
<Icon name="check" style="color: green;" />
```

The SVG is sized to `1em` and filled with `currentColor`, so it inherits font
size and color from its context — style the parent, not the icon.

### TwoColumns

`<div class="two-columns-block">` with children. Takes an optional `class` and
passes any other attributes straight through.

---

## 8. Cheat-sheet

```astro
---
import BaseLayout from "@layouts/BaseLayout.astro";
import TopicTags from "@components/article/TopicTags.astro";
import PageTitle from "@components/article/PageTitle.astro";
import PubDate from "@components/article/PubDate.astro";
import FrontImage from "@components/article/FrontImage.astro";
import Figure from "@components/article/Figure.astro";
import Table from "@components/article/Table.astro";
import ContinueButton from "@components/article/ContinueButton.astro";
import E from "@components/math/E.astro";
import M from "@components/math/M.astro";
import { tex } from "@components/math/tex.astro";
import CodeBox from "@components/code/CodeBox.astro";
import ShellScript from "@components/code/ShellScript.astro";
import Sample from "@components/code/Sample.astro";
import C from "@components/code/C.astro";
import { raw } from "@components/code/raw.astro";
import { getEntryMeta } from "@utils/getEntryMeta";

const meta = await getEntryMeta("articles", Astro.url.pathname);
---

<BaseLayout title={meta.title} description={meta.description} activeButton="articles" toc>
  <div class="content-grid">
    <header>
      <TopicTags topics={meta.topics} />
      <PageTitle title={meta.title} />
      <PubDate pubDate={meta.pubDate} />
      <FrontImage src="/articles/<slug>/banner.webp" />
    </header>

    <section>
      <h2>Introduction</h2>
      <p>Inline math like $x^2$ is fine in prose, and <C>--flag</C> is inline code.</p>
      <E>{tex`\begin{equation} u_{tt} = c^2\nabla^2 u \end{equation}`}</E>
      <Figure src="/articles/<slug>/plot.webp" width="70%">A caption.</Figure>
      <Table>
        <thead><tr><th>n</th><th>T(n)</th></tr></thead>
        <tbody><tr><td>1</td><td>O(1)</td></tr></tbody>
      </Table>
      <CodeBox language="python" lineNumbers>print("hi")
</CodeBox>
    </section>
  </div>
</BaseLayout>
```

**Things that bite**

| Symptom | Cause |
|---|---|
| Code loses its indentation, or `{x}` / `<T>` vanish | Plain children — add `is:raw` ([§3](#the-indentation-gotcha)) |
| Build fails: "Language … not found" | `language` isn't a Shiki language id |
| A TabBox tab shows the wrong pane, or none | `tabs` labels and child panes are out of step: one child per label, in order |
| LaTeX shows up in search results | Display math not wrapped in `<E>` |
| Backslashes vanish from an equation | LaTeX passed as a quoted attribute instead of `{tex`…`}` |
| Build fails: "Entry metadata not found" | Page's path doesn't match any `link` in `pages.json` |
