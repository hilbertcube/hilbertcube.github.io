function canvas() {
  const canvas = document.getElementById('bannerCanvas');
  const ctx = canvas.getContext('2d');

  const svgFileNames = [
      'LDM.svg', 
      'stokes.svg',
      'laplace.svg',
      'discrete-fourier.svg',
      'cauchy.svg',
      'black-body.svg',
      'navier.svg',
      'information.svg',
      'moore.svg',
      'filter.svg'
  ];
  
  // Note: color = stroke
  // L_{\text{LDM}} = \mathbb{E}_{t, z_0, \varepsilon, y}\left[\lVert \varepsilon - \varepsilon_0(z_t, t, \tau_\theta(y)) \rVert^2\right]
  
  
  const svgUrls = svgFileNames.map(fileName => `${ROOT}/public/banner-svg/${fileName}`);
  const svgImages = [];
  const numSvgs = svgUrls.length;

  // Configuration
  const speed = 1.5; // Speed of the SVGs
  const rotationSpeed = 0.01; // Speed of rotation (radians per frame)
  let svgScaleFactor = 1.6; // Initial scale factor
  const ROTATE = false;
  
  let svgs = []; // Keep track of all SVGs including original and added
  const addedSvgs = []; // Track added SVGs by clicks

  // Load SVG images
  svgUrls.forEach((url, index) => {
      const img = new Image();
      img.src = url;
      img.onload = () => {
          svgImages[index] = img;
          if (svgImages.filter(img => img).length === numSvgs) {
              startAnimation();
          }
      };
  });

  function startAnimation() {
      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;
  
      // Create initial positions with FIXED speed values
      svgs = svgImages.map(img => ({
          x: Math.random() * (canvasWidth - img.width * svgScaleFactor),
          y: Math.random() * (canvasHeight - img.height * svgScaleFactor),
          dx: (Math.random() > 0.5 ? 1 : -1) * speed, // Fixed speed, just random direction
          dy: (Math.random() > 0.5 ? 1 : -1) * speed, // Fixed speed, just random direction
          angle: Math.random() * Math.PI * 2, // Initial random angle
          dAngle: (Math.random() - 0.5) * rotationSpeed, // Random rotation speed
          img,
          permanent: true // Mark original SVGs as permanent
      }));
  
      const desiredFPS = 40; // Default is 60
      const interval = 1000 / desiredFPS; // Time per frame in milliseconds
      let lastTime = 0;
      let lastFrameTime = 0;
  
      function animate(currentTime) {
          // Calculate time delta to create smooth, consistent animation
          const deltaTime = currentTime - lastFrameTime;
          lastFrameTime = currentTime;
          
          // First frame special case - don't use huge deltaTime
          if (deltaTime > 100 || deltaTime === currentTime) {
              requestAnimationFrame(animate);
              return;
          }
          
          // Normalize movement to expected frame rate
          const timeRatio = deltaTime / (1000 / desiredFPS);

          if (currentTime - lastTime >= interval) {
              lastTime = currentTime;

              // Clear the entire canvas to prevent trailing
              ctx.clearRect(0, 0, canvas.width, canvas.height);

              // Process all SVGs to check for out-of-bounds ones
              for (let i = svgs.length - 1; i >= 0; i--) {
                  const svg = svgs[i];
                  
                  // Check if the SVG is out of bounds
                  const isOutOfBounds =
                      svg.x + svg.img.width * svgScaleFactor < 0 ||
                      svg.x > canvas.width ||
                      svg.y + svg.img.height * svgScaleFactor < 0 ||
                      svg.y > canvas.height;

                  if (isOutOfBounds) {
                      // Remove the out-of-frame SVG
                      svgs.splice(i, 1);

                      // Re-add the SVG after a delay at a random position within the canvas
                      setTimeout(() => {
                          svg.x = Math.random() * (canvasWidth - svg.img.width * svgScaleFactor);
                          svg.y = Math.random() * (canvasHeight - svg.img.height * svgScaleFactor);
                          svgs.push(svg); // Re-add the SVG to the array
                      }, 100);
                  }
              }

              // Move and render the remaining SVGs
              svgs.forEach((svg) => {
                  // Move SVG with consistent speed regardless of frame rate
                  svg.x += svg.dx * timeRatio;
                  svg.y += svg.dy * timeRatio;

                  // Bounce off the borders
                  if (svg.x < 0 || svg.x > canvas.width - svg.img.width * svgScaleFactor) svg.dx *= -1;
                  if (svg.y < 0 || svg.y > canvas.height - svg.img.height * svgScaleFactor) svg.dy *= -1;

                  // Save the context and apply the transformation
                  ctx.save();
                  ctx.translate(svg.x + (svg.img.width * svgScaleFactor) / 2, svg.y + (svg.img.height * svgScaleFactor) / 2); // Move to the center of the image
                  if (ROTATE) {
                      // Rotate SVG with time adjustment
                      svg.angle += svg.dAngle * timeRatio;
                      ctx.rotate(svg.angle); // Rotate around the center
                  }
                  ctx.drawImage(
                      svg.img,
                      -(svg.img.width * svgScaleFactor) / 2, 
                      -(svg.img.height * svgScaleFactor) / 2, 
                      svg.img.width * svgScaleFactor, 
                      svg.img.height * svgScaleFactor
                  ); // Draw the scaled image
                  ctx.restore();
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
  
  // Resize the canvas to fit its container
  function fitToContainer(canvas) {
      const parent = canvas.parentElement;
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
  }

  function resizeCanvas() {
      fitToContainer(canvas);

      if(window.innerWidth < 580){
          svgScaleFactor = 0.6;
      }
      else if(window.innerWidth > 1800){
          svgScaleFactor = 1.2;
      }
      else if(window.innerWidth > 2400){
          svgScaleFactor = 2.5;
      }
      else{
          svgScaleFactor = 1;
      }
  }

  // Attach the resize event
  window.addEventListener('resize', resizeCanvas); // scale SVGs when resize window
  resizeCanvas();

  // Function to add a new SVG at the clicked position
  function addSvgAt(x, y) {
      const randomSvg = svgImages[Math.floor(Math.random() * numSvgs)];
      const newSvg = {
          x: x - (randomSvg.width * svgScaleFactor) / 2,
          y: y - (randomSvg.height * svgScaleFactor) / 2,
          dx: (Math.random() > 0.5 ? 0.7 : -0.7) * speed, // Fixed magnitude, random direction
          dy: (Math.random() > 0.5 ? 0.7 : -0.7) * speed, // Fixed magnitude, random direction
          angle: Math.random() * Math.PI * 2,
          dAngle: (Math.random() - 0.5) * rotationSpeed,
          img: randomSvg,
          permanent: false // Mark this SVG as temporary
      };
      svgs.push(newSvg);
      addedSvgs.push(newSvg);

      // Set a timer to remove the SVG after 5 seconds
      setTimeout(() => {
          const index = svgs.indexOf(newSvg);
          if (index !== -1) {
              svgs.splice(index, 1); // Remove the SVG from the main array
          }
      }, 5000);
  }

  // Attach the click event to the canvas
  canvas.addEventListener('click', (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      addSvgAt(x, y);
  });

  return {
      resizeCanvas: resizeCanvas
  };
}
canvas();