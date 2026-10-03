/**
 * watchCanvas.ts
 * ==============
 * Wiring shared by the requestAnimationFrame banner canvases (equations, maze,
 * fluid): resizes of the canvas's CSS box, coalesced to one call per frame,
 * and whether the canvas can be seen — on screen (IntersectionObserver) and in
 * a visible tab (visibilitychange).
 *
 * `onShow` / `onHide` fire as either changes; `onShow` may fire while the
 * other half still hides the canvas, so a loop's start() should check
 * `visible()` itself.
 */

interface Handlers {
  onResize(): void;
  onShow(): void;
  onHide(): void;
}

export function watchCanvas(canvas: HTMLCanvasElement, { onResize, onShow, onHide }: Handlers) {
  // ResizeObserver can fire several times per layout pass; coalesce into one.
  let resizePending = false;
  new ResizeObserver(() => {
    if (resizePending) return;
    resizePending = true;
    requestAnimationFrame(() => {
      resizePending = false;
      onResize();
    });
  }).observe(canvas);

  // Assume on screen until the first report, so the loop can start at once.
  let inView = true;
  new IntersectionObserver((entries) => {
    inView = entries[entries.length - 1].isIntersecting;
    if (inView) onShow();
    else onHide();
  }).observe(canvas);

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) onHide();
    else onShow();
  });

  return { visible: () => inView && !document.hidden };
}
