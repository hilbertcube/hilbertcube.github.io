/**
 * highlight.ts
 * ============
 * Build-time syntax highlighting with Shiki, for the `code/` block components
 * (CodeBlock, CodeBox, ShellScript). Pages ship finished, coloured HTML — no
 * highlighter script, no per-page language list.
 *
 * One highlighter serves the whole build; a language grammar is loaded the
 * first time a block asks for it. An unknown `language` makes `loadLanguage`
 * throw, which fails the build, so a typo can't silently leave a block plain.
 *
 * A listing can be written two ways:
 *
 *   - `is:raw` on the component: indent the block to match the page, and write
 *     `<`, `{`, `}` literally. Astro leaves raw children untouched, and
 *     `dedent()` strips the shared indentation.
 *
 *       <CodeBlock language="cpp" is:raw>
 *         #include <cstdlib>
 *         int main() { return 0; }
 *       </CodeBlock>
 *
 *   - plain children: start at column 0 against the opening tag, and escape
 *     `<` / `{` as `&lt;` / `&#123;`. Astro's HTML compressor eats whitespace
 *     that touches a tag, so an indented block loses its first line's indent.
 */
import { createHighlighter, type BundledLanguage, type ShikiTransformer } from "shiki";
import { CODE_THEMES } from "@utils/codeThemes";

const highlighter = createHighlighter({
  themes: CODE_THEMES.map((t) => t.id),
  langs: [],
});

// All themes at once, none of them inlined as the plain `color`: which one
// shows is decided by the CSS from codeThemeCss().
const themes = Object.fromEntries(CODE_THEMES.map((t) => [t.id, t.id]));

export async function highlight(
  code: string,
  lang: string,
  transformers: ShikiTransformer[] = [],
) {
  const h = await highlighter;
  await h.loadLanguage(lang as BundledLanguage);
  return h.codeToHtml(code, { lang, themes, defaultColor: false, transformers });
}

const ENTITIES: Record<string, string> = {
  lt: "<",
  gt: ">",
  amp: "&",
  quot: '"',
  apos: "'",
  nbsp: "\u00a0",
};

/**
 * A code component's slot as plain text.
 *
 * Listings arrive as slot children, which Astro hands over as rendered HTML:
 * `&lt;` / `&#123;` written in the page to get `<` / `{` past the compiler are
 * still entities. Shiki needs the real characters. (Inside `is:raw` the text is
 * already literal; the only casualty is code that contains a literal `&lt;`.)
 */
export function slotText(html: string) {
  return html.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity: string) => {
    if (entity[0] !== "#") return ENTITIES[entity.toLowerCase()] ?? match;
    const hex = entity[1] === "x" || entity[1] === "X";
    return String.fromCodePoint(parseInt(entity.slice(hex ? 2 : 1), hex ? 16 : 10));
  });
}

/**
 * Trims the blank lines around a listing and removes the indentation every
 * line shares, so a block indented to match the page renders flush left.
 * Blank lines don't count toward the shared indentation.
 *
 * Only a listing that starts on the line AFTER its opening tag is dedented —
 * that is the indented `is:raw` style. One that starts on the tag's own line
 * is taken as written: its indentation is deliberate (an excerpt from inside a
 * function, say), and dedenting it would shift it left.
 */
export function dedent(text: string) {
  const trimmed = text.replace(/\s+$/, "");
  if (!/^[ \t]*\n/.test(trimmed)) return trimmed;

  const lines = trimmed.replace(/^(?:[ \t]*\n)+/, "").split("\n");
  const indents = lines.filter((line) => line.trim()).map((line) => line.match(/^[ \t]*/)![0]);
  // The longest prefix all indents share (they may mix tabs and spaces).
  let common = indents[0] ?? "";
  for (const indent of indents) {
    while (!indent.startsWith(common)) common = common.slice(0, -1);
  }
  return lines.map((line) => line.slice(Math.min(common.length, line.length))).join("\n");
}

/**
 * The listing a code component should highlight: its `code` prop when given,
 * otherwise its slot, dedented.
 */
export async function listing(code: string | undefined, slot: () => Promise<string>) {
  return dedent(code ?? slotText(await slot()));
}
