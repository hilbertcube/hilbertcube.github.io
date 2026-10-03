/**
 * preprintFigure.ts
 * =================
 * "Fig. 1" of the About-page banner: heat in an insulated rod,
 *
 *   u(x, t) = Σ a_k · e^{-k²π²t} · cos(kπx),   x ∈ [0, 1].
 *
 * Every term has zero slope at x = 0 and x = 1 (∂u/∂n = 0), so each curve meets
 * the walls flat, and a₀ — the mean — never changes.
 *
 * The geometry and curve maths are shared: PreprintFigure.astro imports them to
 * draw the still figure at build time (what reduced-motion and no-JS readers
 * see), and initPreprintFigure() animates that same SVG in the browser — a live
 * curve cools from the red t = 0 profile until it reaches equilibrium (flat to
 * within EQUILIBRIUM_PX), leaving faint traces on the way, then the plot fades
 * and restarts from a new random profile.
 *
 * Like the homepage canvas, the loop idles off-screen (IntersectionObserver)
 * and in a background tab (visibilitychange).
 */

/** Plot box in SVG units, and the u range it shows. */
export const FIG = { X0: 54, X1: 494, Y0: 22, Y1: 252, LO: -0.2, HI: 1.3 };

/** [k, a_k] — the profile drawn at build time and animated first. */
export const INITIAL_COEF: [number, number][] = [[0, 0.55], [1, 0.3], [2, -0.2], [5, 0.15]];

/** When a faint trace of the cooling curve is left behind, as fractions of the
 *  profile's equilibrium time. */
const TRACE_FRACTIONS = [0.005, 0.015, 0.04, 0.1, 0.3];

/** A run ends once no point can be further than this from the mean. */
const EQUILIBRIUM_PX = 0.5;

const SAMPLES = 160;
const RUN_MS = 8000; // t = 0 → equilibrium
const HOLD_MS = 2500; // Rest on the finished figure
const FADE_MS = 700; // Matches the .plot opacity transition in PreprintFigure.astro
const DESIRED_FPS = 30;
const FRAME_MS = 1000 / DESIRED_FPS;
const MAX_STEP = FRAME_MS * 3; // Cap the catch-up after a stall/tab switch

const toY = (u: number) => FIG.Y1 - ((u - FIG.LO) / (FIG.HI - FIG.LO)) * (FIG.Y1 - FIG.Y0);

function heat(coef: [number, number][], x: number, t: number) {
  let u = 0;
  for (const [k, a] of coef) u += a * Math.exp(-k * k * Math.PI * Math.PI * t) * Math.cos(k * Math.PI * x);
  return u;
}

/**
 * The time after which u(·, t) is flat to within EQUILIBRIUM_PX on the plot:
 * the bound Σ_{k≥1} |a_k| e^{-k²π²t} on the distance from the mean is
 * decreasing, so bisect on it.
 */
function equilibriumTime(coef: [number, number][]) {
  const tol = (EQUILIBRIUM_PX * (FIG.HI - FIG.LO)) / (FIG.Y1 - FIG.Y0);
  const bound = (t: number) =>
    coef.reduce((sum, [k, a]) => sum + (k ? Math.abs(a) * Math.exp(-k * k * Math.PI * Math.PI * t) : 0), 0);
  let lo = 0;
  let hi = 5;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (bound(mid) > tol) lo = mid;
    else hi = mid;
  }
  return hi;
}

/** The trace times for a profile. */
export const traceTimes = (coef: [number, number][]) => {
  const tEq = equilibriumTime(coef);
  return TRACE_FRACTIONS.map((f) => f * tEq);
};

/** SVG path data for u(·, t). */
export function curvePath(coef: [number, number][], t: number) {
  let d = "";
  for (let s = 0; s <= SAMPLES; s++) {
    const x = s / SAMPLES;
    d += `${s ? "L" : "M"}${(FIG.X0 + x * (FIG.X1 - FIG.X0)).toFixed(1)} ${toY(heat(coef, x, t)).toFixed(1)}`;
  }
  return d;
}

/** Where the mean line and the two labels go for a given profile. */
export function layout(coef: [number, number][]) {
  const mean = coef.find(([k]) => k === 0)?.[1] ?? 0;
  const meanY = toY(mean);
  const startY = toY(heat(coef, 0, 0));
  return {
    meanY,
    // Under the dashed line, unless that would run into the axis.
    meanLabelY: meanY + 18 > FIG.Y1 - 4 ? meanY - 8 : meanY + 18,
    // Above where the t = 0 curve leaves the left wall, or under it near the top.
    startLabelY: startY - 8 < FIG.Y0 ? startY + 18 : startY - 8,
  };
}

/** A random profile of 3–4 cosine modes, scaled and shifted to fill the plot. */
function randomCoef(): [number, number][] {
  const ks = [1, 2, 3, 4, 5, 6, 7].sort(() => Math.random() - 0.5).slice(0, 3 + Math.round(Math.random()));
  const modes: [number, number][] = ks.map((k) => [k, (Math.random() * 2 - 1) / (0.6 + 0.25 * k)]);

  let lo = Infinity;
  let hi = -Infinity;
  for (let s = 0; s <= SAMPLES; s++) {
    const u = heat(modes, s / SAMPLES, 0);
    lo = Math.min(lo, u);
    hi = Math.max(hi, u);
  }
  const scale = (0.75 + 0.35 * Math.random()) / Math.max(hi - lo, 1e-6);
  const minMean = FIG.LO + 0.12 - lo * scale;
  const maxMean = FIG.HI - 0.12 - hi * scale;
  const mean = minMean + Math.random() * Math.max(0, maxMean - minMean);
  return [[0, mean], ...modes.map(([k, a]): [number, number] => [k, a * scale])];
}

export function initPreprintFigure() {
  const svg = document.getElementById("preprint-figure");
  if (!svg) return;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (reduceMotion.matches) return; // The build-time figure is the still frame

  const q = <T extends Element>(role: string) => svg.querySelector<T>(`[data-fig="${role}"]`)!;
  const plot = q<SVGGElement>("plot");
  const initial = q<SVGPathElement>("initial");
  const live = q<SVGPathElement>("live");
  const mean = q<SVGLineElement>("mean");
  const meanLabel = q<SVGTextElement>("mean-label");
  const startLabel = q<SVGTextElement>("start-label");
  const clock = q<SVGTextElement>("clock");
  const clockValue = q<SVGTSpanElement>("clock-value"); // After the italic t
  const traces = [...svg.querySelectorAll<SVGPathElement>('[data-fig="trace"]')];

  let coef = INITIAL_COEF;
  let tEq = equilibriumTime(coef);
  let times = traceTimes(coef);
  let phase: "run" | "hold" | "out" | "in" = "run";
  let elapsed = 0;
  let shown = 0;

  const applyCoef = () => {
    tEq = equilibriumTime(coef);
    times = traceTimes(coef);
    const { meanY, meanLabelY, startLabelY } = layout(coef);
    initial.setAttribute("d", curvePath(coef, 0));
    live.setAttribute("d", curvePath(coef, 0));
    mean.setAttribute("y1", String(meanY));
    mean.setAttribute("y2", String(meanY));
    meanLabel.setAttribute("y", String(meanLabelY));
    startLabel.setAttribute("y", String(startLabelY));
    clockValue.textContent = " = 0.000";
  };

  const startRun = () => {
    phase = "run";
    elapsed = 0;
    shown = 0;
    traces.forEach((trace) => trace.classList.add("hidden"));
  };

  const step = (dt: number) => {
    elapsed += dt;
    switch (phase) {
      case "run": {
        const s = Math.min(1, elapsed / RUN_MS);
        const t = tEq * s ** 3; // Slow at first, where the high modes die fast
        live.setAttribute("d", curvePath(coef, t));
        clockValue.textContent = s < 1 ? ` = ${t.toFixed(3)}` : ` = ${t.toFixed(3)}: equilibrium`;
        while (shown < traces.length && t >= times[shown]) {
          traces[shown].setAttribute("d", curvePath(coef, times[shown]));
          traces[shown].classList.remove("hidden");
          shown++;
        }
        if (s >= 1) {
          phase = "hold";
          elapsed = 0;
        }
        break;
      }
      case "hold":
        if (elapsed >= HOLD_MS) {
          plot.classList.add("hidden");
          phase = "out";
          elapsed = 0;
        }
        break;
      case "out":
        if (elapsed >= FADE_MS) {
          coef = randomCoef();
          applyCoef();
          traces.forEach((trace) => trace.classList.add("hidden"));
          plot.classList.remove("hidden");
          phase = "in";
          elapsed = 0;
        }
        break;
      case "in":
        if (elapsed >= FADE_MS) startRun();
        break;
    }
  };

  // The static traces dissolve as the live curve starts from t = 0.
  applyCoef();
  clock.removeAttribute("visibility");
  startRun();

  let visible = false;
  let raf = 0;
  let last = 0;
  const running = () => visible && !document.hidden;
  const frame = (now: number) => {
    raf = 0;
    if (!running()) return;
    raf = requestAnimationFrame(frame);
    if (!last) last = now;
    if (now - last < FRAME_MS) return;
    step(Math.min(now - last, MAX_STEP));
    last = now;
  };
  const kick = () => {
    if (!running() || raf) return;
    last = 0; // Resume where it paused rather than jumping ahead
    raf = requestAnimationFrame(frame);
  };

  new IntersectionObserver((entries) => {
    visible = entries[entries.length - 1].isIntersecting;
    kick();
  }).observe(svg);
  document.addEventListener("visibilitychange", kick);
}
