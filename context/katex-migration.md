# MathJax → KaTeX Migration & Escape-Free Math Authoring

_Session summary. Covers the full reworking of the site's math rendering and the
new authoring components._

## Goal (how it evolved)

It started as a small ergonomics request and grew into a full rendering
migration:

1. Make the `Equation` component take LaTeX as a **string** instead of a slot
   full of HTML-entity escapes (`&#123;` / `&#125;` / `&amp;`).
2. Decide MathJax vs KaTeX → **migrate to KaTeX**, rewriting the few parts that
   used `\ref`/`\label`.
3. Add **inline** math authoring without escapes.
4. Give both display and inline math **short tag names**.
5. Roll the new tags out across **all** articles.

## Final architecture

Math renders **client-side with self-hosted KaTeX** (chosen over MathJax for
speed/size/less flash, and over the build-time `rehype-katex` approach because
the articles are authored in `.astro`, not Markdown/MDX — remark/rehype never
sees `.astro` content).

- **Self-hosted KaTeX 0.18.1** in `public/katex/` (`katex.min.css`,
  `katex.min.js`, `contrib/auto-render.min.js`, `fonts/`). `katex` is a
  **devDependency** — it's only the source for those files and for verification.
- **`public/assets/js/katex-render.js`** — the render driver, loaded globally
  from `BaseLayout.astro` (KaTeX CSS in `<head>`; katex.min.js →
  auto-render.min.js → katex-render.js deferred at end of `<body>`).

### What katex-render.js does

- Renders every `.equation` block in display mode.
- Renders every `.inline-math` span (the `<M>` component) in inline mode.
- Runs KaTeX **auto-render** for remaining raw `$…$` / `\(…\)` / `$$…$$` /
  `\[…\]` in prose (ignoring `.equation`, `.inline-math`, and code/pre).
- **Strips a surrounding delimiter pair** (`$$`, `\[`, `\(`, `$`) before
  rendering, so both `\begin{equation}…` and `$$…$$`-wrapped equations work.
- **Custom macros** (formerly the hidden `.mathjax-definition` divs), defined
  once as a JS object: `\R \N \Z \pd \secondpd \fourthpd \lbrac \rbrac \lcm
  \modular`.
- **Equation numbering** — see below. Toggle with `NUMBER_EQUATIONS` at the top
  of the file.

### Equation numbering (important nuance)

KaTeX **does** number `equation`/`align`, but each `.equation` is a separate
`katex.render()` call, so its counter **resets to 1 every time** → every block
showed "(1)". Fix: strip the per-block number (convert `equation`→bare,
`align`→`aligned`, `alignat`→`alignedat`, `gather`→`gathered`) and inject a
**document-wide running `\tag{n}`**, giving sequential numbers 1→N per page.
`$$`/`\[` displays and starred envs stay **unnumbered** (matching old MathJax).
Caveat: multi-row `align` blocks get **one** number per block, not per row.

## Authoring components (in `src/components/math/`)

| Tag | Purpose | Example |
|---|---|---|
| `<E>` (`E.astro`) | display equation (numbered) | `<E>{tex`\begin{equation} u_{tt}=c^2\nabla^2u \end{equation}`}</E>` |
| `<M>` (`M.astro`) | inline math | `<M>{tex`u_{tt}`}</M>` or `<M>c</M>` |
| `tex` (`tex.astro`) | `export const tex = String.raw` | required wrapper whenever there are `{}` or `\` |
| `<Equation>` (`Equation.astro`) | **backward-compat alias of `<E>`** | now unused (all articles migrated); left as a safety net |

Both `<E>` and `<M>` accept a `code={tex`…`}` prop **or** the double-tag slot
form `<E>{tex`…`}</E>` — interchangeable.

### Why `tex` is non-negotiable for `{}`/`\`

- In `.astro` JSX text, a bare `{` starts an expression → needs the template
  literal.
- A **quoted attribute** (`eq="\begin{…}"`) does **not** work: Astro compiles
  attribute values as JS string literals, so `\b`, `\f`, `\r`, etc. are eaten as
  escape sequences (this was tried and reverted). `String.raw`/`tex` is the only
  escape-free carrier for both braces and backslashes.

## Cross-references rewritten (KaTeX has no `\label`/`\ref`)

- `chladni-patterns-1`: removed `\label{eq:X1}`/`\label{eq:Y1}` from the align
  block; rewrote the two prose `(\ref{…})` mentions descriptively ("the $X$ and
  $Y$ eigenvalue problems above").
- `chladni-patterns-3`: removed `\label{eqn:biharmonic1}` (never referenced).

## Responsive equation-number fix

KaTeX pins `.katex-tag` to the container's right edge; on narrow screens a wide
equation overflows underneath it and overlaps. Fix in
`src/assets/css/components/_math.css` (scoped via `:has(> .katex-tag)`): size the
math box to its content with symmetric padding so the number sits just past the
equation and scrolls with it. **Still needs a real browser eyeball** (couldn't
verify visually from CLI).

## Files changed

- **New:** `public/katex/` (self-hosted), `public/assets/js/katex-render.js`,
  `src/components/math/E.astro`, `src/components/math/M.astro`,
  `context/katex-migration.md` (this file).
- **Rewritten:** `src/components/math/Equation.astro` (now a `<E>` alias),
  `public/assets/js/scripts.js` (removed MathJax config),
  `src/assets/css/components/_math.css` (dropped MathJax CSS, added KaTeX sizing +
  number fix), `src/layouts/BaseLayout.astro` (KaTeX includes).
- **All 8 math pages** (`about`, `maximum-and-minimum`, `favorite-problem-of-all-time`,
  `time-complexity-of-an-algorithm`, `accelerating-…`, `chladni-patterns-1/2/3`):
  converted `<Equation>`→`<E>` with `tex`, removed per-page MathJax `<script>` and
  `.mathjax-definition` divs, fixed imports.
- **Removed:** dead local `public/assets/js/mathjax/` copy.
- `README.md`: Tools list MathJax→KaTeX; changelog entry.

## Verification method

Since rendering is client-side, correctness was checked by **replaying the exact
render/numbering logic in Node against `katex` 0.18.1** over the built `dist/`
HTML — every `.equation` block (with the numbering transform) and `<M>` span run
through `renderToString` with `throwOnError`. Final state: **186 display
equations + inline, 0 failures**, sequential numbering intact per page.

## Known follow-ups / caveats

- **Inline `$…$` in prose is NOT converted** to `<M>` — it still renders via
  auto-render and still uses `&#123;` escapes where it has braces. A full sweep
  is possible but delicate (parsing prose, avoiding `$` in code blocks). Only one
  demo paragraph in `chladni-patterns-1` was converted to `<M>`.
- **`Equation.astro` alias is now unused** — can be deleted for a clean slate.
- **Content change to confirm:** in `maximum-and-minimum`, two `cases` systems
  had their second row commented out with `%%%`. Flattening equations to one line
  broke the line-scoped `%` comment, so the second rows (`f_y=0` `(2)`/`(4)`) were
  **un-commented** to render the complete systems. Revert if the rows were meant
  to stay hidden.
- **Mobile number-overlap fix** needs a visual check in-browser.
- Equation numbers: multi-row `align` gets one number per block (not per row).
