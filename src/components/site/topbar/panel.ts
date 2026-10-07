/**
 * panel.ts
 * ========
 * Open/close for the top bar's panels (tags, share, settings): the icon
 * toggles its panel; Escape, a [data-panel-close] button or a click outside
 * the icon and panel closes it. While open, the icon carries `.active` and
 * `aria-expanded="true"`. Opening the search bar closes them all
 * (closePanels()).
 */

export interface Panel {
  close(): void;
}

const panels: Panel[] = [];

/** Close every open panel. */
export function closePanels() {
  panels.forEach((panel) => panel.close());
}

export function initPanel(
  buttonId: string,
  panelId: string,
  onOpen?: () => void,
): Panel | null {
  const button = document.getElementById(buttonId);
  const panel = document.getElementById(panelId);
  if (!button || !panel) return null;

  let open = false;

  const setOpen = (next: boolean) => {
    if (next === open) return;
    open = next;
    button.classList.toggle("active", open);
    button.setAttribute("aria-expanded", String(open));
    panel.classList.toggle("open", open);
    if (open) onOpen?.();
  };

  button.addEventListener("click", (event) => {
    event.preventDefault();
    setOpen(!open);
  });

  panel
    .querySelectorAll<HTMLElement>("[data-panel-close]")
    .forEach((el) => el.addEventListener("click", () => setOpen(false)));

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && open) setOpen(false);
  });

  // A click that re-renders the panel (toggling a tag chip) detaches its own
  // target before this runs; a detached node isn't a real "outside" click.
  document.addEventListener("click", (event) => {
    if (!open) return;
    const target = event.target as Node;
    if (!target.isConnected) return;
    if (button.contains(target) || panel.contains(target)) return;
    setOpen(false);
  });

  const handle = { close: () => setOpen(false) };
  panels.push(handle);
  return handle;
}
