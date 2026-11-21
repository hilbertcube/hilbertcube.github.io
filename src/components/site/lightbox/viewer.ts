/**
 * The image viewer: yet-another-react-lightbox, mounted imperatively in its own
 * root on <body> (no island — see CLAUDE.md). Lightbox.astro imports this lazily
 * on the first click, so React only downloads when someone opens an image.
 */
import { createElement } from "react";
import { createRoot } from "react-dom/client";
import Lightbox from "yet-another-react-lightbox";
import Captions from "yet-another-react-lightbox/plugins/captions";
import Counter from "yet-another-react-lightbox/plugins/counter";
import Download from "yet-another-react-lightbox/plugins/download";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import Fullscreen from "yet-another-react-lightbox/plugins/fullscreen";
import { SPINNER_SVG } from "@utils/spinner";
// Imported as URLs, not as CSS: Astro hoists a plain CSS import into a
// render-blocking <link> on every page, even from a lazily imported module.
import stylesUrl from "yet-another-react-lightbox/styles.css?url";
import counterStylesUrl from "yet-another-react-lightbox/plugins/counter.css?url";
import captionsStylesUrl from "yet-another-react-lightbox/plugins/captions.css?url";

// Wait for the stylesheets before the first render, so the viewer never paints
// unstyled.
await Promise.all(
  [stylesUrl, counterStylesUrl, captionsStylesUrl].map(
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

// Centres each caption in the gap between its picture's lower edge and the
// screen's. Measured from layout offsets, which ignore the zoom transform, so
// zooming in leaves the caption where it is.
function placeCaptions() {
  document.querySelectorAll<HTMLElement>(".yarl__portal .yarl__slide").forEach((slide) => {
    const caption = slide.querySelector<HTMLElement>(".yarl__slide_description_container");
    const image = slide.querySelector<HTMLImageElement>(".yarl__slide_image");
    if (!caption || !image?.offsetHeight) return;
    // The image is letterboxed in its box (object-fit: contain), so the
    // picture's lower edge sits halfway into the box's spare height.
    const pictureHeight = image.naturalWidth
      ? Math.min(image.offsetHeight, (image.offsetWidth * image.naturalHeight) / image.naturalWidth)
      : image.offsetHeight;
    let imageBottom = (image.offsetHeight + pictureHeight) / 2;
    let el: HTMLElement | null = image;
    while (el && el !== slide) {
      imageBottom += el.offsetTop;
      el = el.offsetParent as HTMLElement | null;
    }
    if (el !== slide) return;
    const gap = slide.clientHeight - imageBottom;
    caption.style.bottom = `${Math.max(0, (gap - caption.offsetHeight) / 2)}px`;
  });
}

// Re-place on anything that moves an image: a slide mounting, an image
// finishing loading (`load` doesn't bubble, hence capture) or a resize.
const schedulePlacement = () => requestAnimationFrame(placeCaptions);
new MutationObserver(schedulePlacement).observe(document.body, { childList: true, subtree: true });
document.addEventListener("load", schedulePlacement, true);
window.addEventListener("resize", schedulePlacement);

/**
 * An image on the page. `caption` is its <figcaption> as HTML; `details`
 * (plain text) shows in its place when there is none.
 */
export interface Slide {
  src: string;
  alt: string;
  caption?: string;
  details?: string;
}

function render(slides: Slide[], index: number, open: boolean, onShown?: () => void) {
  const single = slides.length <= 1;
  root.render(
    createElement(Lightbox, {
      open,
      index,
      slides: slides.map(({ src, alt, caption, details }) => ({
        src,
        alt,
        description: caption
          ? createElement("span", { dangerouslySetInnerHTML: { __html: caption } })
          : details && createElement("span", { className: "lightbox-details" }, details),
      })),
      // Download adds a button that saves the current image under its own file
      // name. Zoom adds the magnifier +/- buttons to the toolbar, plus wheel, pinch
      // and double-click zoom. Fullscreen adds the enter/exit fullscreen button
      // (hidden automatically where the Fullscreen API is unavailable, e.g.
      // iPhone Safari).
      plugins: [Captions, Counter, Download, Zoom, Fullscreen],
      // Captions sit under the image (Lightbox.astro makes room for them).
      // No toggle button: a caption is never long enough to need hiding.
      captions: { descriptionTextAlign: "center", descriptionMaxLines: 4, showToggle: false },
      // One image has nowhere to go: no arrows, and no wrap-around swipe.
      carousel: { finite: single },
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
        ...(single && { buttonPrev: () => null, buttonNext: () => null }),
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
export function openViewer(slides: Slide[], index: number, onShown?: () => void) {
  render(slides, index, true, onShown);
}
