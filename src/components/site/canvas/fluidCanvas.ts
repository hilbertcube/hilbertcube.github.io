/**
 * fluidCanvas.ts
 * ==============
 * HeroBanner art (FluidCanvas.astro). Jos Stam's "stable fluids"
 * on a coarse grid, upscaled with smoothing:
 *
 * 1. forces — a few emitters drift on Lissajous paths, pushing the fluid
 *    along their direction of travel and dropping coloured dye; vorticity
 *    confinement feeds back the small swirls the grid would smear out.
 * 2. advect — velocity and dye are carried along the flow (semi-Lagrangian:
 *    trace each cell back through the field and sample there).
 * 3. project — solve ∇²p = ∇·u and subtract ∇p, so the flow stays
 *    incompressible and curls into vortices instead of piling up.
 *
 * A few black squares at random angles sit in the flow as solid obstacles:
 * no velocity or dye inside, and the pressure solve treats their faces as
 * walls, so the fluid parts around them and sheds eddies off the corners.
 *
 * Moving the pointer over the canvas stirs it. Idles off-screen, in
 * background tabs, and under reduced motion (one pre-run static frame).
 *
 * Dye is drawn with alpha, so where there is none the banner's own background
 * shows through.
 */

import { watchCanvas } from "./watchCanvas";

const MAX_DPR = 2;

// Grid resolution: one cell per CELL_PX CSS px, clamped.
const CELL_PX = 6;
const MIN_COLS = 48;
const MAX_COLS = 160;

const MAX_DT = 1 / 30; // s; bigger frame gaps are split no further, just capped
const PRESSURE_ITERS = 20; // Gauss–Seidel sweeps for the pressure solve
const VORTICITY = 18; // Vorticity confinement strength
const VELOCITY_DECAY = 0.4; // 1/s
const DYE_DECAY = 0.25; // 1/s

// Emitters: speed along their path, and the push/dye they add per second.
const EMITTER_SPEED = 0.3; // Lissajous phase, rad/s (× each emitter's ratio)
const EMITTER_FORCE = 22; // Velocity factor from the emitter's own motion
const EMITTER_DYE = 5;
const SPLAT_RADIUS = 0.045; // Fraction of the grid height

const POINTER_FORCE = 1.6; // Velocity per CSS px of pointer travel
const POINTER_DYE = 1.2;

// Obstacles: side length as a fraction of the grid height.
const SQUARE_COUNT = 5;
const SQUARE_MIN = 0.16;
const SQUARE_MAX = 0.28;
const SQUARE_COLOR = "#000";

const PRERUN_SECONDS = 6; // Simulated before the static reduced-motion frame

// Dye colours, RGB 0–1: deep blue, green, purple — strong on a dark background.
const PALETTE: [number, number, number][] = [
  [0.1, 0.3, 1.0],
  [0.05, 0.8, 0.35],
  [0.75, 0.05, 0.95],
];
const TONE = 1.1; // Exposure for 1 − e^(−TONE·dye)

interface Square {
  x: number; // Centre, grid coordinates
  y: number;
  half: number; // Half the side, cells
  angle: number; // rad
}

interface Emitter {
  ax: number; // Lissajous frequency ratios
  ay: number;
  phase: number;
  colour: [number, number, number];
}

export function initFluidCanvas() {
  const canvas = document.getElementById("fluidCanvas") as HTMLCanvasElement | null;
  if (!canvas) return;
  const ctx = canvas.getContext("2d", { alpha: true });
  // The simulation is drawn 1:1 here, then scaled up onto the canvas.
  const gridCanvas = document.createElement("canvas");
  const gridCtx = gridCanvas.getContext("2d");
  if (!ctx || !gridCtx) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  let dpr = 1;
  let cssWidth = 0;
  let cssHeight = 0;

  // Grid: cols × rows interior cells plus a one-cell border (Stam's layout).
  let cols = 0;
  let rows = 0;
  let stride = 0; // cols + 2
  let size = 0; // (cols + 2) × (rows + 2)

  let u = new Float32Array(0); // Velocity, cells/s
  let v = new Float32Array(0);
  let uPrev = new Float32Array(0);
  let vPrev = new Float32Array(0);
  let dye: Float32Array[] = []; // R, G, B
  let dyePrev = new Float32Array(0);
  let pressure = new Float32Array(0);
  let divergence = new Float32Array(0);
  let curl = new Float32Array(0);
  let image: ImageData | null = null;
  let solid = new Uint8Array(0); // 1 inside an obstacle
  let squares: Square[] = [];

  const emitters: Emitter[] = PALETTE.map((colour, i) => ({
    ax: [1, 1.7, 2.3][i],
    ay: [1.3, 0.9, 1.9][i],
    phase: Math.random() * 2 * Math.PI,
    colour,
  }));
  let time = 0; // Simulated seconds

  // Pointer, CSS px relative to the canvas; null until it moves over it.
  let pointer: { x: number; y: number } | null = null;
  let pointerColour = 0;

  let rafId = 0;
  let lastTime = 0;

  const IX = (i: number, j: number) => i + stride * j;

  /* ---------------------------------------------------------------- sizing */

  /** Resize the backing store and grid to the canvas's CSS box. True if anything changed. */
  function measure(): boolean {
    const nextWidth = canvas!.clientWidth;
    const nextHeight = canvas!.clientHeight;
    const nextDpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    if (nextWidth === cssWidth && nextHeight === cssHeight && nextDpr === dpr) return false;
    cssWidth = nextWidth;
    cssHeight = nextHeight;
    dpr = nextDpr;

    canvas!.width = Math.max(1, Math.round(cssWidth * dpr));
    canvas!.height = Math.max(1, Math.round(cssHeight * dpr));

    cols = Math.min(MAX_COLS, Math.max(MIN_COLS, Math.round(cssWidth / CELL_PX)));
    rows = Math.max(1, Math.round((cols * cssHeight) / Math.max(1, cssWidth)));
    stride = cols + 2;
    size = stride * (rows + 2);

    u = new Float32Array(size);
    v = new Float32Array(size);
    uPrev = new Float32Array(size);
    vPrev = new Float32Array(size);
    dye = [new Float32Array(size), new Float32Array(size), new Float32Array(size)];
    dyePrev = new Float32Array(size);
    pressure = new Float32Array(size);
    divergence = new Float32Array(size);
    curl = new Float32Array(size);
    placeSquares();

    gridCanvas.width = cols;
    gridCanvas.height = rows;
    image = gridCtx!.createImageData(cols, rows);
    return true;
  }

  /** Scatter non-overlapping squares at random angles and mark their cells. */
  function placeSquares() {
    squares = [];
    for (let tries = 0; squares.length < SQUARE_COUNT && tries < 500; tries++) {
      const side = rows * (SQUARE_MIN + Math.random() * (SQUARE_MAX - SQUARE_MIN));
      const half = side / 2;
      const reach = half * Math.SQRT2; // Circumradius, any angle
      const x = reach + 1 + Math.random() * (cols - 2 * reach);
      const y = reach + 1 + Math.random() * (rows - 2 * reach);
      // Keep a gap of at least one square's width so the flow can pass.
      const clear = squares.every(
        (q) => Math.hypot(q.x - x, q.y - y) > reach + q.half * Math.SQRT2 + side,
      );
      if (clear) squares.push({ x, y, half, angle: Math.random() * Math.PI / 2 });
    }

    // A cell is solid if its centre lies inside the square, shrunk by half a
    // cell so the crisp square drawn on top covers the blocky mask.
    solid = new Uint8Array(size);
    for (const q of squares) {
      const cos = Math.cos(q.angle);
      const sin = Math.sin(q.angle);
      const inner = q.half - 0.5;
      const reach = Math.ceil(q.half * Math.SQRT2);
      for (let j = Math.max(1, Math.floor(q.y) - reach); j <= Math.min(rows, Math.ceil(q.y) + reach); j++) {
        for (let i = Math.max(1, Math.floor(q.x) - reach); i <= Math.min(cols, Math.ceil(q.x) + reach); i++) {
          const dx = i - q.x;
          const dy = j - q.y;
          const along = dx * cos + dy * sin;
          const across = -dx * sin + dy * cos;
          if (Math.abs(along) <= inner && Math.abs(across) <= inner) solid[IX(i, j)] = 1;
        }
      }
    }
  }

  /** Nothing moves or colours inside an obstacle. */
  function clearSolids(...fields: Float32Array[]) {
    for (let k = 0; k < size; k++) {
      if (!solid[k]) continue;
      for (const field of fields) field[k] = 0;
    }
  }

  /* ---------------------------------------------------------------- solver */

  /** Walls: b = 1 reflects u at the sides, b = 2 reflects v at top/bottom. */
  function setBoundary(b: number, x: Float32Array) {
    for (let j = 1; j <= rows; j++) {
      x[IX(0, j)] = b === 1 ? -x[IX(1, j)] : x[IX(1, j)];
      x[IX(cols + 1, j)] = b === 1 ? -x[IX(cols, j)] : x[IX(cols, j)];
    }
    for (let i = 1; i <= cols; i++) {
      x[IX(i, 0)] = b === 2 ? -x[IX(i, 1)] : x[IX(i, 1)];
      x[IX(i, rows + 1)] = b === 2 ? -x[IX(i, rows)] : x[IX(i, rows)];
    }
    x[IX(0, 0)] = 0.5 * (x[IX(1, 0)] + x[IX(0, 1)]);
    x[IX(0, rows + 1)] = 0.5 * (x[IX(1, rows + 1)] + x[IX(0, rows)]);
    x[IX(cols + 1, 0)] = 0.5 * (x[IX(cols, 0)] + x[IX(cols + 1, 1)]);
    x[IX(cols + 1, rows + 1)] = 0.5 * (x[IX(cols, rows + 1)] + x[IX(cols + 1, rows)]);
  }

  /** Carry field `from` along (u, v) for `dt` into `to`. */
  function advect(b: number, to: Float32Array, from: Float32Array, dt: number) {
    for (let j = 1; j <= rows; j++) {
      for (let i = 1; i <= cols; i++) {
        const k = IX(i, j);
        // Trace back, clamped inside the border.
        let x = i - dt * u[k];
        let y = j - dt * v[k];
        x = Math.min(cols + 0.5, Math.max(0.5, x));
        y = Math.min(rows + 0.5, Math.max(0.5, y));
        const i0 = Math.floor(x);
        const j0 = Math.floor(y);
        const s = x - i0;
        const t = y - j0;
        const k0 = IX(i0, j0);
        to[k] =
          (1 - s) * ((1 - t) * from[k0] + t * from[k0 + stride]) +
          s * ((1 - t) * from[k0 + 1] + t * from[k0 + stride + 1]);
      }
    }
    setBoundary(b, to);
  }

  /** Make (u, v) divergence-free. */
  function project() {
    for (let j = 1; j <= rows; j++) {
      for (let i = 1; i <= cols; i++) {
        const k = IX(i, j);
        divergence[k] = -0.5 * (u[k + 1] - u[k - 1] + v[k + stride] - v[k - stride]);
        pressure[k] = 0;
      }
    }
    setBoundary(0, divergence);
    setBoundary(0, pressure);
    for (let n = 0; n < PRESSURE_ITERS; n++) {
      for (let j = 1; j <= rows; j++) {
        for (let i = 1; i <= cols; i++) {
          const k = IX(i, j);
          if (solid[k]) continue;
          // Obstacle faces are walls (∂p/∂n = 0): leave those neighbours out.
          let sum = divergence[k];
          let count = 0;
          for (const n of [k - 1, k + 1, k - stride, k + stride]) {
            if (solid[n]) continue;
            sum += pressure[n];
            count++;
          }
          if (count) pressure[k] = sum / count;
        }
      }
      setBoundary(0, pressure);
    }
    for (let j = 1; j <= rows; j++) {
      for (let i = 1; i <= cols; i++) {
        const k = IX(i, j);
        if (solid[k]) continue;
        // An obstacle neighbour mirrors this cell's pressure.
        const p = pressure[k];
        const east = solid[k + 1] ? p : pressure[k + 1];
        const west = solid[k - 1] ? p : pressure[k - 1];
        const south = solid[k + stride] ? p : pressure[k + stride];
        const north = solid[k - stride] ? p : pressure[k - stride];
        u[k] -= 0.5 * (east - west);
        v[k] -= 0.5 * (south - north);
      }
    }
    clearSolids(u, v);
    setBoundary(1, u);
    setBoundary(2, v);
  }

  /** Push along the curl gradient to keep small vortices spinning. */
  function confineVorticity(dt: number) {
    for (let j = 1; j <= rows; j++) {
      for (let i = 1; i <= cols; i++) {
        const k = IX(i, j);
        curl[k] = 0.5 * (v[k + 1] - v[k - 1] - u[k + stride] + u[k - stride]);
      }
    }
    for (let j = 2; j < rows; j++) {
      for (let i = 2; i < cols; i++) {
        const k = IX(i, j);
        const nx = 0.5 * (Math.abs(curl[k + 1]) - Math.abs(curl[k - 1]));
        const ny = 0.5 * (Math.abs(curl[k + stride]) - Math.abs(curl[k - stride]));
        const length = Math.hypot(nx, ny) + 1e-5;
        u[k] += dt * VORTICITY * (ny / length) * curl[k];
        v[k] -= dt * VORTICITY * (nx / length) * curl[k];
      }
    }
  }

  /** Gaussian splat of velocity (fx, fy) and dye at grid point (cx, cy). */
  function splat(
    cx: number,
    cy: number,
    fx: number,
    fy: number,
    colour: [number, number, number],
    amount: number,
  ) {
    const radius = Math.max(2, SPLAT_RADIUS * rows);
    const reach = Math.ceil(radius * 2);
    const i0 = Math.max(1, Math.floor(cx - reach));
    const i1 = Math.min(cols, Math.ceil(cx + reach));
    const j0 = Math.max(1, Math.floor(cy - reach));
    const j1 = Math.min(rows, Math.ceil(cy + reach));
    for (let j = j0; j <= j1; j++) {
      for (let i = i0; i <= i1; i++) {
        const d2 = (i - cx) ** 2 + (j - cy) ** 2;
        const w = Math.exp(-d2 / (radius * radius));
        if (w < 0.01) continue;
        const k = IX(i, j);
        u[k] += w * fx;
        v[k] += w * fy;
        for (let c = 0; c < 3; c++) dye[c][k] += w * amount * colour[c];
      }
    }
  }

  /** Emitter position on the grid at time `t`. */
  function emitterAt(e: Emitter, t: number): [number, number] {
    const a = EMITTER_SPEED * t;
    return [
      1 + (cols - 1) * (0.5 + 0.38 * Math.sin(e.ax * a + e.phase)),
      1 + (rows - 1) * (0.5 + 0.36 * Math.sin(e.ay * a + 2 * e.phase)),
    ];
  }

  function step(dt: number) {
    // Forces
    for (const e of emitters) {
      const [x0, y0] = emitterAt(e, time);
      const [x1, y1] = emitterAt(e, time + dt);
      // Emitter velocity × EMITTER_FORCE × dt = displacement × EMITTER_FORCE.
      splat(x1, y1, (x1 - x0) * EMITTER_FORCE, (y1 - y0) * EMITTER_FORCE, e.colour, EMITTER_DYE * dt);
    }
    time += dt;
    confineVorticity(dt);

    const velocityKeep = Math.exp(-VELOCITY_DECAY * dt);
    for (let k = 0; k < size; k++) {
      u[k] *= velocityKeep;
      v[k] *= velocityKeep;
    }
    setBoundary(1, u);
    setBoundary(2, v);
    project();

    // Advect velocity by itself (from a copy), then re-project.
    uPrev.set(u);
    vPrev.set(v);
    advect(1, u, uPrev, dt);
    advect(2, v, vPrev, dt);
    project();

    const dyeKeep = Math.exp(-DYE_DECAY * dt);
    for (const channel of dye) {
      dyePrev.set(channel);
      advect(0, channel, dyePrev, dt);
      for (let k = 0; k < size; k++) channel[k] *= dyeKeep;
    }
    clearSolids(...dye);
  }

  /* --------------------------------------------------------------- drawing */

  function draw() {
    const data = image!.data;
    const [r, g, b] = dye;
    let p = 0;
    for (let j = 1; j <= rows; j++) {
      for (let i = 1; i <= cols; i++) {
        const k = IX(i, j);
        const red = 1 - Math.exp(-TONE * r[k]);
        const green = 1 - Math.exp(-TONE * g[k]);
        const blue = 1 - Math.exp(-TONE * b[k]);
        // Alpha is the brightest channel and the colour is divided by it, so
        // over the background this adds the dye: colour·α + bg·(1 − α).
        const alpha = Math.max(red, green, blue, 1e-6);
        data[p] = (255 * red) / alpha;
        data[p + 1] = (255 * green) / alpha;
        data[p + 2] = (255 * blue) / alpha;
        data[p + 3] = 255 * alpha;
        p += 4;
      }
    }
    gridCtx!.putImageData(image!, 0, 0);
    ctx!.clearRect(0, 0, canvas!.width, canvas!.height);
    ctx!.imageSmoothingEnabled = true;
    ctx!.imageSmoothingQuality = "high";
    ctx!.drawImage(gridCanvas, 0, 0, canvas!.width, canvas!.height);

    // Squares, crisp at full resolution. Texel i's centre lands at
    // (i − ½) · width / cols, and grid cell i is texel i − 1.
    const sx = canvas!.width / cols;
    const sy = canvas!.height / rows;
    ctx!.fillStyle = SQUARE_COLOR;
    for (const q of squares) {
      ctx!.save();
      ctx!.translate((q.x - 0.5) * sx, (q.y - 0.5) * sy);
      ctx!.rotate(q.angle);
      // Cells are square to within rounding, so one scale keeps it square.
      ctx!.fillRect(-q.half * sx, -q.half * sx, 2 * q.half * sx, 2 * q.half * sx);
      ctx!.restore();
    }
  }

  /* ------------------------------------------------------------ frame loop */

  function frame(now: number) {
    rafId = requestAnimationFrame(frame);
    const dt = Math.min((now - lastTime) / 1000, MAX_DT);
    lastTime = now;
    step(dt);
    draw();
  }

  function start() {
    if (rafId || reduceMotion.matches || !watcher.visible()) return;
    lastTime = performance.now();
    rafId = requestAnimationFrame(frame);
  }

  function stop() {
    if (!rafId) return;
    cancelAnimationFrame(rafId);
    rafId = 0;
  }

  /** Under reduced motion, simulate a few seconds and show that still. */
  function staticFrame() {
    for (let t = 0; t < PRERUN_SECONDS; t += MAX_DT) step(MAX_DT);
    draw();
  }

  /* ----------------------------------------------------------------- wiring */

  const watcher = watchCanvas(canvas, {
    onResize() {
      if (!measure()) return; // New size, fresh fluid
      if (reduceMotion.matches) staticFrame();
      else draw();
    },
    onShow: start,
    onHide: stop,
  });

  reduceMotion.addEventListener("change", () => {
    if (reduceMotion.matches) {
      stop();
      draw();
    } else {
      start();
    }
  });

  canvas.addEventListener("pointermove", (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (pointer && rect.width > 0) {
      const scale = cols / rect.width; // Grid cells per CSS px
      const dx = x - pointer.x;
      const dy = y - pointer.y;
      splat(
        1 + x * scale,
        1 + y * scale,
        (dx * POINTER_FORCE) / scale,
        (dy * POINTER_FORCE) / scale,
        PALETTE[pointerColour],
        POINTER_DYE * Math.min(1, Math.hypot(dx, dy) / 20),
      );
      if (reduceMotion.matches) {
        step(MAX_DT);
        draw();
      }
    }
    pointer = { x, y };
  });
  canvas.addEventListener("pointerleave", () => {
    pointer = null;
    // Next stroke, next colour.
    pointerColour = (pointerColour + 1) % PALETTE.length;
  });

  measure();
  if (reduceMotion.matches) staticFrame();
  else draw();
  start();
}
