/**
 * nav.ts
 * ======
 * Sidebar open/closed state, driven by the top bar's hamburger button and by
 * the viewport width.
 */

/** Below this width the sidebar starts closed. */
const OPEN_AT_WIDTH = 1200;

export function initNav() {
  const navbar = document.querySelector<HTMLElement>(".navbar");
  const button = document.querySelector<HTMLElement>(".toggle-btn");
  if (!navbar) return;

  const body = document.body;

  const setOpen = (open: boolean) => {
    navbar.classList.toggle("open", open);
    navbar.classList.toggle("closed", !open);
    body.classList.toggle("nav-open", open);
    body.classList.toggle("nav-closed", !open);
  };

  button?.addEventListener("click", () => {
    setOpen(!navbar.classList.contains("open"));
  });

  const syncToWidth = () => {
    setOpen(window.innerWidth >= OPEN_AT_WIDTH);

    // Enable transitions only after the initial state is painted, so the
    // sidebar doesn't visibly slide into place on load.
    if (!navbar.classList.contains("transitions-ready")) {
      requestAnimationFrame(() => {
        navbar.classList.add("transitions-ready");
        body.classList.add("transitions-ready");
      });
    }
  };

  syncToWidth();
  window.addEventListener("resize", syncToWidth);
}
