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
`CopyButton`, `ShareButton`, `TableOfContents`, `TopBar`, `Banner` and
`HighlightsAndAttribute` get their behaviour. `<script is:inline>` opts out of
bundling and is reserved for third-party assets loaded by URL, which is what
[`Scripts`](#scripts) emits for Prism.

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
| `toc` | `boolean \| TocOptions` | `false` | Build the sidebar Table of Contents from this page's own headings. `{ maxLevel: 4 }` to go deeper. |

**Slots**

| Slot | Lands in |
|---|---|
| default | `<main class="general-wrapper" data-pagefind-body>` — the page body |
| `head` | end of `<head>`, for page-specific stylesheets or meta |
| `sidebar` | the left nav, between the TOC and the highlights panel |
| `scripts` | end of `<body>`, normally holding a [`<Scripts>`](#scripts) tag |

```astro
<BaseLayout title="Chladni Patterns, Part 2" description="…" activeButton="articles" toc>
  <div class="content-grid"> … </div>
  <Fragment slot="scripts">
    <Scripts use={["blog-setting", "python", "line-numbers"]} />
  </Fragment>
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
throws if there is no match — so a page and its `articles.json` entry can't
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

Children become the caption. The `front-img` class must stay on the `<img>`:
`public/assets/js/scripts.js` keys off it to keep banners out of the lightbox.

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
list from the page's own `<section>` / `<h2>` / `<h3>` markup — adding a section
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

All of them need Prism to actually highlight: name the language in
[`<Scripts use={[…]}>`](#scripts) at the bottom of the page.

> To convert legacy raw `<div class="code-container">` markup, run
> `python3 scripts/convert-code-blocks.py <file> --apply`
> (see [`AUTOMATION.md`](AUTOMATION.md)).

### CodeBlock

`<div class="code-container"><CopyButton /><pre><code class="language-…">`.

| Prop | Type | Default |
|---|---|---|
| `language` | `string` | `"bash"` |

### CodeBox

`CodeBlock` inside a `.box` frame, plus optional Prism line numbers.

| Prop | Type | Default |
|---|---|---|
| `language` | `string` | `"bash"` |
| `lineNumbers` | `boolean` | `false` |

```astro
<CodeBox language="python" lineNumbers>import numpy as np
…
</CodeBox>
```

`lineNumbers` also needs `"line-numbers"` in the page's `Scripts` list. (The
line-numbers *stylesheet* is already global, from `BaseLayout`'s head.)

### ShellScript

A command-line block with a shell prompt, via Prism's command-line plugin.

| Prop | Type | Default | Maps to |
|---|---|---|---|
| `host` | `string` | `"pc"` | `data-host` — the hostname in the prompt |
| `output` | `string` | — | `data-output`, e.g. `"2-5"` — lines that are output, not input |
| `continuationStr` | `string` | — | `data-continuation-str` |

Requires `"command-line"` (and usually `"bash"`) in the page's `Scripts` list.

### Sample

Console output or pseudo-code: `<pre class="console"><code>`. **No copy
button** — deliberately, because the content isn't meant to be run.

| Prop | Type | Notes |
|---|---|---|
| `code` | `string` | Alternative to children. |
| `id` | `string` | For use as a [`TabBox`](#tabbox) pane. |
| `class` | `string` | Merged onto the container; a TabBox pane needs the shared `tabClass`. |
| `style` | `string` | Appended after the default `margin: 25px auto`, so it wins. |

### TabBox

A tabbed container. Panes are the children; the buttons show and hide them by a
shared class.

| Prop | Type | Notes |
|---|---|---|
| `tabs` | `{ label, id }[]` | One per tab. `id` must match a pane's `id`. |
| `tabClass` | `string` | Class every pane carries; the script toggles `display` on all of them. |

The first tab is active on load, so **every pane after the first must start
hidden** (`display: none`) — that is not automatic:

```astro
<TabBox
  tabs={[
    { label: "Square", id: "Square-Pseudo-Code" },
    { label: "Circular", id: "Circular-Pseudo-Code" },
  ]}
  tabClass="pseudo-tab"
>
<Sample id="Square-Pseudo-Code" class="pseudo-tab" style="margin: 0;" set:html={raw`…`} />
<Sample id="Circular-Pseudo-Code" class="pseudo-tab" style="margin: 0; display: none;" set:html={raw`…`} />
</TabBox>
```

A pane meeting the tab strip gets a square top-left corner from
`.tab-button-container ~ .code-container > pre` in
`css/components/_code-blocks.css` — no per-pane inline `border-radius` needed.

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

The `<pre>` lives *inside* these components, so slot children are **not**
whitespace-protected in the calling page, and Astro's HTML compressor collapses
whitespace that touches a tag. Two shapes lose their indentation as plain
children:

- a listing whose **first line is indented** (the leading spaces touch the
  opening tag), and
- a listing **containing markup** — `<b>` around pseudo-code keywords, say —
  where every line's indentation touches a tag.

Pass those through `set:html` with `raw`:

```astro
<CodeBox language="python" set:html={raw`    k = 0
    while len(equations) &lt; total:
`} />
```

Listings that start at column 0 and contain no tags are fine as plain children.

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

A collapsible `<details class="solution">`.

| Prop | Type | Default |
|---|---|---|
| `summary` | `string` | `"Solution"` |

Prose inside `Theorem` / `Problem` / `Solution` stays searchable; display math
inside them still belongs in an `<E>`.

---

## 5. `listings/` — catalog views

These read the typed content collections (`src/content.config.ts` over
`public/assets/json/articles.json`) at build time. Nothing here fetches at
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

Entries without both `id` and `link` are skipped. Images resolve against
`/media/Images/`. `BaseLayout` already renders this on article pages — see
[§1](#1-layouts--baselayout).

### PostList

The full list of posts, in `articles.json` order — the collection does no
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

`BaseLayout` renders all of these; pages rarely touch them. The exception is
[`Scripts`](#scripts), which every article uses.

### TopBar

The fixed top bar: home/about links, hamburger, search field, tag browser, RSS
link, dark-mode toggle, the settings panel, and the reading-progress bar. The
markup lives in `TopBar.astro`; behaviour is split into `site/topbar/`:

| Module | Responsibility |
|---|---|
| `nav.ts` | Sidebar open/closed, from the hamburger and from viewport width (opens at ≥1200px). Enables transitions only after first paint so the sidebar doesn't slide in on load. |
| `theme.ts` | Dark mode and the two Prism code-theme `<select>`s. One `mode` key in localStorage drives the root class, the toggle icon and which stylesheet is installed; changes broadcast to other tabs. Re-syncs on `pageshow` so bfcache restores don't come back light. |
| `settings.ts` | Body font, font size and scroll-indicator selects, each persisted and mirrored across tabs; plus the progress bar. |
| `search.ts` | Search field and tag browser. Pagefind when its index exists, `articles.json` metadata when it doesn't (i.e. `astro dev`). Documented in depth in [`SEARCH.md`](SEARCH.md). |

Init order matters and is fixed in `TopBar.astro`: the theme selects must be
restored *before* `initDarkMode`, because they resolve which stylesheet URL each
mode installs.

A flash-preventing inline script in `BaseLayout`'s `<head>` adds `.dark-mode`
before first paint; `theme.ts` takes over after.

### Scripts

Shorthand for the third-party assets a page needs, in `BaseLayout`'s `scripts`
slot.

| Prop | Type |
|---|---|
| `use` | `ScriptAlias[]` |

```astro
<Fragment slot="scripts">
  <Scripts use={["blog-setting", "python", "bash", "line-numbers", "command-line"]} />
</Fragment>
```

Aliases and their URLs live in `src/utils/scripts.ts`, which pins the Prism
version in one place. **Dependencies come along automatically** — Prism core, a
language's base grammar (`cpp` pulls `c`, `tsx` pulls `jsx` + `typescript`), a
plugin's stylesheet — so the list only names what the page actually uses, in any
order. A language alias is also the class to put on the element:
`use={["rust"]}` highlights `<code class="language-rust">`. `ScriptAlias` is a
union of the real keys, so an unknown alias fails the build.

The banner animation ships with `Banner.astro`'s own script and has no alias.

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

The highlights are a hard-coded id list (`highlightIds`) resolved against the
`articles` collection. **To change what's featured, edit that array.** Each entry
expands on click to reveal its cover image, and its link only becomes clickable
once expanded, so the first tap expands instead of navigating.

### ShareButton

The floating share button and its platform row (Facebook, X, WhatsApp, Reddit,
Hacker News, Telegram). Options stagger in 100ms apart rather than popping as a
row; each opens a share URL built from `location.href` and `document.title`.
To add a platform, add it to both `platforms` and `shareUrls`.

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
import ContinueButton from "@components/article/ContinueButton.astro";
import E from "@components/math/E.astro";
import M from "@components/math/M.astro";
import { tex } from "@components/math/tex.astro";
import CodeBox from "@components/code/CodeBox.astro";
import ShellScript from "@components/code/ShellScript.astro";
import Sample from "@components/code/Sample.astro";
import { raw } from "@components/code/raw.astro";
import Scripts from "@components/site/Scripts.astro";
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

    <section id="intro">
      <h2>Introduction</h2>
      <p>Inline math like $x^2$ is fine in prose.</p>
      <E>{tex`\begin{equation} u_{tt} = c^2\nabla^2 u \end{equation}`}</E>
      <Figure src="/articles/<slug>/plot.webp" width="70%">A caption.</Figure>
      <CodeBox language="python" lineNumbers>print("hi")
</CodeBox>
    </section>
  </div>

  <Fragment slot="scripts">
    <Scripts use={["blog-setting", "python", "line-numbers"]} />
  </Fragment>
</BaseLayout>
```

**Things that bite**

| Symptom | Cause |
|---|---|
| Code loses its indentation | Indented first line, or markup inside the listing — use `set:html={raw`…`}` ([§3](#the-indentation-gotcha)) |
| Code isn't highlighted | Language missing from `<Scripts use={…}>` |
| Line numbers don't show | `"line-numbers"` missing from `<Scripts use={…}>` |
| All TabBox panes visible at once | Panes after the first need `display: none` |
| LaTeX shows up in search results | Display math not wrapped in `<E>` |
| Backslashes vanish from an equation | LaTeX passed as a quoted attribute instead of `{tex`…`}` |
| Build fails: "Entry metadata not found" | Page's path doesn't match any `link` in `articles.json` |
