/**
 * theme.ts
 * ========
 * Dark/light mode and the light/dark code-theme choices.
 */

/**
 * Wire up a code-theme <select>. Every block already carries every theme's
 * colours (see src/utils/codeThemes.ts), so a choice is just an attribute on
 * <html> — applied instantly, persisted, and mirrored into other open tabs.
 * BaseLayout's pre-paint script sets the same attribute before first paint.
 */
export function initCodeThemeSelect(
  id: string,
  storageKey: string,
  attribute: "codeLight" | "codeDark",
) {
  const select = document.getElementById(id) as HTMLSelectElement | null;
  if (!select) return;

  const root = document.documentElement;

  const apply = (value: string | null) => {
    // A saved value matching no option is dropped; the CSS default stands.
    const valid = [...select.options].some((option) => option.value === value);
    select.value = valid ? value! : select.options[0].value;
    if (valid) {
      root.dataset[attribute] = value!;
    } else {
      delete root.dataset[attribute];
      localStorage.removeItem(storageKey);
    }
  };

  apply(localStorage.getItem(storageKey));

  select.addEventListener("change", () => {
    localStorage.setItem(storageKey, select.value);
    root.dataset[attribute] = select.value;
  });

  window.addEventListener("storage", (event) => {
    if (event.key === storageKey) apply(event.newValue);
  });
}

/**
 * Dark mode: the root class and the toggle icon follow the single `mode` key
 * in localStorage. Code blocks follow the root class through CSS.
 */
export function initDarkMode() {
  const modeToggle = document.getElementById("modeToggle");
  const toggleIcon = document.getElementById("toggleIcon");
  const root = document.documentElement;

  let darkMode = localStorage.getItem("mode") === "dark";

  function apply() {
    root.classList.toggle("dark-mode", darkMode);
    if (toggleIcon && window.__iconSvg) {
      toggleIcon.innerHTML = darkMode
        ? window.__iconSvg.sun
        : window.__iconSvg.moon;
    }
    localStorage.setItem("mode", darkMode ? "dark" : "light");
  }

  modeToggle?.addEventListener("click", () => {
    darkMode = !darkMode;
    apply();
  });

  // Re-sync when the page is shown, including bfcache restores (back/forward
  // navigation), where DOMContentLoaded does not fire.
  window.addEventListener("pageshow", () => {
    darkMode = localStorage.getItem("mode") === "dark";
    apply();
  });

  apply();
}
