/**
 * settings.ts
 * ===========
 * The settings panel's style <select>s and the reading-progress bar.
 */

// The body font covers the page chrome too, not just the article body.
// Widgets that pin their own font (settings panel, search bar, code blocks)
// declare font-family on themselves and so stay put.
const FONT_FAMILY_TARGETS = [
  ".content-grid",
  ".navbar",
  ".top-nav",
  ".footer-container",
];

/** Inline `property` on every element matching `selectors`. */
const styleAll =
  (property: "fontFamily" | "display", selectors: string[]) =>
  (value: string) =>
    selectors.forEach((selector) =>
      document
        .querySelectorAll<HTMLElement>(selector)
        .forEach((element) => (element.style[property] = value)),
    );

/**
 * The font size scales the content column through `--font-scale` on <html>
 * (see _variables.css), so every body element sized from it follows — not just
 * the ones a selector list happens to name. BaseLayout applies the saved value
 * before first paint.
 */
const setFontScale = (value: string) =>
  document.documentElement.style.setProperty(
    "--font-scale",
    String(parseFloat(value) / 16),
  );

/**
 * Bind a <select> to `apply`, persisted under `property` in localStorage and
 * mirrored into other open tabs.
 */
function initStyleSelect(
  property: "fontFamily" | "fontSize" | "display",
  id: string,
  apply: (value: string) => void,
  defaultIndex: number,
) {
  const select = document.getElementById(id) as HTMLSelectElement | null;
  if (!select) {
    console.error(`Element with ID ${id} not found`);
    return;
  }

  const savedValue =
    localStorage.getItem(property) || select.options[defaultIndex].value;
  apply(savedValue);
  select.value = savedValue;

  select.addEventListener("change", () => {
    apply(select.value);
    localStorage.setItem(property, select.value);
    // Broadcast to other tabs, which pick it up in the storage listener below.
    localStorage.setItem(`${property}Changed`, String(Date.now()));
  });

  window.addEventListener("storage", (event) => {
    if (event.key !== `${property}Changed`) return;
    const newValue = localStorage.getItem(property);
    if (newValue) {
      apply(newValue);
      select.value = newValue;
    }
  });
}

export function initSettings() {
  initStyleSelect(
    "fontFamily",
    "font-select",
    styleAll("fontFamily", FONT_FAMILY_TARGETS),
    0,
  );
  initStyleSelect("fontSize", "font-size-select", setFontScale, 2);
  initStyleSelect(
    "display",
    "indicator-select",
    styleAll("display", [".progress-container", ".progress-bar"]),
    1,
  );
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
