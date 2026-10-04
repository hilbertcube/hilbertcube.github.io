/**
 * codeThemes.ts
 * =============
 * The code themes offered in Settings (first of each list is the default; ids
 * are Shiki theme names) and the CSS that picks one. Every block carries every
 * theme as `--shiki-<id>` properties, so each theme adds to every page's HTML
 * size — keep the lists short.
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
 * The theme-selection stylesheet, inlined by BaseLayout. The defaults are the
 * least specific rules, so an unknown `data-code-*` value falls back to them.
 */
export function codeThemeCss() {
  return [
    themeRules("html", LIGHT_THEMES[0].id),
    themeRules("html.dark-mode", DARK_THEMES[0].id),
    ...LIGHT_THEMES.map((t) => themeRules(`html:not(.dark-mode)[data-code-light="${t.id}"]`, t.id)),
    ...DARK_THEMES.map((t) => themeRules(`html.dark-mode[data-code-dark="${t.id}"]`, t.id)),
  ].join("\n");
}
