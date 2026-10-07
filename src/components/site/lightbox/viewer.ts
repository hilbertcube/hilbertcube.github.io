/**
 * The image viewer: yet-another-react-lightbox, mounted imperatively in its own
 * root on <body> (no island — see CLAUDE.md). Lightbox.astro imports this lazily
 * on the first click, so React only downloads when someone opens an image.
 */
import { createElement } from "react";
import { createRoot } from "react-dom/client";
import Lightbox, { type SlideImage } from "yet-another-react-lightbox";
import Counter from "yet-another-react-lightbox/plugins/counter";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import Fullscreen from "yet-another-react-lightbox/plugins/fullscreen";
import { SPINNER_SVG } from "@utils/spinner";
// Imported as URLs, not as CSS: Astro hoists a plain CSS import into a
// render-blocking <link> on every page, even from a lazily imported module.
import stylesUrl from "yet-another-react-lightbox/styles.css?url";
import counterStylesUrl from "yet-another-react-lightbox/plugins/counter.css?url";

// Wait for the stylesheets before the first render, so the viewer never paints
// unstyled.
await Promise.all(
  [stylesUrl, counterStylesUrl].map(
    (href) =>
      new Promise((resolve) => {
        const link = Object.assign(document.createElement("link"), { rel: "stylesheet", href });
        link.addEventListener("load", resolve);
        link.addEventListener("error", resolve);
        document.head.append(link);
      }),
  ),
);

const container = document.createElement("div");
document.body.append(container);
const root = createRoot(container);

function render(slides: SlideImage[], index: number, open: boolean, onShown?: () => void) {
  root.render(
    createElement(Lightbox, {
      open,
      index,
      slides,
      // Zoom adds the magnifier +/- buttons to the toolbar, plus wheel, pinch
      // and double-click zoom. Fullscreen adds the enter/exit fullscreen button
      // (hidden automatically where the Fullscreen API is unavailable, e.g.
      // iPhone Safari).
      plugins: [Counter, Zoom, Fullscreen],
      // The viewer mounts outside the page's font styling, so the counter
      // would fall back to the browser's default serif. A system sans-serif
      // matches the toolbar's Material icons; weight 500 matches their stroke.
      counter: {
        container: {
          style: {
            fontFamily: 'Roboto, system-ui, -apple-system, "Segoe UI", "Helvetica Neue", Arial, sans-serif',
            fontWeight: 500,
          },
        },
      },
      zoom: {
        // The default (1) caps zoom at the image's natural resolution, and most
        // images here already fit the screen at that size — the magnifiers
        // would be greyed out. Lifting it lets every image use the full range,
        // up to the plugin's `maxZoom` of 8x.
        maxZoomPixelRatio: 8,
        // The wheel zooms rather than doing nothing; there is no page behind
        // the viewer to scroll.
        scrollToZoom: true,
      },
      // A slide still downloading shows the site's loader (.spinner, in white
      // via Lightbox.astro) rather than the library's own icon.
      render: {
        iconLoading: () =>
          createElement("span", { className: "spinner", dangerouslySetInnerHTML: { __html: SPINNER_SVG } }),
      },
      on: { entered: onShown },
      // Unmounting on close hands the page back the way it was (scroll lock
      // and focus trap released); reopening re-renders from these props.
      close: () => {
        onShown?.();
        render(slides, index, false);
      },
      labels: { Lightbox: "Image viewer" },
    }),
  );
}

/**
 * `onShown` runs once the viewer has faded in and covers the page — or on
 * close, if that comes first — so a caller's loading overlay can't outlive it.
 */
export function openViewer(slides: SlideImage[], index: number, onShown?: () => void) {
  render(slides, index, true, onShown);
}
