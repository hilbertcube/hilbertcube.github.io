/**
 * mazeCanvas.ts
 * =============
 * HeroBanner art (MazeCanvas.astro): a maze flooded by heat. Each cycle draws a new
 * random blob — a wobbly circle, r(θ) = a sum of sines, stretched to the
 * padded canvas — and fills it with a maze. Loops through:
 *
 * 1. build — Wilson's algorithm: loop-erased random walks, each carved into
 *    the maze when it hits it. Yields a uniformly random maze.
 * 2. heat — heat spreads from a random cell (T ← T + α·ΔT) until the
 *    farthest cell warms.
 * 3. hold, 4. fade.
 *
 * A click moves the heat source. Idles off-screen, in background tabs, and
 * under reduced motion (one static frame).
 *
 * The canvas is transparent wherever nothing is drawn, so the banner's own
 * background shows through, and the fade runs to transparent too.
 */

import { watchCanvas } from "./watchCanvas";

const WALL = 2; // Wall thickness, CSS px
const LOOP_FRACTION = 0.08; // Extra openings so heat can loop
const PADDING_CELLS = 2.5; // Empty margin around the maze, in cells
const MAX_DPR = 2;

// Blob outline: r(θ) = BLOB_RADIUS · (1 + Σ a_k sin(kθ + φ_k)), k = 2..,
// in units of the half-width/half-height. Σ a_k ≤ BLOB_WOBBLE keeps the
// peaks inside the padded area.
const BLOB_RADIUS = 0.78;
const BLOB_WOBBLE = 0.28;
const BLOB_HARMONICS = 4;

// Scales walk and carve speed. 1 ≈ 6.5 s per build on desktop, 0.5 ≈ 14 s.
const BUILD_SPEED = 0.7;

// Walk steps per 60 fps frame; grows with walk length and maze fill.
const BUILD_BASE_STEPS = 3;
const BUILD_WALK_DIVISOR = 20;
const BUILD_TREE_STEPS = 25;

// Carve ms per cell, easing from START to END as the maze fills.
const CARVE_MS_START = 10;
const CARVE_MS_END = 0.5;

// Heat. α ≤ 1/4 keeps the scheme stable. Reaching distance d takes ~d²
// iterations, so a quadratic schedule keeps the front's pace steady.
const ALPHA = 0.24;
const HEAT_MS = 6000; // Target time to reach the goal
const HEAT_ITERS_PER_DIST2 = 1; // Iterations ≈ this × (goal distance)²
const GOAL_TEMPERATURE = 1e-3; // Goal heat that counts as arrived
const MAX_ITERS_PER_FRAME = 600;
const MAX_ITERS_INSTANT = 40000; // Cap for finishing in one go
const DECADES = 5; // Colour ramp spans 10^-DECADES to 1

const HOLD_MS = 3000;
const FADE_MS = 700;

const WALL_COLOR = "#ffffff";
const UNCARVED_COLOR = "#161616";
const WALK_COLOR = "#007bff"; // --toc-focus-color

// Log-scaled temperature → blue–green–yellow ramp, precomputed.
const LEVELS = 48;
const HEAT_COLORS = Array.from({ length: LEVELS }, (_, i) => {
  const v = (i + 1) / LEVELS;
  const hue = 240 - 180 * v; // Blue (240) → green (120) → yellow (60)
  const lightness = 12 + 33 * v; // Deep shades for the dark background
  return `hsl(${hue.toFixed(1)}, 100%, ${lightness.toFixed(1)}%)`;
});

// Passage bits: set = open.
const N = 1;
const E = 2;
const S = 4;
const W = 8;
const DIRS = [N, E, S, W] as const;
const OPPOSITE: Record<number, number> = { [N]: S, [E]: W, [S]: N, [W]: E };

type Phase = "build" | "heat" | "hold" | "fade";

function randomDir() {
  return DIRS[Math.floor(Math.random() * 4)];
}

export function initMazeCanvas() {
  const canvas = document.getElementById("mazeCanvas") as HTMLCanvasElement | null;
  if (!canvas) return;
  const ctx = canvas.getContext("2d", { alpha: true });
  const wallCanvas = document.createElement("canvas");
  const wallCtx = wallCanvas.getContext("2d");
  if (!ctx || !wallCtx) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  let dpr = 1;
  let cssWidth = 0;
  let cssHeight = 0;

  // Grid geometry, CSS px
  let cell = 16;
  let cols = 0;
  let rows = 0;
  let total = 0; // cols × rows
  let inMaze = new Uint8Array(0); // 1 if the cell lies inside the blob
  let mazeCells: number[] = []; // Indices of the cells inside
  let ox = 0;
  let oy = 0;

  let open = new Uint8Array(0); // Passage bits per cell
  let wallsDirty = true;

  // Build
  let inTree = new Uint8Array(0);
  let walkIndex = new Int32Array(0); // Index in `walk`, or -1
  let walk: number[] = [];
  let walkSteps = 0; // Steps in the current walk
  let treeSize = 0;
  let order: number[] = []; // Shuffled walk starts
  let orderAt = 0;
  let carveAt = 0; // > 0 while carving: walk[carveAt - 1] is next
  let stepsDue = 0; // Steps owed to elapsed time
  let carveDue = 0;

  // Heat
  let temp = new Float64Array(0);
  let scratch = new Float64Array(0);
  let source = 0;
  let goal = 0; // Farthest cell; heating stops when it warms
  let itersTarget = 0; // Estimated iterations to reach the goal
  let itersDone = 0;
  let heatTime = 0;

  let phase: Phase = "build";
  let phaseTime = 0; // ms in the current phase

  let rafId = 0;
  let lastTime = 0;

  /* ---------------------------------------------------------------- sizing */

  function cellForWidth(width: number) {
    if (width < 580) return 10;
    if (width > 2400) return 24;
    if (width > 1800) return 20;
    return 16;
  }

  /** Resize both backing stores to the canvas's CSS box. True if anything changed. */
  function measure(): boolean {
    const nextWidth = canvas!.clientWidth;
    const nextHeight = canvas!.clientHeight;
    const nextDpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    const nextCell = cellForWidth(window.innerWidth);
    if (
      nextWidth === cssWidth &&
      nextHeight === cssHeight &&
      nextDpr === dpr &&
      nextCell === cell
    ) {
      return false;
    }
    cssWidth = nextWidth;
    cssHeight = nextHeight;
    dpr = nextDpr;
    cell = nextCell;

    canvas!.width = wallCanvas.width = Math.max(1, Math.round(cssWidth * dpr));
    canvas!.height = wallCanvas.height = Math.max(1, Math.round(cssHeight * dpr));
    // Work in CSS pixels.
    ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    wallCtx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    wallsDirty = true;
    return true;
  }

  /* -------------------------------------------------------------- geometry */

  function neighbour(index: number, dir: number): number {
    const c = index % cols;
    const r = (index - c) / cols;
    let next: number;
    if (dir === N) next = r > 0 ? index - cols : -1;
    else if (dir === S) next = r < rows - 1 ? index + cols : -1;
    else if (dir === W) next = c > 0 ? index - 1 : -1;
    else next = c < cols - 1 ? index + 1 : -1;
    return next !== -1 && inMaze[next] ? next : -1;
  }

  function connect(a: number, b: number) {
    for (const dir of DIRS) {
      if (neighbour(a, dir) !== b) continue;
      open[a] |= dir;
      open[b] |= OPPOSITE[dir];
      wallsDirty = true;
      return;
    }
  }

  function randomCell() {
    return mazeCells[Math.floor(Math.random() * mazeCells.length)];
  }

  /** Mark the cells inside a fresh random blob, keeping only the piece
   *  connected to the centre so the maze is one region. */
  function shapeBlob() {
    const harmonics = Array.from({ length: BLOB_HARMONICS }, (_, i) => ({
      k: i + 2,
      a: Math.random(),
      phase: Math.random() * 2 * Math.PI,
    }));
    const sum = harmonics.reduce((acc, h) => acc + h.a, 0);
    for (const h of harmonics) h.a *= BLOB_WOBBLE / sum;

    const inside = new Uint8Array(total);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = (c + 0.5 - cols / 2) / (cols / 2);
        const y = (r + 0.5 - rows / 2) / (rows / 2);
        const theta = Math.atan2(y, x);
        let radius = 1;
        for (const h of harmonics) radius += h.a * Math.sin(h.k * theta + h.phase);
        if (Math.hypot(x, y) <= BLOB_RADIUS * radius) inside[r * cols + c] = 1;
      }
    }

    // Flood fill from the centre (always inside: r(θ) > 0).
    inMaze = new Uint8Array(total);
    const centre = Math.floor(rows / 2) * cols + Math.floor(cols / 2);
    inside[centre] = 1;
    inMaze[centre] = 1;
    mazeCells = [centre];
    for (let head = 0; head < mazeCells.length; head++) {
      const index = mazeCells[head];
      const c = index % cols;
      const around = [
        index >= cols ? index - cols : -1,
        index + cols < total ? index + cols : -1,
        c > 0 ? index - 1 : -1,
        c < cols - 1 ? index + 1 : -1,
      ];
      for (const next of around) {
        if (next === -1 || !inside[next] || inMaze[next]) continue;
        inMaze[next] = 1;
        mazeCells.push(next);
      }
    }
  }

  /** Top-left of a cell's interior. */
  function interior(index: number): [number, number] {
    const c = index % cols;
    const r = (index - c) / cols;
    return [ox + c * cell + WALL / 2, oy + r * cell + WALL / 2];
  }

  /* ----------------------------------------------------------------- build */

  function startBuild() {
    // Padding on every side, plus half a wall so the border isn't clipped.
    const margin = 2 * PADDING_CELLS * cell + WALL;
    cols = Math.max(1, Math.floor((cssWidth - margin) / cell));
    rows = Math.max(1, Math.floor((cssHeight - margin) / cell));
    total = cols * rows;
    ox = Math.floor((cssWidth - cols * cell) / 2);
    oy = Math.floor((cssHeight - rows * cell) / 2);
    shapeBlob();

    open = new Uint8Array(total);
    inTree = new Uint8Array(total);
    walkIndex = new Int32Array(total).fill(-1);
    temp = new Float64Array(total);
    scratch = new Float64Array(total);
    wallsDirty = true;

    order = mazeCells.slice();
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    // The maze starts as one cell.
    inTree[order[0]] = 1;
    treeSize = 1;
    orderAt = 1;
    walk = [];
    carveAt = 0;
    stepsDue = 0;
    carveDue = 0;
    setPhase("build");
  }

  /** Start a walk from the next cell outside the maze. False if none. */
  function nextWalk(): boolean {
    while (orderAt < order.length && inTree[order[orderAt]]) orderAt++;
    if (orderAt >= order.length) return false;
    const start = order[orderAt];
    walk = [start];
    walkIndex[start] = 0;
    walkSteps = 0;
    return true;
  }

  /** Carve the next cell of a finished walk. */
  function carveStep() {
    const to = walk[carveAt - 1];
    connect(walk[carveAt], to);
    inTree[to] = 1;
    walkIndex[to] = -1;
    treeSize++;
    carveAt--;
    walk.length = carveAt > 0 ? carveAt + 1 : 0;
  }

  /** One carve or walk step. False once the maze is complete. */
  function buildStep(): boolean {
    if (carveAt > 0) {
      carveStep();
      return treeSize < mazeCells.length;
    }
    if (!walk.length && !nextWalk()) return false;

    let next = -1;
    while (next === -1) next = neighbour(walk[walk.length - 1], randomDir());
    walkSteps++;

    if (inTree[next]) {
      // Hit the maze: carve the walk in.
      walk.push(next);
      carveAt = walk.length - 1;
    } else if (walkIndex[next] !== -1) {
      // Crossed itself: erase the loop.
      const seen = walkIndex[next];
      for (let i = seen + 1; i < walk.length; i++) walkIndex[walk[i]] = -1;
      walk.length = seen + 1;
    } else {
      walkIndex[next] = walk.length;
      walk.push(next);
    }
    return true;
  }

  /** Advance the build by `dt` ms. False once complete. */
  function advanceBuild(dt: number): boolean {
    const filled = treeSize / mazeCells.length;
    // Walking and carving keep separate clocks; a frame stops at a switch.
    if (carveAt > 0) {
      const carveMs = CARVE_MS_START * (CARVE_MS_END / CARVE_MS_START) ** filled;
      carveDue += (BUILD_SPEED * dt) / carveMs;
    } else {
      const perFrame =
        BUILD_BASE_STEPS + walkSteps / BUILD_WALK_DIVISOR + BUILD_TREE_STEPS * filled;
      stepsDue += BUILD_SPEED * (dt / (1000 / 60)) * perFrame;
    }
    while (true) {
      if (carveAt > 0) {
        if (carveDue < 1) return true;
        carveDue--;
      } else {
        if (stepsDue < 1) return true;
        stepsDue--;
      }
      if (!buildStep()) return false;
    }
  }

  function finishBuild() {
    while (buildStep());
    // Add a few loops.
    const extra = Math.floor(mazeCells.length * LOOP_FRACTION);
    for (let i = 0; i < extra; i++) {
      const index = randomCell();
      const next = neighbour(index, randomDir());
      if (next !== -1) connect(index, next);
    }
  }

  /* ------------------------------------------------------------------ heat */

  /** BFS: farthest cell from `from`, and its distance. */
  function farthestFrom(from: number) {
    const dist = new Int32Array(total).fill(-1);
    dist[from] = 0;
    const queue = [from];
    for (let head = 0; head < queue.length; head++) {
      const current = queue[head];
      for (const dir of DIRS) {
        if (!(open[current] & dir)) continue;
        const next = neighbour(current, dir);
        if (dist[next] !== -1) continue;
        dist[next] = dist[current] + 1;
        queue.push(next);
      }
    }
    const far = queue[queue.length - 1];
    return { cell: far, distance: dist[far] };
  }

  function startHeat(from: number) {
    source = from;
    const far = farthestFrom(from);
    goal = far.cell;
    itersTarget = Math.max(200, HEAT_ITERS_PER_DIST2 * far.distance * far.distance);
    temp.fill(0);
    temp[source] = 1;
    itersDone = 0;
    heatTime = 0;
    setPhase("heat");
  }

  /** One step of T ← T + α·ΔT, source pinned at 1. */
  function diffuse() {
    const t = temp;
    for (let i = 0; i < total; i++) {
      const bits = open[i];
      const here = t[i];
      let laplacian = 0;
      if (bits & N) laplacian += t[i - cols] - here;
      if (bits & S) laplacian += t[i + cols] - here;
      if (bits & W) laplacian += t[i - 1] - here;
      if (bits & E) laplacian += t[i + 1] - here;
      scratch[i] = here + ALPHA * laplacian;
    }
    scratch[source] = 1;
    temp = scratch;
    scratch = t;
    itersDone++;
  }

  /** Run iterations due by `ms`: quadratic to HEAT_MS, then linear. */
  function heatTo(ms: number) {
    const x = Math.min(ms, HEAT_MS) / HEAT_MS;
    const due =
      itersTarget * x * x + Math.max(0, ms - HEAT_MS) * ((2 * itersTarget) / HEAT_MS);
    let budget = MAX_ITERS_PER_FRAME;
    while (itersDone < due && budget-- > 0) diffuse();
  }

  /* --------------------------------------------------------------- drawing */

  function renderWalls() {
    const c2 = wallCtx!;
    c2.clearRect(0, 0, cssWidth, cssHeight);
    c2.strokeStyle = WALL_COLOR;
    c2.lineWidth = WALL;
    c2.lineCap = "square";
    c2.beginPath();
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const index = r * cols + c;
        if (!inMaze[index]) continue;
        const bits = open[index];
        const x = ox + c * cell;
        const y = oy + r * cell;
        // Each cell draws its N and W walls; S and E only on the outline,
        // where no cell below or to the right will draw them.
        if (!(bits & N)) {
          c2.moveTo(x, y);
          c2.lineTo(x + cell, y);
        }
        if (!(bits & W)) {
          c2.moveTo(x, y);
          c2.lineTo(x, y + cell);
        }
        if (neighbour(index, S) === -1) {
          c2.moveTo(x, y + cell);
          c2.lineTo(x + cell, y + cell);
        }
        if (neighbour(index, E) === -1) {
          c2.moveTo(x + cell, y);
          c2.lineTo(x + cell, y + cell);
        }
      }
    }
    c2.stroke();
    wallsDirty = false;
  }

  function drawBuild() {
    const size = cell - WALL;
    const uncarved = new Path2D();
    for (const i of mazeCells) if (!inTree[i]) uncarved.rect(...interior(i), size, size);
    ctx!.fillStyle = UNCARVED_COLOR;
    ctx!.fill(uncarved);

    if (!walk.length) return;
    const cells = new Path2D();
    const line = new Path2D();
    for (const index of walk) {
      const [x, y] = interior(index);
      cells.rect(x, y, size, size);
      line.lineTo(x + size / 2, y + size / 2);
    }
    ctx!.globalAlpha = 0.35;
    ctx!.fillStyle = WALK_COLOR;
    ctx!.fill(cells);
    ctx!.globalAlpha = 1;
    if (walk.length < 2) return;
    ctx!.strokeStyle = WALK_COLOR;
    ctx!.lineWidth = Math.max(2, cell * 0.2);
    ctx!.lineCap = "round";
    ctx!.lineJoin = "round";
    ctx!.stroke(line);
  }

  /** Colour level of a temperature, or -1. */
  function level(t: number) {
    if (t <= 0) return -1;
    const v = 1 + Math.log10(t) / DECADES;
    return v <= 0 ? -1 : Math.min(LEVELS - 1, Math.floor(v * LEVELS));
  }

  /** Heat field, one fill per level; gaps and open corners filled too. */
  function drawHeat() {
    const levels = new Int8Array(total);
    for (let i = 0; i < total; i++) levels[i] = level(temp[i]);

    const buckets: (Path2D | undefined)[] = new Array(LEVELS);
    const bucket = (lv: number) => (buckets[lv] ??= new Path2D());
    const size = cell - WALL;

    for (let i = 0; i < total; i++) {
      const lv = levels[i];
      if (lv < 0) continue;
      const [x, y] = interior(i);
      bucket(lv).rect(x, y, size, size);

      // E and S gaps; neighbours cover the rest.
      const bits = open[i];
      if (bits & E && levels[i + 1] >= 0) {
        bucket(Math.min(lv, levels[i + 1])).rect(x + size, y, WALL, size);
      }
      if (bits & S && levels[i + cols] >= 0) {
        bucket(Math.min(lv, levels[i + cols])).rect(x, y + size, size, WALL);
      }
      // SE corner, when no wall meets it.
      if (
        bits & E &&
        bits & S &&
        open[i + 1] & S &&
        open[i + cols] & E &&
        levels[i + 1] >= 0 &&
        levels[i + cols] >= 0 &&
        levels[i + cols + 1] >= 0
      ) {
        bucket(lv).rect(x + size, y + size, WALL, WALL);
      }
    }

    buckets.forEach((p, lv) => {
      if (!p) return;
      ctx!.fillStyle = HEAT_COLORS[lv];
      ctx!.fill(p);
    });
  }

  function draw() {
    ctx!.clearRect(0, 0, cssWidth, cssHeight);
    // Fade to transparent, onto whatever is behind the canvas.
    ctx!.globalAlpha = phase === "fade" ? Math.max(0, 1 - phaseTime / FADE_MS) : 1;
    if (phase === "build") drawBuild();
    else drawHeat();

    if (wallsDirty) renderWalls();
    ctx!.drawImage(wallCanvas, 0, 0, cssWidth, cssHeight);
    ctx!.globalAlpha = 1;
  }

  /* ------------------------------------------------------------ frame loop */

  function setPhase(next: Phase) {
    phase = next;
    phaseTime = 0;
  }

  /** Jump to the end of the current cycle. */
  function finish() {
    if (phase === "build") {
      finishBuild();
      startHeat(randomCell());
    }
    if (phase === "heat") {
      let iterations = 0;
      while (temp[goal] < GOAL_TEMPERATURE && iterations++ < MAX_ITERS_INSTANT) diffuse();
    }
    setPhase("hold");
  }

  function step(dt: number) {
    phaseTime += dt;
    if (phase === "build") {
      if (!advanceBuild(dt)) {
        finishBuild();
        startHeat(randomCell());
      }
    } else if (phase === "heat") {
      heatTime += dt;
      heatTo(heatTime);
      // Freeze on arrival so the gradient doesn't wash out.
      if (temp[goal] >= GOAL_TEMPERATURE) setPhase("hold");
    } else if (phase === "hold") {
      if (phaseTime >= HOLD_MS) setPhase("fade");
    } else if (phaseTime >= FADE_MS) {
      startBuild();
    }
  }

  function frame(now: number) {
    rafId = requestAnimationFrame(frame);
    // Cap catch-up after a stall.
    const dt = Math.min(now - lastTime, 100);
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

  /** New maze; finished at once under reduced motion. */
  function reset() {
    startBuild();
    if (reduceMotion.matches) finish();
    draw();
  }

  /* ----------------------------------------------------------------- wiring */

  const watcher = watchCanvas(canvas, {
    onResize() {
      if (measure()) reset(); // New size, new maze
    },
    onShow: start,
    onHide: stop,
  });

  reduceMotion.addEventListener("change", () => {
    if (reduceMotion.matches) {
      stop();
      if (phase === "fade") startBuild();
      finish();
      draw();
    } else {
      start();
    }
  });

  canvas.addEventListener("click", (e) => {
    const rect = canvas.getBoundingClientRect();
    const c = Math.floor((e.clientX - rect.left - ox) / cell);
    const r = Math.floor((e.clientY - rect.top - oy) / cell);
    if (c < 0 || r < 0 || c >= cols || r >= rows || !inMaze[r * cols + c]) return;
    if (phase === "build") finishBuild();
    startHeat(r * cols + c);
    if (reduceMotion.matches) finish();
    draw();
  });

  measure();
  reset();
  start();
}
