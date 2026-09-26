/**
 * codeThemes.ts
 * =============
 * The code themes a reader can pick in Settings, and the CSS that applies them.
 *
 * Every code block is highlighted once, at build time, with ALL of these
 * themes (src/utils/highlight.ts): each token carries one colour per theme as a
 * `--shiki-<id>` custom property, and the rules below pick which one shows.
 * Switching theme is therefore just an attribute on <html> — instant, no
 * reload, no stylesheet download.
 *
 * The cost is HTML size: every theme adds a custom property to every token, so
 * keep this list short (4 + 4 adds ~8 KB gzipped to the heaviest article).
 * The first entry of each list is the default. Ids are Shiki's bundled theme
 * names: https://shiki.style/themes
 */

export const LIGHT_THEMES = [
  { id: "light-plus", label: "VS Light+ (Default)" },
  { id: "one-light", label: "One Light" },
  { id: "github-light", label: "GitHub Light" },
  { id: "solarized-light", label: "Solarized Light" },
] as const;

export const DARK_THEMES = [
  { id: "dark-plus", label: "VS Dark+ (Default)" },
  { id: "one-dark-pro", label: "One Dark Pro" },
  { id: "night-owl", label: "Night Owl" },
  { id: "dracula", label: "Dracula" },
] as const;

export const CODE_THEMES = [...LIGHT_THEMES, ...DARK_THEMES];

/** Rules that paint every `.shiki` block under `scope` with theme `id`. */
function themeRules(scope: string, id: string) {
  const v = `--shiki-${id}`;
  return (
    `${scope} .shiki{color:var(${v});background-color:var(${v}-bg)}` +
    `${scope} .shiki span{color:var(${v});font-style:var(${v}-font-style,inherit);` +
    `font-weight:var(${v}-font-weight,inherit);text-decoration:var(${v}-text-decoration,inherit)}`
  );
}

/**
 * The theme-selection stylesheet, inlined by BaseLayout.
 *
 * The defaults are the least specific rules, so a missing or unknown
 * `data-code-light` / `data-code-dark` value (a stale localStorage entry, no
 * JS) falls back to them rather than to unstyled code.
 */
export function codeThemeCss() {
  return [
    themeRules("html", LIGHT_THEMES[0].id),
    themeRules("html.dark-mode", DARK_THEMES[0].id),
    ...LIGHT_THEMES.map((t) => themeRules(`html:not(.dark-mode)[data-code-light="${t.id}"]`, t.id)),
    ...DARK_THEMES.map((t) => themeRules(`html.dark-mode[data-code-dark="${t.id}"]`, t.id)),
  ].join("\n");
}
