/**
 * theme.ts
 * ========
 * Dark/light mode and the two Prism code-theme stylesheets.
 */

/**
 * Wire up a code-theme <select>: restore the saved choice, persist changes and
 * reload so the new stylesheet applies. Returns the theme URL in effect now.
 */
export function initCodeThemeSelect(
  id: string,
  storageKey: string,
  defaultIndex: number,
): string | null {
  const select = document.getElementById(id) as HTMLSelectElement | null;
  if (!select) {
    console.error(`Element with ID ${id} not found`);
    return null;
  }

  const savedValue =
    localStorage.getItem(storageKey) || select.options[defaultIndex].value;
  select.value = savedValue;

  select.addEventListener("change", () => {
    localStorage.setItem(storageKey, select.value);
    // Broadcast to other tabs, which reload via the storage listener below.
    localStorage.setItem(`${storageKey}Changed`, String(Date.now()));
    window.location.reload();
  });

  window.addEventListener("storage", (event) => {
    if (event.key === `${storageKey}Changed`) window.location.reload();
  });

  return savedValue;
}

/**
 * Dark mode: the root class, the toggle icon and the active code-theme
 * stylesheet all follow the single `mode` key in localStorage.
 */
export function initDarkMode(lightThemeHref: string, darkThemeHref: string) {
  const modeToggle = document.getElementById("modeToggle");
  const toggleIcon = document.getElementById("toggleIcon");
  const root = document.documentElement;

  const themeLink = (id: string) => {
    let link = document.getElementById(id) as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.id = id;
      link.rel = "stylesheet";
      document.head.appendChild(link);
    }
    return link;
  };

  const lightThemeLink = themeLink("light-theme-link");
  const darkThemeLink = themeLink("dark-theme-link");

  let darkMode = localStorage.getItem("mode") === "dark";

  function apply() {
    if (darkMode) {
      darkThemeLink.href = darkThemeHref;
      lightThemeLink.disabled = true;
      document.head.appendChild(darkThemeLink);
      root.classList.add("dark-mode");
    } else {
      lightThemeLink.href =
        localStorage.getItem("lightTheme") || lightThemeHref;
      lightThemeLink.disabled = false;
      darkThemeLink.remove();
      root.classList.remove("dark-mode");
    }
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
