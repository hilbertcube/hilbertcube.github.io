/**
 * gradientCanvas.ts
 * =================
 * Page side of the homepage banner's animated field (the maths and drawing are
 * in gradientField.ts). It measures the canvas, watches visibility and reduced
 * motion, and hands both to a renderer.
 *
 * The renderer runs in a worker (gradientWorker.ts) on an OffscreenCanvas
 * wherever the browser supports transferControlToOffscreen. Drawing the field
 * on the main thread cost enough per frame that it competed with the page's own
 * work — most visibly, opening or closing the sidebar stuttered. In the worker
 * it can't: the page only posts a message on resize or visibility change.
 * Browsers without OffscreenCanvas fall back to the same renderer on the main
 * thread.
 *
 * Resizes are animated: with the worker, every new size is sent as it happens
 * (`settled: false`, at most once a frame) so the field follows the banner
 * smoothly, then once more RESIZE_SETTLE_MS after the last change
 * (`settled: true`), when gradientField.ts may crossfade to a pattern that
 * fits the new shape better. The main-thread fallback only gets the settled
 * size — rebuilding there on every frame of a resize is what stuttered.
 *
 * Like the other banner canvases, the loop idles whenever it can't be seen:
 * off-screen (IntersectionObserver), backgrounded tab (visibilitychange), or
 * reduced motion (one still frame, redrawn only on resize).
 */
import { CONTEXT_OPTIONS, createRenderer, type FieldSize, type RunState } from "./gradientField";

const MAX_DPR = 2;
const RESIZE_SETTLE_MS = 150; // Rebuild once the size has stopped changing this long

interface Renderer {
  live: boolean; // Off the main thread: cheap enough to follow a resize live
  resize(size: FieldSize): void;
  setState(state: RunState): void;
}

export function initGradientCanvas() {
  const canvas = document.getElementById("gradientCanvas") as HTMLCanvasElement | null;
  if (!canvas) return;
  const renderer = workerRenderer(canvas) ?? mainThreadRenderer(canvas);
  if (!renderer) return;

  // HeroBanner's title panel, which lies over the left of the canvas.
  const panel = canvas.closest(".hero-banner")?.querySelector<HTMLElement>(".panel") ?? null;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let visible = false;
  let measured = false;
  let resizeTimer = 0;
  let liveFrame = 0;

  const syncState = () =>
    renderer.setState({ running: visible && !document.hidden, reduced: reduceMotion.matches });

  const measure = (settled: boolean) => {
    measured = true;
    const W = canvas.clientWidth;
    const H = canvas.clientHeight;
    // The panel is opaque unless it spans the banner (phones), so skip what it hides.
    const panelW = panel?.offsetWidth ?? 0;
    renderer.resize({
      W,
      H,
      dpr: Math.min(MAX_DPR, window.devicePixelRatio || 1),
      skipW: panelW && panelW < W * 0.9 ? panelW : 0,
      settled,
    });
  };

  // The panel too: its width follows the title font, which may load late.
  const resizer = new ResizeObserver(() => {
    if (!measured) {
      measure(true); // First layout: draw straight away
      return;
    }
    if (renderer.live && !liveFrame) {
      liveFrame = requestAnimationFrame(() => {
        liveFrame = 0;
        measure(false);
      });
    }
    clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => measure(true), RESIZE_SETTLE_MS);
  });
  resizer.observe(canvas);
  if (panel) resizer.observe(panel);

  new IntersectionObserver((entries) => {
    visible = entries[entries.length - 1].isIntersecting;
    syncState();
  }).observe(canvas);

  document.addEventListener("visibilitychange", syncState);
  reduceMotion.addEventListener("change", syncState);
}

/** Hand the canvas to a worker; null where OffscreenCanvas isn't supported. */
function workerRenderer(canvas: HTMLCanvasElement): Renderer | null {
  if (!("transferControlToOffscreen" in canvas) || typeof Worker === "undefined") return null;
  let worker: Worker;
  try {
    worker = new Worker(new URL("./gradientWorker.ts", import.meta.url), { type: "module" });
  } catch {
    return null;
  }
  const offscreen = canvas.transferControlToOffscreen();
  worker.postMessage({ type: "init", canvas: offscreen }, [offscreen]);
  return {
    live: true,
    resize: (size) => worker.postMessage({ type: "resize", size }),
    setState: (state) => worker.postMessage({ type: "state", state }),
  };
}

function mainThreadRenderer(canvas: HTMLCanvasElement): Renderer | null {
  const ctx = canvas.getContext("2d", CONTEXT_OPTIONS);
  return ctx ? { live: false, ...createRenderer(canvas, ctx) } : null;
}
