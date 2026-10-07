/**
 * settings.ts
 * ===========
 * The reading-settings panel (body font, font size, reading-progress bar,
 * Reset) and the progress bar itself. The code-theme selects are theme.ts's.
 */

import { initPanel } from "./panel";

// The body font covers the page chrome too, not just the article body.
// Widgets that pin their own font (settings panel, search bar, code blocks)
// declare font-family on themselves and so stay put.
const FONT_FAMILY_TARGETS = [
  ".content-grid",
  ".navbar",
  ".top-nav",
  ".footer-container",
];

const FONT_SIZES = [14, 15, 16, 17, 18, 20, 22];
const DEFAULT_FONT_SIZE = 16;

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

function initFontFamily() {
  const select = document.getElementById("font-select") as HTMLSelectElement | null;
  if (!select) return null;

  const set = persisted("fontFamily", select.options[0].value, (value) => {
    select.value = value;
    FONT_FAMILY_TARGETS.forEach((selector) =>
      document
        .querySelectorAll<HTMLElement>(selector)
        .forEach((element) => (element.style.fontFamily = value)),
    );
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
  const down = document.getElementById("fontSizeDown") as HTMLButtonElement | null;
  const up = document.getElementById("fontSizeUp") as HTMLButtonElement | null;
  const value = document.getElementById("fontSizeValue");
  const isDefault = document.getElementById("fontSizeDefault");
  if (!down || !up || !value || !isDefault) return null;

  let index = FONT_SIZES.indexOf(DEFAULT_FONT_SIZE);

  const set = persisted("fontSize", `${DEFAULT_FONT_SIZE}px`, (stored) => {
    const found = FONT_SIZES.indexOf(parseFloat(stored));
    index = found === -1 ? FONT_SIZES.indexOf(DEFAULT_FONT_SIZE) : found;
    const px = FONT_SIZES[index];
    document.documentElement.style.setProperty("--font-scale", String(px / 16));
    value.textContent = `${px} px`;
    isDefault.hidden = px !== DEFAULT_FONT_SIZE;
    down.disabled = index === 0;
    up.disabled = index === FONT_SIZES.length - 1;
  });

  const step = (by: number) => {
    const next = Math.min(FONT_SIZES.length - 1, Math.max(0, index + by));
    set(`${FONT_SIZES[next]}px`);
  };
  down.addEventListener("click", () => step(-1));
  up.addEventListener("click", () => step(1));
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
