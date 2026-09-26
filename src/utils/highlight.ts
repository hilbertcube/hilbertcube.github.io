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
  nbsp: " ",
};

/**
 * A code component's source as plain text.
 *
 * Listings arrive as slot children, which Astro hands over as rendered HTML:
 * `&lt;` / `&#123;` written in the page to get `<` / `{` past the compiler are
 * still entities. Shiki needs the real characters.
 *
 * Markup inside a listing is rejected rather than guessed at — Prism used to
 * drop tags silently. Pass such listings with `code={raw`…`}` instead.
 */
export async function slotText(html: string) {
  if (/<[a-z!/]/i.test(html)) {
    throw new Error(
      `Code listing contains HTML markup; pass it as code={raw\`…\`} instead:\n${html.slice(0, 200)}`,
    );
  }
  return html.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity: string) => {
    if (entity[0] !== "#") return ENTITIES[entity.toLowerCase()] ?? match;
    const hex = entity[1] === "x" || entity[1] === "X";
    return String.fromCodePoint(parseInt(entity.slice(hex ? 2 : 1), hex ? 16 : 10));
  });
}

/**
 * The listing a code component should highlight: its `code` prop when given,
 * otherwise its slot, with the surrounding blank lines trimmed (a newline
 * straight after the opening tag, or before the closing one, is layout, not
 * code — and would otherwise become an empty numbered line).
 */
export async function listing(code: string | undefined, slot: () => Promise<string>) {
  const text = code ?? (await slotText(await slot()));
  return text.replace(/^\n+/, "").replace(/\s+$/, "");
}
