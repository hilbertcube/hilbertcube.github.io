/**
 * highlight.ts
 * ============
 * Build-time Shiki highlighting for CodeBlock, CodeBox and ShellScript. One
 * highlighter serves the build; grammars load on first use, and an unknown
 * `language` throws, failing the build.
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

/**
 * Whether a listing is short enough to keep whole on one printed page: such
 * blocks get `.print-keep` (see utils/_print.css). Longer ones are left to
 * split, since a block that refuses to break leaves a gap behind it.
 */
export const printKeep = (code: string) => code.split("\n").length <= 25;

/**
 * Trims surrounding blank lines and removes the shared indentation. Only a
 * listing that starts on the line after its opening tag is dedented; one that
 * starts on the tag's line is taken as written.
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
  return dedent(code ?? (await slot()));
}
