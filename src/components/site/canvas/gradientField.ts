/**
 * gradientField.ts
 * ================
 * The homepage banner's animated field — the maths and the draw loop, shared
 * by gradientWorker.ts (the usual path, drawing to an OffscreenCanvas off the
 * main thread) and gradientCanvas.ts's main-thread fallback. Short gradient
 * lines of
 *
 *   u(x, y, t) = Σⱼ cⱼ(t) · cos(pⱼπx/a) · cos(qⱼπy),   cⱼ(t) = cos(ωⱼt + φⱼ)
 *
 * on the banner's own rectangle [0, a] × [0, 1] (a = width / height). Each term
 * is a Neumann eigenfunction for any whole pⱼ, qⱼ, so every mix of them still
 * has ∂u/∂n = 0 on all four walls: the lines run parallel to the edges they meet
 * while the pattern drifts. Red dots track the local maxima.
 *
 * Time only enters through the three coefficients cⱼ, and each mode separates
 * into an x factor and a y factor. So the cos/sin of every mode are tabulated
 * once per pixel column and row on resize, and a gradient evaluation in the
 * frame loop is a handful of table lookups — no trig per frame. Lines are
 * batched into a few Path2Ds by colour, so a frame is ~16 stroke() calls rather
 * than one per line, and seeds hidden behind the opaque title panel are skipped.
 * Even so, stroking ~3000 anti-aliased lines is real work, which is why it runs
 * in a worker where it can.
 *
 * Resizes are animated, not cut. While the banner's width is changing (the
 * sidebar sliding, a window being dragged) the page sends every new size with
 * `settled: false`, and the field is rebuilt at that size but keeps its mode
 * numbers, so the pattern stretches smoothly with the banner. Line seeds sit on
 * a fixed grid with per-cell jitter, so a seed stays put as columns come and go.
 * Once the size settles, the mode numbers are recomputed for the new aspect
 * ratio; if they changed, the old field crossfades into the new one over
 * CROSSFADE_MS instead of being swapped.
 *
 * The backing store is only reallocated once the size settles. Mid-resize the
 * field is drawn at the new size into the old store, scaled to fill it, and
 * the browser stretches that over the canvas box. Reallocating on every frame
 * of the sidebar's slide made Chrome stop presenting the worker's frames: the
 * banner froze for seconds before it caught up.
 */

const BACKGROUND = "#0f1014";
const SEED_SPACING = 14; // CSS px between line seeds
const STEP_PX = 1.6; // Integration step along a line
const STEPS = 24; // Steps each way from the seed
const CELLS_PER_HEIGHT = 2.6; // Horizontal half-periods per banner height → p
const PEAK_GRID_PX = 4; // Sampling grid for finding the maxima
const PEAK_THRESHOLD = 0.55; // Only mark maxima this high (u normalised to ±1)
const LEVELS = 8; // Opacity buckets per sign
const CROSSFADE_MS = 600;
const DESIRED_FPS = 30;
const FRAME_MS = 1000 / DESIRED_FPS;

/**
 * Options for every context this field is drawn on. `willReadFrequently` is
 * Chrome's switch for a CPU-backed canvas: by default Chrome rasterises 2D
 * canvas on the GPU, where stroking thousands of thin translucent lines each
 * frame is slow and holds up the GPU process the whole page draws through.
 * Firefox already draws canvas on the CPU, which is why only Chrome lagged.
 * We never read pixels back; the option is only for the CPU raster.
 */
export const CONTEXT_OPTIONS: CanvasRenderingContext2DSettings = { willReadFrequently: true };

type Surface = HTMLCanvasElement | OffscreenCanvas;
type Ctx2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

/** What the page measures and hands to the renderer. All CSS px. */
export interface FieldSize {
  W: number;
  H: number;
  dpr: number;
  skipW: number; // Columns hidden behind the title panel
  /** False while the size is still changing: keep the mode numbers. */
  settled: boolean;
}

/** What the page tells the renderer about whether to animate. */
export interface RunState {
  running: boolean; // On screen and in a visible tab
  reduced: boolean; // prefers-reduced-motion: one still frame
}

/** One Neumann mode, cos(kx·x)·cos(ky·y), with its time course and tables. */
interface Mode {
  kx: number;
  ky: number;
  omega: number; // rad/s
  phase: number;
  cx: Float32Array; // cos(kx·x) per pixel column
  sx: Float32Array; // sin(kx·x)
  cy: Float32Array; // cos(ky·y) per pixel row
  sy: Float32Array; // sin(ky·y)
}

interface Field {
  W: number;
  H: number;
  skipW: number; // Columns hidden behind the title panel
  p: number; // Horizontal half-periods of the main mode; the others follow from it
  modes: Mode[];
  seeds: Float32Array; // x, y pairs in CSS px
}

/**
 * Own a canvas and animate the field on it: `resize` rebuilds for a new size,
 * `setState` starts or idles the loop. The loop is paced by
 * requestAnimationFrame (throttled to DESIRED_FPS) so frames line up with the
 * display, falling back to setTimeout where a worker has no requestAnimationFrame.
 */
export function createRenderer(canvas: Surface, c: Ctx2D) {
  const t0 = performance.now();
  let field: Field | null = null;
  let fading: Field | null = null; // The field being crossfaded out
  let fadeStart = 0;
  let backing = { W: 0, H: 0, dpr: 0 };
  let state: RunState = { running: false, reduced: false };
  let looping = false;
  let lastDraw = 0;
  let pending: FieldSize | null = null; // Latest size, applied on the next frame
  const raf = typeof requestAnimationFrame === "function" ? requestAnimationFrame : null;

  const draw = () => {
    if (!field) return;
    const now = performance.now();
    const t = state.reduced ? 0 : (now - t0) / 1000;
    c.globalAlpha = 1;
    c.fillStyle = BACKGROUND;
    c.fillRect(0, 0, field.W, field.H);
    if (fading) {
      const s = Math.min(1, (now - fadeStart) / CROSSFADE_MS);
      drawFrame(c, fading, t, 1 - s);
      drawFrame(c, field, t, s);
      if (s >= 1) fading = null;
    } else {
      drawFrame(c, field, t, 1);
    }
  };

  const loop = () => {
    if (!state.running || state.reduced) {
      looping = false;
      return;
    }
    const now = performance.now();
    // A new size draws at once, so a resize follows at the display's rate;
    // otherwise throttle, with a millisecond of slack so a 60 Hz display
    // lands every second frame.
    if (pending || now - lastDraw >= FRAME_MS - 1) {
      if (pending) apply(pending);
      pending = null;
      lastDraw = now;
      draw();
    }
    if (raf) raf(loop);
    else setTimeout(loop, Math.max(0, FRAME_MS - (performance.now() - lastDraw)));
  };

  /** Rebuild for a new size. Doesn't draw. */
  const apply = (size: FieldSize) => {
    // Reallocate the backing store only for a settled size that changed (it
    // clears it, and mid-resize churn is what froze Chrome). Until then, draw
    // in the new CSS px scaled to fill the store as it is.
    const realloc =
      !backing.W || (size.settled && (size.W !== backing.W || size.H !== backing.H || size.dpr !== backing.dpr));
    if (realloc) {
      canvas.width = Math.round(size.W * size.dpr);
      canvas.height = Math.round(size.H * size.dpr);
      backing = { W: size.W, H: size.H, dpr: size.dpr };
    }
    c.setTransform(canvas.width / size.W, 0, 0, canvas.height / size.H, 0, 0);
    const keepP = size.settled ? undefined : field?.p;
    const next = buildField(size, keepP);
    // A settled size that changed the mode numbers: fade the old pattern out,
    // rebuilt at the new size so both line up. Not under reduced motion,
    // where there is no loop to run the fade.
    if (field && size.settled && next.p !== field.p && !state.reduced) {
      fading = buildField(size, field.p);
      fadeStart = performance.now();
    } else if (fading) {
      fading = buildField(size, fading.p); // Keep a running fade at the new size
    }
    field = next;
  };

  return {
    /** While the loop runs, keep only the latest size and let the next frame
     *  apply and draw it: drawing straight from every resize message as well
     *  as from the loop pushed uneven, doubled frames, which Chrome stutters on. */
    resize(size: FieldSize) {
      if (!size.W || !size.H) return;
      if (looping) {
        pending = size;
        return;
      }
      apply(size);
      draw();
    },
    setState(next: RunState) {
      state = next;
      if (state.reduced) draw();
      if (state.running && !state.reduced && !looping) {
        looping = true;
        loop();
      }
    },
  };
}

/** A cheap integer hash → [0, 1): per-cell seed jitter that doesn't depend on
 *  how many cells there are. */
function hash(i: number, j: number, k: number) {
  let h = Math.imul(i, 374761393) + Math.imul(j, 668265263) + Math.imul(k, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** Precompute everything that only depends on size (and the mode numbers). */
function buildField({ W, H, skipW }: FieldSize, keepP?: number): Field {
  // Work in units of the banner height: x in [0, a], y in [0, 1].
  const a = W / H;
  const p = keepP ?? Math.max(2, Math.round(a * CELLS_PER_HEIGHT));
  const spec: [number, number, number, number][] = [
    // [p, q, ω, φ]
    [p, 2, 0.21, 0],
    [Math.max(1, Math.round(p * 0.6)), 1, 0.13, 2.1],
    [Math.round(p * 1.4), 3, 0.29, 4.2],
  ];
  const modes = spec.map(([pj, qj, omega, phase]): Mode => {
    const kx = (pj * Math.PI) / a;
    const ky = qj * Math.PI;
    const cx = new Float32Array(W + 1), sx = new Float32Array(W + 1);
    const cy = new Float32Array(H + 1), sy = new Float32Array(H + 1);
    for (let X = 0; X <= W; X++) {
      cx[X] = Math.cos((kx * X) / H);
      sx[X] = Math.sin((kx * X) / H);
    }
    for (let Y = 0; Y <= H; Y++) {
      cy[Y] = Math.cos((ky * Y) / H);
      sy[Y] = Math.sin((ky * Y) / H);
    }
    return { kx, ky, omega, phase, cx, sx, cy, sy };
  });

  const seeds: number[] = [];
  for (let r = 0; r * SEED_SPACING < H; r++) {
    for (let q = 0; q * SEED_SPACING < W; q++) {
      const x = (q + 0.5 + (hash(q, r, 0) - 0.5)) * SEED_SPACING;
      const y = (r + 0.5 + (hash(q, r, 1) - 0.5)) * SEED_SPACING;
      // Keep seeds inside the tables, and drop those whose whole line would be hidden.
      if (x >= Math.max(0, skipW - STEPS * STEP_PX) && x <= W && y >= 0 && y <= H) seeds.push(x, y);
    }
  }

  return { W, H, skipW, p, modes, seeds: new Float32Array(seeds) };
}

/** Stroke the field's lines and peaks at `alpha` over what is already drawn. */
function drawFrame(c: Ctx2D, f: Field, t: number, alpha: number) {
  const { W, H, modes, seeds } = f;
  const n = modes.length;
  const coef = modes.map((m) => Math.cos(m.omega * t + m.phase));
  const norm = Math.max(0.5, coef.reduce((sum, v) => sum + Math.abs(v), 0));
  // Gradient magnitudes scale with the coefficients, so the "near a critical
  // point" cut-off does too.
  const minGrad = 0.3 * norm;

  const u = (X: number, Y: number) => {
    let v = 0;
    for (let j = 0; j < n; j++) v += coef[j] * modes[j].cx[X] * modes[j].cy[Y];
    return v / norm;
  };

  // Paths bucketed by sign and |u|: [0, LEVELS) for u ≥ 0, [LEVELS, 2·LEVELS) for u < 0.
  const paths = Array.from({ length: 2 * LEVELS }, () => new Path2D());

  for (let i = 0; i < seeds.length; i += 2) {
    const x0 = seeds[i];
    const y0 = seeds[i + 1];
    const v = u(Math.round(x0), Math.round(y0));
    const level = Math.min(LEVELS - 1, Math.floor(Math.abs(v) * LEVELS));
    const path = paths[v >= 0 ? level : LEVELS + level];

    for (let dir = 1; dir >= -1; dir -= 2) {
      let x = x0;
      let y = y0;
      path.moveTo(x, y);
      for (let k = 0; k < STEPS; k++) {
        const X = Math.round(x);
        const Y = Math.round(y);
        let gx = 0;
        let gy = 0;
        for (let j = 0; j < n; j++) {
          const m = modes[j];
          gx -= coef[j] * m.kx * m.sx[X] * m.cy[Y];
          gy -= coef[j] * m.ky * m.cx[X] * m.sy[Y];
        }
        const mag = Math.hypot(gx, gy);
        if (mag < minGrad) break; // Near a critical point the direction is meaningless
        x += (dir * gx * STEP_PX) / mag;
        y += (dir * gy * STEP_PX) / mag;
        if (x < 0 || x > W || y < 0 || y > H) break;
        path.lineTo(x, y);
      }
    }
  }

  c.globalAlpha = alpha;
  c.lineWidth = 0.8;
  for (let L = 0; L < LEVELS; L++) {
    const v = (L + 0.5) / LEVELS;
    c.strokeStyle = `rgba(236, 232, 224, ${(0.08 + 0.4 * v).toFixed(3)})`;
    c.stroke(paths[L]);
    c.strokeStyle = `rgba(80, 150, 255, ${(0.08 + 0.45 * v).toFixed(3)})`;
    c.stroke(paths[LEVELS + L]);
  }

  drawPeaks(c, f, u);
}

/** Mark local maxima of u, found on a coarse grid and refined with a parabola fit. */
function drawPeaks(c: Ctx2D, f: Field, u: (X: number, Y: number) => number) {
  const { W, H, skipW } = f;
  const cols = Math.floor(W / PEAK_GRID_PX) + 1;
  const rows = Math.floor(H / PEAK_GRID_PX) + 1;
  const col0 = Math.floor(skipW / PEAK_GRID_PX);
  const grid = new Float32Array(cols * rows);
  for (let r = 0; r < rows; r++) {
    for (let q = col0; q < cols; q++) grid[r * cols + q] = u(q * PEAK_GRID_PX, r * PEAK_GRID_PX);
  }

  c.fillStyle = "#ca0000";
  for (let r = 0; r < rows; r++) {
    for (let q = col0; q < cols; q++) {
      const v = grid[r * cols + q];
      if (v < PEAK_THRESHOLD) continue;
      let isMax = true;
      for (let dr = -1; dr <= 1 && isMax; dr++) {
        for (let dq = -1; dq <= 1; dq++) {
          const rr = r + dr;
          const qq = q + dq;
          if ((dr || dq) && rr >= 0 && rr < rows && qq >= col0 && qq < cols && grid[rr * cols + qq] > v) {
            isMax = false;
            break;
          }
        }
      }
      if (!isMax) continue;
      // Sub-grid offset from a parabola through the neighbours; none at a wall,
      // where the peak sits on the wall itself (∂u/∂n = 0 there).
      const at = (rr: number, qq: number) => grid[rr * cols + qq];
      const fit = (l: number, rgt: number) => {
        const d = l - 2 * v + rgt;
        return d < 0 ? Math.max(-0.5, Math.min(0.5, (0.5 * (l - rgt)) / d)) : 0;
      };
      const ox = q > col0 && q < cols - 1 ? fit(at(r, q - 1), at(r, q + 1)) : 0;
      const oy = r > 0 && r < rows - 1 ? fit(at(r - 1, q), at(r + 1, q)) : 0;
      c.beginPath();
      c.arc((q + ox) * PEAK_GRID_PX, (r + oy) * PEAK_GRID_PX, 2.6, 0, 2 * Math.PI);
      c.fill();
    }
  }
}
