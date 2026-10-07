/**
 * spinner.ts
 * ==========
 * The loader's markup: an order-3 Hilbert curve (the logo's curve) drawn twice —
 * a faint track and a head that draws along it and erases (styled and animated
 * by `.spinner` in src/assets/css/components/_spinner.css). Put it inside an
 * element with class `spinner`: FrontImage, the lightbox's loading backdrop and
 * the viewer's slide-loading icon all do.
 */

const ORDER = 3;
const STEP = 9;
const MARGIN = 3.5;

/** Cell `d` of a 2^order × 2^order Hilbert curve (the standard d2xy). */
function cell(d: number, n: number): [number, number] {
  let x = 0;
  let y = 0;
  let t = d;
  for (let s = 1; s < n; s *= 2) {
    const rx = 1 & (t >> 1);
    const ry = 1 & (t ^ rx);
    if (ry === 0) {
      if (rx === 1) {
        x = s - 1 - x;
        y = s - 1 - y;
      }
      [x, y] = [y, x];
    }
    x += s * rx;
    y += s * ry;
    t >>= 2;
  }
  return [x, y];
}

const n = 2 ** ORDER;
const size = 2 * MARGIN + STEP * (n - 1);
const path =
  "M" +
  Array.from({ length: n * n }, (_, d) => {
    const [x, y] = cell(d, n);
    return `${MARGIN + STEP * x} ${size - MARGIN - STEP * y}`;
  }).join("L");

export const SPINNER_SVG =
  `<svg viewBox="0 0 ${size} ${size}" aria-hidden="true" focusable="false">` +
  `<path class="spinner-track" d="${path}"/>` +
  `<path class="spinner-head" d="${path}"/>` +
  `</svg>`;
