/**
 * equationsCanvas.ts
 * ==================
 * HeroBanner art (EquationsCanvas.astro): drifting equations. SVGs bounce
 * around inside #equationsCanvas and a click drops a temporary extra one at the
 * pointer. The canvas is transparent between them, so the banner's own
 * background shows through.
 *
 * Performance notes
 * -----------------
 * The equations are SVGs of hundreds of <path> nodes, which drawImage() would
 * re-rasterise every frame in most engines. Each is rasterised once into an
 * offscreen canvas at its final pixel size and the loop only blits those,
 * re-rasterising when the scale or devicePixelRatio changes.
 *
 * On top of that the loop is idle whenever it can't be seen: off-screen
 * (IntersectionObserver), backgrounded tab (visibilitychange), or the reader
 * asked for reduced motion (one static frame, no rAF at all).
 */

import { watchCanvas } from "./watchCanvas";

const SVG_FILES = [
  "LDM.svg",
  "stokes.svg",
  "laplace.svg",
  "discrete-fourier.svg",
  "cauchy.svg",
  "navier.svg",
  "information.svg",
  "moore.svg",
  "filter.svg",
];

// Note: color = stroke
// L_{\text{LDM}} = \mathbb{E}_{t, z_0, \varepsilon, y}\left[\lVert \varepsilon - \varepsilon_0(z_t, t, \tau_\theta(y)) \rVert^2\right]

const SPEED = 1.5; // Speed of the SVGs
const ROTATION_SPEED = 0.01; // Speed of rotation (radians per frame)
const ROTATE = false;
const DESIRED_FPS = 40; // Default is 60
const FRAME_MS = 1000 / DESIRED_FPS;
const MAX_STEP = FRAME_MS * 3; // Cap the catch-up after a stall/tab switch
const ADDED_LIFETIME_MS = 5000; // How long a click-added SVG sticks around
const MAX_DPR = 2; // Beyond 2x the extra sharpness isn't worth the fill cost

/** An SVG rasterised once at its on-screen size. `w`/`h` are CSS pixels. */
interface Bitmap {
  canvas: HTMLCanvasElement;
  w: number;
  h: number;
}

interface Sprite {
  x: number;
  y: number;
  dx: number;
  dy: number;
  angle: number;
  dAngle: number;
  bitmap: Bitmap;
  /** Timestamp after which a click-added sprite is dropped. `0` = never. */
  expiresAt: number;
}

export function initEquationsCanvas() {
  const canvas = document.getElementById("equationsCanvas") as HTMLCanvasElement | null;
  const ctx = canvas?.getContext("2d", { alpha: true });
  if (!canvas || !ctx) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  const sources: HTMLImageElement[] = []; // Decoded SVG <img>s, the raster source
  const bitmaps: Bitmap[] = []; // Same order, rasterised at the current scale
  let sprites: Sprite[] = [];

  let scale = 1; // Size multiplier applied to each SVG's intrinsic size
  let dpr = 1;
  let cssWidth = 0;
  let cssHeight = 0;

  let rafId = 0;
  let lastRender = 0;
  let ready = false;

  /* ---------------------------------------------------------------- sizing */

  function scaleForWidth(width: number) {
    // Widest first: these are checked in order, so the largest threshold has
    // to come first or it can never be reached.
    if (width < 580) return 0.6;
    if (width > 2400) return 2.5;
    if (width > 1800) return 1.2;
    return 1;
  }

  /**
   * Rasterise one SVG at `scale * dpr`, drawn back at `scale` CSS pixels, so
   * the per-frame blit lands 1:1 on the device pixel grid.
   */
  function rasterise(img: HTMLImageElement): Bitmap {
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));
    const off = document.createElement("canvas");
    off.width = Math.max(1, Math.round(w * dpr));
    off.height = Math.max(1, Math.round(h * dpr));
    const offCtx = off.getContext("2d");
    if (offCtx) offCtx.drawImage(img, 0, 0, off.width, off.height);
    return { canvas: off, w, h };
  }

  function rasteriseAll() {
    for (let i = 0; i < sources.length; i++) {
      const img = sources[i];
      if (!img) continue;
      const next = rasterise(img);
      const previous = bitmaps[i];
      bitmaps[i] = next;
      // Sprites hold the bitmap by reference, so repoint the live ones.
      if (previous) {
        for (const sprite of sprites) {
          if (sprite.bitmap === previous) sprite.bitmap = next;
        }
      }
    }
  }

  /**
   * Match the backing store to the canvas's CSS box. Returns true when anything
   * changed, so callers can skip the (expensive) re-rasterise on no-op resizes.
   */
  function measure(): boolean {
    const nextWidth = canvas!.clientWidth;
    const nextHeight = canvas!.clientHeight;
    const nextDpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    const nextScale = scaleForWidth(window.innerWidth);

    if (
      nextWidth === cssWidth &&
      nextHeight === cssHeight &&
      nextDpr === dpr &&
      nextScale === scale
    ) {
      return false;
    }

    const rescale = nextScale !== scale || nextDpr !== dpr;
    cssWidth = nextWidth;
    cssHeight = nextHeight;
    dpr = nextDpr;
    scale = nextScale;

    canvas!.width = Math.max(1, Math.round(cssWidth * dpr));
    canvas!.height = Math.max(1, Math.round(cssHeight * dpr));
    // Work in CSS pixels everywhere below.
    ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (rescale && ready) rasteriseAll();
    return true;
  }

  /* --------------------------------------------------------------- sprites */

  function clamp(value: number, min: number, max: number) {
    return Math.min(Math.max(value, min), max);
  }

  function spawn(bitmap: Bitmap, x: number, y: number, speed: number): Sprite {
    return {
      x,
      y,
      dx: (Math.random() > 0.5 ? 1 : -1) * speed,
      dy: (Math.random() > 0.5 ? 1 : -1) * speed,
      angle: Math.random() * Math.PI * 2,
      dAngle: (Math.random() - 0.5) * ROTATION_SPEED,
      bitmap,
      expiresAt: 0,
    };
  }

  /** Largest in-frame offset for a sprite of `size` along an axis of `extent`. */
  function limit(extent: number, size: number) {
    return Math.max(0, extent - size);
  }

  function createSprites() {
    sprites = bitmaps.filter(Boolean).map((bitmap) =>
      spawn(
        bitmap,
        Math.random() * limit(cssWidth, bitmap.w),
        Math.random() * limit(cssHeight, bitmap.h),
        SPEED,
      ),
    );
  }

  // Add a temporary SVG at the clicked position
  function addSvgAt(x: number, y: number, now: number): Sprite | null {
    const bitmap = bitmaps[Math.floor(Math.random() * bitmaps.length)];
    // Sparse until every image has loaded, so an early click can miss.
    if (!bitmap) return null;

    const sprite = spawn(
      bitmap,
      clamp(x - bitmap.w / 2, 0, limit(cssWidth, bitmap.w)),
      clamp(y - bitmap.h / 2, 0, limit(cssHeight, bitmap.h)),
      0.7 * SPEED,
    );
    sprite.expiresAt = now + ADDED_LIFETIME_MS;
    sprites.push(sprite);
    return sprite;
  }

  /* ------------------------------------------------------------ frame loop */

  function update(now: number, timeRatio: number) {
    for (let i = sprites.length - 1; i >= 0; i--) {
      const sprite = sprites[i];

      if (sprite.expiresAt && now >= sprite.expiresAt) {
        sprites.splice(i, 1);
        continue;
      }

      sprite.x += sprite.dx * timeRatio;
      sprite.y += sprite.dy * timeRatio;

      sprite.dx = bounce(sprite, "x", "w", cssWidth);
      sprite.dy = bounce(sprite, "y", "h", cssHeight);

      if (ROTATE) sprite.angle += sprite.dAngle * timeRatio;
    }
  }

  /**
   * Reflect one axis off the frame edges, snapping the sprite back to the edge
   * it crossed.
   *
   * Reflecting by direction (not flipping the sign every out-of-range frame)
   * stops a sprite spawned or left far outside from vibrating in place; the
   * snap keeps it outside for at most one frame.
   */
  function bounce(sprite: Sprite, axis: "x" | "y", side: "w" | "h", extent: number) {
    const velocity = axis === "x" ? sprite.dx : sprite.dy;
    const slack = extent - sprite.bitmap[side];
    // A sprite wider than the frame has no fully-inside position, so let it
    // slide between the two overhangs instead of pinning it to one of them.
    const min = Math.min(0, slack);
    const max = Math.max(0, slack);

    if (sprite[axis] <= min) {
      sprite[axis] = min;
      return Math.abs(velocity);
    }
    if (sprite[axis] >= max) {
      sprite[axis] = max;
      return -Math.abs(velocity);
    }
    return velocity;
  }

  function draw() {
    ctx!.clearRect(0, 0, cssWidth, cssHeight);
    for (const sprite of sprites) {
      if (ROTATE) {
        ctx!.save();
        ctx!.translate(sprite.x + sprite.bitmap.w / 2, sprite.y + sprite.bitmap.h / 2);
        ctx!.rotate(sprite.angle);
        ctx!.drawImage(
          sprite.bitmap.canvas,
          -sprite.bitmap.w / 2,
          -sprite.bitmap.h / 2,
          sprite.bitmap.w,
          sprite.bitmap.h,
        );
        ctx!.restore();
      } else {
        // No transform needed in the common case — rounding to whole pixels
        // keeps the blit on the device grid and off the resampling path.
        ctx!.drawImage(
          sprite.bitmap.canvas,
          Math.round(sprite.x),
          Math.round(sprite.y),
          sprite.bitmap.w,
          sprite.bitmap.h,
        );
      }
    }
  }

  function frame(now: number) {
    rafId = requestAnimationFrame(frame);

    const elapsed = now - lastRender;
    if (elapsed < FRAME_MS) return; // Throttle to DESIRED_FPS
    // Keep the phase instead of resetting it, so we don't drift slow.
    lastRender = now - (elapsed % FRAME_MS);

    update(now, Math.min(elapsed, MAX_STEP) / FRAME_MS);
    draw();
  }

  function start() {
    if (rafId || !ready || reduceMotion.matches || !watcher.visible()) return;
    lastRender = performance.now();
    rafId = requestAnimationFrame(frame);
  }

  function stop() {
    if (!rafId) return;
    cancelAnimationFrame(rafId);
    rafId = 0;
  }

  /* ----------------------------------------------------------------- wiring */

  const watcher = watchCanvas(canvas, {
    onResize() {
      if (!measure()) return;
      if (ready && !rafId) draw(); // Keep the paused/static frame correct
    },
    onShow: start,
    onHide: stop,
  });

  // Readers can flip the OS setting mid-visit; honour it without a reload.
  const onMotionChange = () => {
    if (reduceMotion.matches) {
      stop();
      draw();
    } else {
      start();
    }
  };
  reduceMotion.addEventListener("change", onMotionChange);

  canvas.addEventListener("click", (e) => {
    if (!ready) return;
    const rect = canvas.getBoundingClientRect();
    const sprite = addSvgAt(e.clientX - rect.left, e.clientY - rect.top, performance.now());
    if (rafId || !sprite) return;
    // Reduced motion (or paused): the loop isn't running to draw or expire it,
    // so paint it now and retire it on a timer instead.
    draw();
    setTimeout(() => {
      const index = sprites.indexOf(sprite);
      if (index === -1) return;
      sprites.splice(index, 1);
      if (!rafId) draw();
    }, ADDED_LIFETIME_MS);
  });

  measure();

  // Load the SVGs, then rasterise once and go. Settled-not-all: a missing file
  // shouldn't take the whole animation down with it.
  Promise.allSettled(
    SVG_FILES.map(
      (fileName, index) =>
        new Promise<void>((resolve, reject) => {
          const img = new Image();
          img.decoding = "async";
          img.onload = () => {
            sources[index] = img;
            resolve();
          };
          img.onerror = () => reject(new Error(`banner svg failed: ${fileName}`));
          img.src = `/media/banner-svg/${fileName}`;
        }),
    ),
  ).then(() => {
    if (!sources.some(Boolean)) return;
    rasteriseAll();
    createSprites();
    ready = true;
    if (reduceMotion.matches) draw();
    else start();
  });
}
