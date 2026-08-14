// Site-wide behaviour that has no single owning component. Everything tied to a
// specific component now lives in that component's own <script>: see
// src/components/site/TopBar.astro (+ src/components/site/topbar/*) for the
// nav, dark mode, settings and search; ShareButton, HighlightsAndAttribute,
// CopyButton and TabBox for the rest.

// OPEN FULL IMG
document.addEventListener("DOMContentLoaded", function () {
  const allImages = document.querySelectorAll("img:not(#logoImage):not(#home-banner img):not(.no-lightbox):not(.recommend-img img):not(.front-img)");

  allImages.forEach(function (img, index) {
    img.style.cursor = "pointer";
    img.addEventListener("click", function () {
      openImageViewer(index);
    });
  });

  function openImageViewer(currentIndex) {
    // Create overlay
    const overlay = document.createElement("div");
    overlay.style.position = "fixed";
    overlay.style.top = 0;
    overlay.style.left = 0;
    overlay.style.width = "100%";
    overlay.style.height = "100%";
    overlay.style.backgroundColor = "rgba(0, 0, 0)";
    overlay.style.display = "flex";
    overlay.style.alignItems = "center";
    overlay.style.justifyContent = "center";
    overlay.style.zIndex = 9999;
    overlay.style.overscrollBehavior = "none"; // Prevent pull-to-refresh and bounce effects

    // Prevent scrolling when overlay is open and lock to current position
    const scrollY = window.scrollY;
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";

    // Create wrapper that contains everything
    const viewerWrapper = document.createElement("div");
    viewerWrapper.style.position = "absolute";
    viewerWrapper.style.top = "50%";
    viewerWrapper.style.left = "50%";
    viewerWrapper.style.transform = "translate(-50%, -50%)";
    viewerWrapper.style.display = "flex";
    viewerWrapper.style.alignItems = "center";
    viewerWrapper.style.justifyContent = "center";

    // Create image container
    const imgContainer = document.createElement("div");
    imgContainer.style.position = "relative";
    imgContainer.style.display = "inline-block";

    // Create image
    const fullscreenImg = document.createElement("img");
    fullscreenImg.src = allImages[currentIndex].src;
    fullscreenImg.style.maxWidth = "90vw"; // Reduced to make room for buttons
    fullscreenImg.style.maxHeight = "90vh";
    fullscreenImg.style.boxShadow = "0 0 20px black";
    fullscreenImg.style.display = "block";

    // Create close button
    const closeButton = document.createElement("div");
    closeButton.textContent = "✕";
    closeButton.style.position = "absolute";
    closeButton.style.top = "20px";
    closeButton.style.right = "20px";
    closeButton.style.fontSize = "24px";
    closeButton.style.color = "white";
    closeButton.style.backgroundColor = "rgba(0,0,0,0.5)";
    closeButton.style.borderRadius = "50%";
    closeButton.style.width = "32px";
    closeButton.style.height = "32px";
    closeButton.style.display = "flex";
    closeButton.style.alignItems = "center";
    closeButton.style.justifyContent = "center";
    closeButton.style.cursor = "pointer";
    closeButton.style.userSelect = "none";
    closeButton.style.pointerEvents = "auto";

    // Create navigation buttons container
    const navContainer = document.createElement("div");
    navContainer.style.position = "absolute";
    navContainer.style.top = "0";
    navContainer.style.left = "0";
    navContainer.style.width = "100%";
    navContainer.style.height = "100%";
    navContainer.style.pointerEvents = "none"; // Allow clicks to pass through to underlying elements
    navContainer.style.zIndex = "10000";

    // Buttons settings
    const radius = "35px";
    const arrowFontSize = "20px";

    // Create left navigation button - positioned absolutely within the overlay
    const leftButton = document.createElement("div");
    leftButton.textContent = "❮";
    leftButton.style.position = "absolute";
    leftButton.style.top = "50%";
    leftButton.style.left = "20px"; // Position from the edge of overlay
    leftButton.style.transform = "translateY(-50%)";
    leftButton.style.fontSize = arrowFontSize;
    leftButton.style.color = "white";
    leftButton.style.backgroundColor = "rgba(0,0,0,0.5)";
    leftButton.style.borderRadius = "50%";
    leftButton.style.width = radius;
    leftButton.style.height = radius;
    leftButton.style.display = "flex";
    leftButton.style.alignItems = "center";
    leftButton.style.justifyContent = "center";
    leftButton.style.cursor = "pointer";
    leftButton.style.userSelect = "none";
    leftButton.style.pointerEvents = "auto"; // Make this element clickable

    // Create right navigation button - positioned absolutely within the overlay
    const rightButton = document.createElement("div");
    rightButton.textContent = "❯";
    rightButton.style.position = "absolute";
    rightButton.style.top = "50%";
    rightButton.style.right = "20px"; // Position from the edge of overlay
    rightButton.style.transform = "translateY(-50%)";
    rightButton.style.fontSize = arrowFontSize;
    rightButton.style.color = "white";
    rightButton.style.backgroundColor = "rgba(0,0,0,0.5)";
    rightButton.style.borderRadius = "50%";
    rightButton.style.width = radius;
    rightButton.style.height = radius;
    rightButton.style.display = "flex";
    rightButton.style.alignItems = "center";
    rightButton.style.justifyContent = "center";
    rightButton.style.cursor = "pointer";
    rightButton.style.userSelect = "none";
    rightButton.style.pointerEvents = "auto"; // Make this element clickable

    // Image counter display
    const counterDisplay = document.createElement("div");
    counterDisplay.textContent = `${currentIndex + 1} / ${allImages.length}`;
    counterDisplay.style.position = "absolute";
    counterDisplay.style.bottom = "20px";
    counterDisplay.style.left = "50%";
    counterDisplay.style.transform = "translateX(-50%)";
    counterDisplay.style.color = "white";
    counterDisplay.style.backgroundColor = "rgba(0,0,0,0.5)";
    counterDisplay.style.padding = "8px 15px";
    counterDisplay.style.borderRadius = "20px";
    counterDisplay.style.fontSize = "16px";
    counterDisplay.style.pointerEvents = "auto";
    counterDisplay.style.fontFamily = "Jura";

    // Assemble elements
    imgContainer.appendChild(fullscreenImg);
    viewerWrapper.appendChild(imgContainer);

    // Add navigation buttons to the nav container
    navContainer.appendChild(leftButton);
    navContainer.appendChild(rightButton);
    navContainer.appendChild(counterDisplay);
    navContainer.appendChild(closeButton);

    // Add all elements to the overlay
    overlay.appendChild(viewerWrapper);
    overlay.appendChild(navContainer);
    document.body.appendChild(overlay);

    // Close logic
    function closeOverlay() {
      document.body.removeChild(overlay);
      document.removeEventListener("keydown", keyListener);

      // Restore scrolling and position
      const scrollY = parseInt(document.body.style.top || '0');
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      window.scrollTo(0, Math.abs(scrollY));
    }

    closeButton.addEventListener("click", closeOverlay);

    // Navigation logic
    function showImage(index) {
      // Handle wrapping around the array
      if (index < 0) index = allImages.length - 1;
      if (index >= allImages.length) index = 0;

      currentIndex = index;
      fullscreenImg.src = allImages[currentIndex].src;
      counterDisplay.textContent = `${currentIndex + 1} / ${allImages.length}`;
    }

    leftButton.addEventListener("click", function (e) {
      e.stopPropagation();
      showImage(currentIndex - 1);
    });

    rightButton.addEventListener("click", function (e) {
      e.stopPropagation();
      showImage(currentIndex + 1);
    });

    // Keyboard navigation
    function keyListener(e) {
      if (e.key === "Escape") {
        closeOverlay();
      } else if (e.key === "ArrowLeft") {
        showImage(currentIndex - 1);
      } else if (e.key === "ArrowRight") {
        showImage(currentIndex + 1);
      }
    }

    document.addEventListener("keydown", keyListener);
  }
});

// OPEN URL IN NEW WINDOWS
document.querySelectorAll(".url").forEach(function (element) {
  element.onclick = function () {
    window.open(this.href);
    return false;
  };
  element.onkeypress = function () {
    window.open(this.href);
    return false;
  };
});

// SMOOTH SCROLL FOR IN-PAGE ANCHORS
document.addEventListener("DOMContentLoaded", function () {
  document.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", function (event) {
      if (this.hash !== "") {
        event.preventDefault();

        const target = document.getElementById(this.hash.substring(1));
        if (!target) return;

        const navbarOffset = 120;
        const targetOffset = target.offsetTop - navbarOffset;

        window.scrollTo({
          top: targetOffset,
          behavior: "smooth"
        });
      }
    });
  });
});
