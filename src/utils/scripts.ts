/**
 * scripts.ts
 * ==========
 * Registry of the page-specific scripts that pages drop into BaseLayout's
 * `scripts` slot, keyed by short alias. Pages ask for aliases:
 *
 *   <Fragment slot="scripts">
 *     <Scripts use={["blog-setting", "python", "line-numbers"]} />
 *   </Fragment>
 *
 * Every URL lives here and nowhere else, so bumping `PRISM_VERSION` (or moving
 * a file) updates every page at once. Aliases are typed, so a misspelled one is
 * an editor error, and an unknown one fails the build rather than silently
 * dropping a script.
 */

/** One bump here re-points every Prism asset on the site. */
export const PRISM_VERSION = "1.29.0";

/** URL of a Prism asset at the pinned version, e.g. `prism("prism.min.js")`. */
export const prism = (path: string) =>
  `https://cdnjs.cloudflare.com/ajax/libs/prism/${PRISM_VERSION}/${path}`;

interface ScriptEntry {
  /**
   * Aliases this one depends on. They are emitted first, so pages can list
   * aliases in any order without breaking Prism's load-order requirements.
   */
  needs?: string[];
  css?: string[];
  js?: string[];
}

/** A Prism language component. Prism core has to load before any of them. */
const language = (name: string): ScriptEntry => ({
  needs: ["prism"],
  js: [prism(`components/prism-${name}.min.js`)],
});

const SCRIPTS = {
  // --- Site scripts (public/assets/js) ---
  // The banner animation ships with Banner.astro's own <script>, so there is
  // no alias for it — rendering <Banner /> is all a page needs.
  "blog-setting": { js: ["/assets/js/blogpage-setting.js"] },

  // --- Prism core + plugins ---
  prism: { js: [prism("prism.min.js")] },
  // The line-numbers stylesheet is already global (see BaseLayout's <head>).
  "line-numbers": {
    needs: ["prism"],
    js: [prism("plugins/line-numbers/prism-line-numbers.min.js")],
  },
  "command-line": {
    needs: ["prism"],
    css: [prism("plugins/command-line/prism-command-line.min.css")],
    js: [prism("plugins/command-line/prism-command-line.min.js")],
  },

  // --- Prism languages ---
  // Each alias is also the `language-*` class to put on the <code> element,
  // e.g. `use={["rust"]}` highlights <code class="language-rust">.
  //
  // Currently in use on the site:
  c: language("c"),
  // Prism's C++ grammar extends its C grammar, so c must load first.
  cpp: { ...language("cpp"), needs: ["prism", "c"] },
  python: language("python"),
  bash: language("bash"),
  json: language("json"),
  cmake: language("cmake"),

  // Systems / compiled:
  rust: language("rust"),
  go: language("go"),
  java: language("java"),
  csharp: language("csharp"),
  fortran: language("fortran"),
  nasm: language("nasm"),
  wasm: language("wasm"),

  // Scientific / functional:
  julia: language("julia"),
  matlab: language("matlab"),
  r: language("r"),
  haskell: language("haskell"),
  ocaml: language("ocaml"),
  scheme: language("scheme"),
  lisp: language("lisp"),
  lua: language("lua"),
  sql: language("sql"),

  // Web. Prism's default bundle already ships markup, css and javascript, so
  // these three cost nothing beyond the core file — naming them just documents
  // what the page highlights.
  html: { needs: ["prism"] },
  css: { needs: ["prism"] },
  javascript: { needs: ["prism"] },
  typescript: language("typescript"),
  jsx: language("jsx"),
  // TSX is JSX plus TypeScript, both of which must load first.
  tsx: { ...language("tsx"), needs: ["prism", "jsx", "typescript"] },
  scss: language("scss"),

  // Config / tooling / prose:
  yaml: language("yaml"),
  toml: language("toml"),
  ini: language("ini"),
  makefile: language("makefile"),
  docker: language("docker"),
  powershell: language("powershell"),
  git: language("git"),
  diff: language("diff"),
  regex: language("regex"),
  markdown: language("markdown"),
  latex: language("latex"),
} satisfies Record<string, ScriptEntry>;

/** Every alias `<Scripts use={[...]} />` accepts. */
export type ScriptAlias = keyof typeof SCRIPTS;

/**
 * Expands aliases into the URLs to emit: dependencies first, each URL once,
 * otherwise in the order the page listed them.
 */
export function resolveScripts(aliases: readonly ScriptAlias[]) {
  const css: string[] = [];
  const js: string[] = [];
  const seen = new Set<string>();

  const visit = (alias: string) => {
    if (seen.has(alias)) return;
    seen.add(alias);

    const entry: ScriptEntry | undefined = SCRIPTS[alias as ScriptAlias];
    if (!entry) {
      throw new Error(
        `Unknown script alias "${alias}". Known aliases: ${Object.keys(SCRIPTS).join(", ")}.`,
      );
    }

    entry.needs?.forEach(visit);
    entry.css?.forEach((url) => !css.includes(url) && css.push(url));
    entry.js?.forEach((url) => !js.includes(url) && js.push(url));
  };

  aliases.forEach(visit);
  return { css, js };
}
