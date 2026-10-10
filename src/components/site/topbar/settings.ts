/**
 * settings.ts
 * ===========
 * The reading-settings panel (body font, font size, reading-progress bar,
 * Reset) and the progress bar itself. The code-theme selects are theme.ts's.
 */

import { initPanel } from "./panel";
import { DEFAULT_FONT_SIZE, MAX_FONT_SIZE, MIN_FONT_SIZE } from "./fontSizes";

/**
 * A setting persisted under `key` in localStorage: applies the saved value (or
 * `fallback`) now, follows changes made in other open tabs, and returns the
 * setter the panel's controls call.
 */
function persisted(key: string, fallback: string, apply: (value: string) => void) {
  apply(localStorage.getItem(key) || fallback);

  window.addEventListener("storage", (event) => {
    if (event.key !== `${key}Changed`) return;
    apply(localStorage.getItem(key) || fallback);
  });

  return (value: string) => {
    apply(value);
    localStorage.setItem(key, value);
    // Broadcast to other tabs, which pick it up in the listener above.
    localStorage.setItem(`${key}Changed`, String(Date.now()));
  };
}

/**
 * The body font is `--body-font` on <html> (see _variables.css): every
 * reading surface uses it, so the whole page follows; the top-bar panels,
 * search dropdown, code and math keep their own. BaseLayout applies the saved
 * value before first paint. The first option is the stylesheet's default.
 */
function initFontFamily() {
  const select = document.getElementById("font-select") as HTMLSelectElement | null;
  if (!select) return null;

  const fallback = select.options[0].value;
  const set = persisted("fontFamily", fallback, (value) => {
    select.value = value;
    if (select.selectedIndex === -1) select.value = fallback;
    const root = document.documentElement.style;
    if (select.value === fallback) root.removeProperty("--body-font");
    else root.setProperty("--body-font", select.value);
  });
  select.addEventListener("change", () => set(select.value));
  return () => set(select.options[0].value);
}

/**
 * The font size scales the content column through `--font-scale` on <html>
 * (see _variables.css), so every body element sized from it follows.
 * BaseLayout applies the saved value before first paint. Stored as "16px".
 */
function initFontSize() {
  const input = document.getElementById("fontSizeInput") as HTMLInputElement | null;
  const down = document.getElementById("fontSizeDown") as HTMLButtonElement | null;
  const up = document.getElementById("fontSizeUp") as HTMLButtonElement | null;
  const isDefault = document.getElementById("fontSizeDefault");
  if (!input || !down || !up || !isDefault) return null;

  /** A whole size within range, or the default for anything unreadable. */
  const clamp = (px: number) =>
    Number.isFinite(px)
      ? Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, Math.round(px)))
      : DEFAULT_FONT_SIZE;

  let current = DEFAULT_FONT_SIZE;

  const set = persisted("fontSize", `${DEFAULT_FONT_SIZE}px`, (stored) => {
    current = clamp(parseFloat(stored));
    document.documentElement.style.setProperty("--font-scale", String(current / 16));
    if (document.activeElement !== input) input.value = String(current);
    isDefault.hidden = current !== DEFAULT_FONT_SIZE;
    down.disabled = current === MIN_FONT_SIZE;
    up.disabled = current === MAX_FONT_SIZE;
  });

  // Applied as the reader types once the number is in range ("1" on the way
  // to "18" is not); on Enter or blur, anything else snaps into range.
  input.addEventListener("input", () => {
    const px = parseFloat(input.value);
    if (px >= MIN_FONT_SIZE && px <= MAX_FONT_SIZE) set(`${clamp(px)}px`);
  });
  input.addEventListener("change", () => {
    set(`${clamp(parseFloat(input.value))}px`);
    input.value = String(current);
  });

  down.addEventListener("click", () => set(`${clamp(current - 1)}px`));
  up.addEventListener("click", () => set(`${clamp(current + 1)}px`));
  return () => set(`${DEFAULT_FONT_SIZE}px`);
}

/** The reading-progress switch. Stored as the bar's CSS display value. */
function initProgressSwitch() {
  const toggle = document.getElementById("progressSwitch");
  if (!toggle) return null;

  const set = persisted("display", "none", (display) => {
    toggle.setAttribute("aria-checked", String(display === "block"));
    document
      .querySelectorAll<HTMLElement>(".progress-container, .progress-bar")
      .forEach((element) => (element.style.display = display));
  });
  toggle.addEventListener("click", () =>
    set(toggle.getAttribute("aria-checked") === "true" ? "none" : "block"),
  );
  return () => set("none");
}

export function initSettings() {
  if (!initPanel("settingsBtn", "settingsPanel")) return;

  const resets = [initFontFamily(), initFontSize(), initProgressSwitch()];

  // Reset also returns both code themes to their first (default) option,
  // through theme.ts's own change handlers.
  document.getElementById("settingsReset")?.addEventListener("click", () => {
    resets.forEach((reset) => reset?.());
    ["light-theme-select", "dark-theme-select"].forEach((id) => {
      const select = document.getElementById(id) as HTMLSelectElement | null;
      if (!select || select.selectedIndex === 0) return;
      select.selectedIndex = 0;
      select.dispatchEvent(new Event("change"));
    });
  });
}

export function initProgressBar() {
  const bar = document.getElementById("myBar");
  if (!bar) return;

  window.addEventListener(
    "scroll",
    () => {
      const scrolled =
        document.documentElement.scrollTop /
        (document.documentElement.scrollHeight -
          document.documentElement.clientHeight);
      bar.style.width = scrolled * 100 + "%";
    },
    { passive: true },
  );
}
