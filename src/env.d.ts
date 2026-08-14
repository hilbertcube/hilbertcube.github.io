/// <reference types="astro/client" />

interface Window {
  /** Inline SVG for the dark-mode toggle, set by TopBar.astro. */
  __iconSvg?: { moon: string; sun: string };
  /** Scroll to an in-page Pagefind match; set by BaseLayout's highlight script. */
  __pagefindGoInPage?: (url: string) => void;
}
