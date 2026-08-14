/**
 * bannerCanvas.ts
 * ===============
 * The drifting-equation animation on the home / about banner. SVGs bounce
 * around inside #bannerCanvas, respawn when they leave the frame, and a click
 * drops a temporary extra one at the pointer.
 */

const SVG_FILES = [
  "LDM.svg",
  "stokes.svg",
  "laplace.svg",
  "discrete-fourier.svg",
  "cauchy.svg",
  "black-body.svg",
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
const ADDED_LIFETIME_MS = 5000; // How long a click-added SVG sticks around

interface Sprite {
  x: number;
  y: number;
  dx: number;
  dy: number;
  angle: number;
  dAngle: number;
  img: HTMLImageElement;
  permanent: boolean;
}

export function initBannerCanvas() {
  const canvas = document.getElementById("bannerCanvas") as HTMLCanvasElement | null;
  const ctx = canvas?.getContext("2d");
  if (!canvas || !ctx) return;

  const svgImages: HTMLImageElement[] = [];
  const numSvgs = SVG_FILES.length;

  let svgScaleFactor = 1.6; // Initial scale factor
  let svgs: Sprite[] = []; // All live sprites, original and click-added

  // Resize the canvas to fit its container
  function fitToContainer() {
    const parent = canvas!.parentElement;
    if (!parent) return;
    canvas!.width = parent.clientWidth;
    canvas!.height = parent.clientHeight;
  }

  function resizeCanvas() {
    fitToContainer();

    // Widest first: these are checked in order, so the largest threshold has
    // to come first or it can never be reached.
    if (window.innerWidth < 580) {
      svgScaleFactor = 0.6;
    } else if (window.innerWidth > 2400) {
      svgScaleFactor = 2.5;
    } else if (window.innerWidth > 1800) {
      svgScaleFactor = 1.2;
    } else {
      svgScaleFactor = 1;
    }
  }

  function startAnimation() {
    const canvasWidth = canvas!.width;
    const canvasHeight = canvas!.height;

    // Create initial positions with FIXED speed values
    svgs = svgImages.map((img) => ({
      x: Math.random() * (canvasWidth - img.width * svgScaleFactor),
      y: Math.random() * (canvasHeight - img.height * svgScaleFactor),
      dx: (Math.random() > 0.5 ? 1 : -1) * SPEED, // Fixed speed, just random direction
      dy: (Math.random() > 0.5 ? 1 : -1) * SPEED,
      angle: Math.random() * Math.PI * 2, // Initial random angle
      dAngle: (Math.random() - 0.5) * ROTATION_SPEED, // Random rotation speed
      img,
      permanent: true, // Mark original SVGs as permanent
    }));

    const interval = 1000 / DESIRED_FPS; // Time per frame in milliseconds
    let lastTime = 0;
    let lastFrameTime = 0;

    function animate(currentTime: number) {
      // Calculate time delta to create smooth, consistent animation
      const deltaTime = currentTime - lastFrameTime;
      lastFrameTime = currentTime;

      // First frame special case - don't use huge deltaTime
      if (deltaTime > 100 || deltaTime === currentTime) {
        requestAnimationFrame(animate);
        return;
      }

      // Normalize movement to expected frame rate
      const timeRatio = deltaTime / (1000 / DESIRED_FPS);

      if (currentTime - lastTime >= interval) {
        lastTime = currentTime;

        // Clear the entire canvas to prevent trailing
        ctx!.clearRect(0, 0, canvas!.width, canvas!.height);

        // Process all SVGs to check for out-of-bounds ones
        for (let i = svgs.length - 1; i >= 0; i--) {
          const svg = svgs[i];

          const isOutOfBounds =
            svg.x + svg.img.width * svgScaleFactor < 0 ||
            svg.x > canvas!.width ||
            svg.y + svg.img.height * svgScaleFactor < 0 ||
            svg.y > canvas!.height;

          if (isOutOfBounds) {
            // Remove the out-of-frame SVG
            svgs.splice(i, 1);

            // Re-add the SVG after a delay at a random position within the canvas
            setTimeout(() => {
              svg.x = Math.random() * (canvasWidth - svg.img.width * svgScaleFactor);
              svg.y = Math.random() * (canvasHeight - svg.img.height * svgScaleFactor);
              svgs.push(svg);
            }, 100);
          }
        }

        // Move and render the remaining SVGs
        svgs.forEach((svg) => {
          // Move SVG with consistent speed regardless of frame rate
          svg.x += svg.dx * timeRatio;
          svg.y += svg.dy * timeRatio;

          // Bounce off the borders
          if (svg.x < 0 || svg.x > canvas!.width - svg.img.width * svgScaleFactor)
            svg.dx *= -1;
          if (svg.y < 0 || svg.y > canvas!.height - svg.img.height * svgScaleFactor)
            svg.dy *= -1;

          // Save the context and apply the transformation
          ctx!.save();
          // Move to the center of the image
          ctx!.translate(
            svg.x + (svg.img.width * svgScaleFactor) / 2,
            svg.y + (svg.img.height * svgScaleFactor) / 2,
          );
          if (ROTATE) {
            svg.angle += svg.dAngle * timeRatio;
            ctx!.rotate(svg.angle); // Rotate around the center
          }
          ctx!.drawImage(
            svg.img,
            -(svg.img.width * svgScaleFactor) / 2,
            -(svg.img.height * svgScaleFactor) / 2,
            svg.img.width * svgScaleFactor,
            svg.img.height * svgScaleFactor,
          ); // Draw the scaled image
          ctx!.restore();
        });
      }
      requestAnimationFrame(animate);
    }

    // Initialize with a requestAnimationFrame to ensure proper timing
    requestAnimationFrame((time) => {
      lastFrameTime = time;
      requestAnimationFrame(animate);
    });
  }

  // Add a temporary SVG at the clicked position
  function addSvgAt(x: number, y: number) {
    const randomSvg = svgImages[Math.floor(Math.random() * numSvgs)];
    // Sparse until every image has loaded, so an early click can miss.
    if (!randomSvg) return;

    const newSvg: Sprite = {
      x: x - (randomSvg.width * svgScaleFactor) / 2,
      y: y - (randomSvg.height * svgScaleFactor) / 2,
      dx: (Math.random() > 0.5 ? 0.7 : -0.7) * SPEED, // Fixed magnitude, random direction
      dy: (Math.random() > 0.5 ? 0.7 : -0.7) * SPEED,
      angle: Math.random() * Math.PI * 2,
      dAngle: (Math.random() - 0.5) * ROTATION_SPEED,
      img: randomSvg,
      permanent: false, // Mark this SVG as temporary
    };
    svgs.push(newSvg);

    setTimeout(() => {
      const index = svgs.indexOf(newSvg);
      if (index !== -1) svgs.splice(index, 1);
    }, ADDED_LIFETIME_MS);
  }

  window.addEventListener("resize", resizeCanvas); // scale SVGs when resize window
  resizeCanvas();

  canvas.addEventListener("click", (e) => {
    const rect = canvas.getBoundingClientRect();
    addSvgAt(e.clientX - rect.left, e.clientY - rect.top);
  });

  // Load the SVGs; the animation starts once they're all in.
  SVG_FILES.forEach((fileName, index) => {
    const img = new Image();
    img.src = `/media/banner-svg/${fileName}`;
    img.onload = () => {
      svgImages[index] = img;
      if (svgImages.filter(Boolean).length === numSvgs) startAnimation();
    };
  });
}
