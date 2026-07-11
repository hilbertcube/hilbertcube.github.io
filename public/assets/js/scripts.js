MathJax = {
  tex: {
    tags: "ams",
    inlineMath: [
      ["$", "$"],
      ["\\(", "\\)"],
    ],
  },
  svg: { fontCache: "global", scale: 1.0 },
  chtml: {
    scale: 1.0,
  },
};

// // OPEN FULL IMG
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

// SIDE NAV
function toggleNav() {
  var navbar = document.getElementById("navbar");
  var body = document.body;

  if (navbar.classList.contains("open")) {
    navbar.classList.remove("open");
    navbar.classList.add("closed");
    body.classList.remove("nav-open");
    body.classList.add("nav-closed");
  } else {
    navbar.classList.remove("closed");
    navbar.classList.add("open");
    body.classList.remove("nav-closed");
    body.classList.add("nav-open");
  }
}

// FUNCTION FOR CLOSING SIDE NAV
// if window width is less than 1200px, close the side nav
function checkWidthAndToggle() {
  const body = document.body;
  const navbar = document.querySelector(".navbar");

  if (window.innerWidth < 1200) {
    body.classList.remove("nav-open");
    body.classList.add("nav-closed");
    navbar.classList.remove("open");
    navbar.classList.add("closed");
  } else {
    body.classList.add("nav-open");
    body.classList.remove("nav-closed");
    navbar.classList.add("open");
    navbar.classList.remove("closed");
  }

  // Enable transitions after the initial state is set (prevents flash)
  if (!navbar.classList.contains("transitions-ready")) {
    // Use requestAnimationFrame to ensure classes are painted first
    requestAnimationFrame(() => {
      navbar.classList.add("transitions-ready");
      body.classList.add("transitions-ready");
    });
  }
}
checkWidthAndToggle();
window.addEventListener("resize", checkWidthAndToggle);

// COPY BUTTON
function copyButton() {
  const copyButtons = document.querySelectorAll(".copy-btn");
  const codeBlocks = document.querySelectorAll(".code-container code");

  copyButtons.forEach((button, index) => {
    button.addEventListener("click", function (event) {
      event.preventDefault(); // Prevent default action for better control
      const code = codeBlocks[index];

      if (code && code.innerText.trim() !== "") {
        // Fallback to use a temporary textarea
        const textarea = document.createElement("textarea");
        textarea.value = code.innerText;
        document.body.appendChild(textarea);
        textarea.select();
        try {
          document.execCommand("copy");
          button.textContent = "Copied!";
        } catch (e) {
          button.textContent = "Failed to copy";
        }
        document.body.removeChild(textarea);

        setTimeout(function () {
          button.textContent = "Copy";
        }, 1000);
      } else {
        button.textContent = "No text to copy";
      }
    });
  });
}
copyButton();



// MOBILE HOVER BEHAVIOR
function mobileHover(arr) {
  // Hover effect on mobile
  //const classes = ['.article', '.materials-right img'];
  arr.forEach((className) => {
    const elements = document.querySelectorAll(className);

    elements.forEach((element) => {
      // Add touchstart event listener
      element.addEventListener("touchstart", () => {
        element.classList.add("touch-hover-effect");
      });

      element.addEventListener("touchend", () => {
        // Remove touch effect
        element.classList.remove("touch-hover-effect");
      });
    });
  });
}

mobileHover([".materials-right img", ".hyperlink", ".post"]);

// CHANGE TAB FUNCTION
function changeTab(evt, nav_item_name, switch_target) {
  // Hide all elements with the class switch_target
  var x = document.getElementsByClassName(switch_target);
  for (var i = 0; i < x.length; i++) {
    x[i].style.display = "none";
  }

  // Show the targeted tab content
  document.getElementById(nav_item_name).style.display = "block";

  // Remove the tab-effect class from all tab buttons
  var tablinks = document.getElementsByClassName("tab-button");
  for (var i = 0; i < tablinks.length; i++) {
    tablinks[i].className = tablinks[i].className.replace(" tab-effect", "");
  }

  // Add the tab-effect class to the clicked tab button
  evt.currentTarget.className += " tab-effect";
}

// Highlights are now rendered at build time by HighlightsAndAttribute.astro.
// setupDropdownEffect() is called directly from DOMContentLoaded.

// SUGGESTION DROPDOWN BEHAVIOR
function setupDropdownEffect() {
  const listItems = document.querySelectorAll(".home-li");

  listItems.forEach((li) => {
    const img = li.querySelector("img");
    const li_a = li.querySelector("a");

    // Set initial state for mobile
    let isExpanded = img.style.maxHeight !== "0px" && img.style.maxHeight;

    // Ensure pointer events are set initially
    li_a.style.pointerEvents = isExpanded ? "auto" : "none";

    li.addEventListener("click", () => {
      isExpanded = img.style.maxHeight !== "0px" && img.style.maxHeight;
      img.style.maxHeight = isExpanded ? "0" : img.naturalHeight + "px";
      img.style.opacity = isExpanded ? "0" : "1";
      li_a.style.pointerEvents = isExpanded ? "none" : "auto"; // Toggle pointer events

      // Toggle the class to show/hide the pseudo-element
      if (isExpanded) {
        li_a.classList.remove("show-read-more");
      } else {
        li_a.classList.add("show-read-more");
      }
    });

    // Ensure initial state
    img.style.maxHeight = img.style.maxHeight || "0";
    img.style.opacity = img.style.opacity || "0";
  });
}

/////////////////////////////////////
//            GLOBAL               //
/////////////////////////////////////


// SHARE BUTTON
function toggleShareOptions(event) {
  event.preventDefault();
  const shareOptionsContainer = document.getElementById("shareOptions");
  const shareOptions = shareOptionsContainer.querySelectorAll(".share-option");

  // Toggle the visibility of the share options
  if (
    shareOptionsContainer.style.display === "none" ||
    shareOptionsContainer.style.display === ""
  ) {
    shareOptionsContainer.style.display = "block";

    // Show each option with a delay
    shareOptions.forEach((option, index) => {
      option.style.opacity = "0";
      option.style.display = "block";
      setTimeout(() => {
        option.style.opacity = "1";
        option.style.transition = "opacity .5s ease";
      }, index * 100);
    });
  } else {
    // Hide all options at once
    shareOptions.forEach((option) => {
      option.style.display = "none";
    });
    shareOptionsContainer.style.display = "none";
  }
}

// SHARE OPTIONS
function sharePage(event, platform) {
  event.preventDefault();
  const pageUrl = window.location.href; // Get the current page URL
  let shareUrl = "";

  switch (platform) {
    case "facebook":
      shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
        pageUrl
      )}`;
      break;
    case "twitter":
      shareUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(
        pageUrl
      )}&text=Check%20this%20out!`;
      break;
    case "whatsapp":
      shareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(
        pageUrl
      )}`;
      break;
    case "reddit":
      shareUrl = `https://www.reddit.com/submit?url=${encodeURIComponent(
        pageUrl
      )}&title=Interesting%20page`;
      break;
    case "hackernews":
      shareUrl = `https://news.ycombinator.com/submitlink?u=${encodeURIComponent(
        pageUrl
      )}&t=${encodeURIComponent(document.title)}`;
      break;
    case "telegram":
      shareUrl = `https://t.me/share/url?url=${encodeURIComponent(
        pageUrl
      )}&text=${encodeURIComponent(document.title)}`;
      break;
    default:
      return;
  }

  window.open(shareUrl, "_blank"); // Open the share link in a new tab
}

function BodyDarkMode() {
  const modeToggle = document.getElementById("modeToggle");
  const toggleIcon = document.getElementById("toggleIcon");
  const root = document.documentElement;

  // Check for saved mode in localStorage
  let darkMode = localStorage.getItem("mode") === "dark";

  function updateMode() {
    if (darkMode) {
      root.classList.add("dark-mode");
      toggleIcon.innerHTML = window.__iconSvg.sun; // Change to sun icon
    } else {
      root.classList.remove("dark-mode");
      toggleIcon.innerHTML = window.__iconSvg.moon; // Change to moon icon
    }
    localStorage.setItem("mode", darkMode ? "dark" : "light");
  }

  if (modeToggle) {
    modeToggle.addEventListener("click", () => {
      darkMode = !darkMode;
      updateMode();
    });
  }

  updateMode(); // Initialize mode on page load
}

function CodeDarkMode(lightThemeHref, darkThemeHref) {
  let lightThemeLink = document.getElementById("light-theme-link");
  let darkThemeLink = document.getElementById("dark-theme-link");
  const modeToggle = document.getElementById("modeToggle");
  const toggleIcon = document.getElementById("toggleIcon");

  // Create light theme link if it doesn't exist
  if (!lightThemeLink) {
    lightThemeLink = document.createElement("link");
    lightThemeLink.id = "light-theme-link";
    lightThemeLink.rel = "stylesheet";
    document.head.appendChild(lightThemeLink);
  }

  // Create dark theme link if it doesn't exist
  if (!darkThemeLink) {
    darkThemeLink = document.createElement("link");
    darkThemeLink.id = "dark-theme-link";
    darkThemeLink.rel = "stylesheet";
    document.head.appendChild(darkThemeLink);
  }

  // Check for saved mode in local storage
  let darkMode = localStorage.getItem("mode") === "dark";

  function updateTheme() {
    if (darkMode) {
      darkThemeLink.href = darkThemeHref; // Load dark theme
      lightThemeLink.disabled = true; // Disable light theme
      document.head.appendChild(darkThemeLink);
      document.documentElement.classList.add("dark-mode");
      toggleIcon.innerHTML = window.__iconSvg.sun; // Change to sun icon
    } else {
      const savedLightTheme =
        localStorage.getItem("lightTheme") || lightThemeHref;
      lightThemeLink.href = savedLightTheme;
      lightThemeLink.disabled = false;
      if (document.head.contains(darkThemeLink)) {
        document.head.removeChild(darkThemeLink); // Remove dark theme
      }
      document.documentElement.classList.remove("dark-mode");
      toggleIcon.innerHTML = window.__iconSvg.moon; // Change to moon icon
    }
    localStorage.setItem("mode", darkMode ? "dark" : "light");
  }

  if (modeToggle) {
    modeToggle.addEventListener("click", () => {
      darkMode = !darkMode;
      updateTheme();
    });
  }

  updateTheme(); // Initialize mode on page load
}

function codeThemeSwitch(id, storageKey, defaultIndex) {
  const selectElement = document.getElementById(id);
  if (!selectElement) {
    console.error(`Element with ID ${id} not found`);
    return null;
  }
  const defaultChoice = selectElement.options[defaultIndex].value;

  // Load the saved value from localStorage or use the default value
  const savedValue = localStorage.getItem(storageKey) || defaultChoice;

  // Set the select dropdown to the saved or default value
  selectElement.value = savedValue;

  selectElement.addEventListener("change", function () {
    const selectedValue = selectElement.value;

    // Save the selected value to localStorage
    localStorage.setItem(storageKey, selectedValue);

    // Broadcast the change to other tabs
    window.localStorage.setItem(`${storageKey}Changed`, Date.now());

    // Reload the page to apply the new theme
    window.location.reload();
  });

  // Listen for changes in localStorage to update the value in real-time
  window.addEventListener("storage", function (event) {
    if (event.key === `${storageKey}Changed`) {
      window.location.reload();
    }
  });

  return savedValue;
}

document.addEventListener("keydown", function (event) {
  if (event.key === "/") {
    event.preventDefault(); // Prevent the default action of '/'
    const searchBar = document.getElementById("searchBar");
    if (searchBar) {
      searchBar.focus(); // Focus the search bar
    } else {
      console.error("Search bar not found");
    }
  }
});


function SearchBar() {
  const searchBars = document.querySelectorAll("#searchBar, #searchBarMobile");
  const dropdown = document.getElementById("autocomplete-dropdown");
  const maxItems = 7;
  let currentFocus = -1;

  if (!searchBars.length || !dropdown) {
    console.log("Search bar or dropdown element not found");
    return;
  }

  const HL_OPEN =
    '<span style="color: var(--highlight-dropdown-color); text-decoration: underline;">';
  const HL_CLOSE = "</span>";

  function escapeRegExp(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  // Highlight every case-insensitive occurrence of `query` in a PLAIN-TEXT string.
  function highlight(text, query) {
    if (!query) return text;
    return text.replace(
      new RegExp(escapeRegExp(query), "gi"),
      (match) => `${HL_OPEN}${match}${HL_CLOSE}`,
    );
  }

  // Map a result URL to the Article / Post / Resource label the UI shows.
  function typeFromUrl(url) {
    if (url.includes("/articles/")) return "Article";
    if (url.includes("/posts/")) return "Post";
    return "Resource";
  }

  // Lazily pick a search engine: Pagefind (full-text) when its index is present
  // in the built site, otherwise fall back to the articles.json metadata list so
  // `astro dev` and offline still search titles/topics/descriptions.
  let enginePromise = null;
  function getEngine() {
    return (enginePromise ||= loadEngine());
  }
  async function loadEngine() {
    try {
      // Native dynamic import of the statically-hosted Pagefind bundle.
      const pagefind = await import("/pagefind/pagefind.js");
      await pagefind.init();
      return { kind: "pagefind", pagefind };
    } catch (err) {
      console.warn("Pagefind unavailable, falling back to articles.json:", err);
      try {
        const res = await fetch("/assets/json/articles.json");
        if (!res.ok) throw new Error("Network response error: " + res.statusText);
        const data = await res.json();
        const suggestions = [
          ...(data.articles || []),
          ...(data.others || []),
          ...(data.posts || []),
        ];
        return { kind: "fallback", suggestions };
      } catch (err2) {
        console.error("Error loading search fallback:", err2);
        return { kind: "none" };
      }
    }
  }

  // Normalised item shape used by the renderer:
  //   { title, link, type, topics?, description?, descriptionHtml?, date? }
  // `descriptionHtml` is pre-highlighted HTML (Pagefind excerpt); `description`
  // is plain text that the renderer highlights against the query.
  async function search(query) {
    const engine = await getEngine();

    if (engine.kind === "pagefind") {
      // Pagefind's debouncedSearch resolves to null when superseded by a newer call.
      const result = await engine.pagefind.debouncedSearch(query, {}, 180);
      if (!result) return null;
      const total = result.results.length;
      const datas = await Promise.all(
        result.results.slice(0, maxItems).map((r) => r.data()),
      );
      const items = datas.map((d) => ({
        title: (d.meta && d.meta.title) || d.url,
        link: d.url,
        type: typeFromUrl(d.url),
        // Excerpt already contains <mark>…</mark>; recolour to match the UI.
        descriptionHtml: (d.excerpt || "")
          .replace(/<mark>/g, HL_OPEN)
          .replace(/<\/mark>/g, HL_CLOSE),
      }));
      return { total, items };
    }

    if (engine.kind === "fallback") {
      const q = query.toLowerCase();
      const filtered = engine.suggestions.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          (item.topics && item.topics.some((t) => t.toLowerCase().includes(q))) ||
          (item.description && item.description.toLowerCase().includes(q)) ||
          (item.date && item.date.toLowerCase().includes(q)),
      );
      const items = filtered.slice(0, maxItems).map((item) => ({
        title: item.title,
        link: item.link,
        type: item.hasOwnProperty("id")
          ? "Article"
          : item.hasOwnProperty("pid")
            ? "Post"
            : "Resource",
        topics: item.topics,
        description: item.description,
        date: item.date,
      }));
      return { total: filtered.length, items };
    }

    return { total: 0, items: [] };
  }

  function renderResults(query, total, items, searchBar) {
    dropdown.innerHTML = "";
    currentFocus = -1;

    if (!items.length) {
      dropdown.style.display = "none";
      return;
    }

    const countDiv = document.createElement("div");
    countDiv.className = "results-count";
    countDiv.textContent = `Displaying ${Math.min(maxItems, total)} out of ${total} results`;
    countDiv.style.padding = "8px 10px";
    countDiv.style.color = "var(--text-color, #666)";
    countDiv.style.fontSize = "0.9em";
    countDiv.style.borderBottom = "1px solid var(--border-color, var(--search-item-border-color))";
    dropdown.appendChild(countDiv);

    items.forEach((item) => {
      const container = document.createElement("div");
      container.className = "autocomplete-item-container";
      container.style.padding = "10px";
      container.style.borderBottom = "1px solid var(--border-color, var(--search-item-border-color))";

      const titleDiv = document.createElement("div");
      titleDiv.className = "autocomplete-item-title";
      titleDiv.style.fontWeight = "bold";
      titleDiv.style.marginBottom = "3px";
      titleDiv.innerHTML = highlight(item.title, query);
      container.appendChild(titleDiv);

      if (item.topics && item.topics.length > 0) {
        const topicDiv = document.createElement("div");
        topicDiv.className = "autocomplete-item-topic";
        topicDiv.style.fontSize = "0.85em";
        topicDiv.style.marginBottom = "3px";
        topicDiv.innerHTML = `<strong>Tags:</strong> ${highlight(item.topics.join(", "), query)}`;
        container.appendChild(topicDiv);
      }

      if (item.descriptionHtml || item.description) {
        const descDiv = document.createElement("div");
        descDiv.className = "autocomplete-item-description";
        descDiv.style.fontSize = "0.85em";
        descDiv.style.marginBottom = "3px";
        descDiv.innerHTML = item.descriptionHtml
          ? item.descriptionHtml
          : highlight(item.description, query);
        container.appendChild(descDiv);
      }

      if (item.date) {
        const dateDiv = document.createElement("div");
        dateDiv.className = "autocomplete-item-date";
        dateDiv.style.fontSize = "0.85em";
        dateDiv.style.fontStyle = "italic";
        dateDiv.style.color = "var(--muted-text-color, #888)";
        dateDiv.innerHTML = highlight(item.date, query);
        container.appendChild(dateDiv);
      }

      const sourceDiv = document.createElement("div");
      sourceDiv.className = "autocomplete-item-source";
      sourceDiv.style.fontSize = "0.75em";
      sourceDiv.style.marginTop = "3px";
      sourceDiv.textContent = item.type;
      container.appendChild(sourceDiv);

      container.addEventListener("click", function () {
        window.open(item.link, "_blank");
        searchBar.value = "";
        dropdown.innerHTML = "";
        dropdown.style.display = "none";
      });

      dropdown.appendChild(container);
    });

    dropdown.style.display = "block";
  }

  searchBars.forEach((searchBar) => {
    searchBar.addEventListener("input", async function () {
      const query = searchBar.value.trim();
      currentFocus = -1;

      if (!query) {
        dropdown.innerHTML = "";
        dropdown.style.display = "none";
        return;
      }

      const result = await search(query);
      // Null => superseded by a newer keystroke (Pagefind debounce).
      if (!result) return;
      // Guard against out-of-order async results: only render for the live query.
      if (searchBar.value.trim() !== query) return;

      renderResults(query, result.total, result.items, searchBar);
    });

    searchBar.addEventListener("keydown", function (event) {
      const items = dropdown.getElementsByClassName("autocomplete-item-container");

      if (event.key === "ArrowDown") {
        event.preventDefault();
        currentFocus++;
        if (currentFocus >= items.length) currentFocus = 0;
        addActive(items);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        currentFocus--;
        if (currentFocus < 0) currentFocus = items.length - 1;
        addActive(items);
      } else if (event.key === "Enter") {
        event.preventDefault();
        if (typeof collapseSearchBar === "function") {
          collapseSearchBar();
        }
        // Open the highlighted result, or the first one if none is highlighted.
        const target = items[currentFocus] || items[0];
        if (target) target.click();
      } else if (event.key === "Escape") {
        event.preventDefault();
        searchBar.value = "";
        dropdown.innerHTML = "";
        dropdown.style.display = "none";
        searchBar.blur();
        collapseSearchBar();
      }
    });

    function addActive(items) {
      if (!items) return false;
      removeActive(items);
      if (currentFocus >= items.length) currentFocus = 0;
      if (currentFocus < 0) currentFocus = items.length - 1;
      items[currentFocus].classList.add("autocomplete-active");
      items[currentFocus].style.backgroundColor = "var(--highlight-bg-color, #f5f5f5)";
    }

    function removeActive(items) {
      for (let item of items) {
        item.classList.remove("autocomplete-active");
        item.style.backgroundColor = "";
      }
    }
  });

  // Hide dropdown when clicking outside
  document.addEventListener("click", function (event) {
    const target = event.target;
    if (
      ![...searchBars].some((bar) => bar.contains(target)) &&
      !dropdown.contains(target)
    ) {
      searchBars.forEach((searchBar) => {
        searchBar.value = "";
      });
      dropdown.innerHTML = "";
      dropdown.style.display = "none";
    }
  });
}

function collapseSearchBar() {
  const searchBarContainer = document.getElementById("searchBarContainer");
  const leftSection = document.querySelector(".left"); // Get the .left section
  const overlay = document.getElementById("searchOverlay");
  const settingContainer = document.querySelector(".buttons-container");
  const toggleButton = document.querySelector(".toggle-btn-container");

  searchBarContainer.classList.remove("expanded");
  leftSection.classList.remove("hidden"); // Show the left section again
  overlay.style.display = "none"; // Hide overlay

  const iconBtn = document.getElementById("searchIconBtn");
  if (iconBtn) iconBtn.classList.remove("search-icon-hidden"); // Restore the search icon

  // Show these elements again when collapsing the search bar
  if (window.innerWidth <= 640) { // Mobile viewport check
    if (settingContainer) settingContainer.classList.remove("hidden");
    if (toggleButton) toggleButton.classList.remove("hidden");
  }
}

function extendSearchBar() {
  const searchBar = document.getElementById("searchBar");
  const searchBarMobile = document.getElementById("searchBarMobile");
  const searchBarContainer = document.getElementById("searchBarContainer");
  const overlay = document.getElementById("searchOverlay");
  const leftSection = document.querySelector(".left"); // Get the .left section
  const dropdown = document.getElementById("autocomplete-dropdown");
  const settingContainer = document.querySelector(".buttons-container");
  const toggleButton = document.querySelector(".toggle-btn-container");

  function expandSearchBar() {
    searchBarContainer.classList.add("expanded");
    leftSection.classList.add("hidden"); // Hide the left section (for all viewports)
    overlay.style.display = "block"; // Show overlay

    const iconBtn = document.getElementById("searchIconBtn");
    if (iconBtn) iconBtn.classList.add("search-icon-hidden"); // Fade out the search icon

    // Only hide these elements on mobile
    if (window.innerWidth <= 640) {
      if (settingContainer) settingContainer.classList.add("hidden");
      if (toggleButton) toggleButton.classList.add("hidden");
    }
  }

  // Tapping the mobile search icon reveals the search bar
  const searchIconBtn = document.getElementById("searchIconBtn");
  if (searchIconBtn) {
    searchIconBtn.addEventListener("click", function () {
      expandSearchBar();
      searchBarMobile.focus();
    });
  }

  // Listen for focus on both desktop and mobile search bars
  searchBar.addEventListener("focus", expandSearchBar);
  searchBarMobile.addEventListener("focus", expandSearchBar);
  searchBar.addEventListener("blur", function () {
    setTimeout(() => {
      collapseSearchBar(); // Collapse the search bar after a short delay
    }, 100);
  });

  searchBarMobile.addEventListener("blur", function () {
    setTimeout(() => {
      collapseSearchBar(); // Collapse the search bar after a short delay
    }, 100);
  });

  // Allow clicking on the overlay to close the search
  overlay.addEventListener("click", collapseSearchBar);

  // placeholder change
  searchBar.addEventListener("focus", function () {
    this.setAttribute("placeholder", "Use your arrow keys to navigate");
  });

  // Restore the original placeholder when the input loses focus
  searchBar.addEventListener("blur", function () {
    setTimeout(() => {
      this.setAttribute("placeholder", "Type / to search");
    }, 100);
  });

  // Enhanced Escape key handler for both search bars
  [searchBar, searchBarMobile].forEach((bar) => {
    bar.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        event.preventDefault();
        bar.value = ""; // Clear the search bar text
        dropdown.innerHTML = ""; // Clear dropdown content
        dropdown.style.display = "none"; // Hide dropdown
        bar.blur(); // Remove focus from the search bar
        collapseSearchBar(); // Collapse the search bar UI
      }
    });
  });

  // Handle window resize to adjust visibility appropriately
  window.addEventListener("resize", function () {
    if (!searchBarContainer.classList.contains("expanded")) return;

    // If expanded and viewport changes, update element visibility
    if (window.innerWidth <= 768) {
      if (searchOverlay) searchOverlay.classList.add("hidden");
      if (settingContainer) settingContainer.classList.add("hidden");
    } else {
      if (searchOverlay) searchOverlay.classList.remove("hidden");
      if (settingContainer) settingContainer.classList.remove("hidden");
    }
  });
}

function Switcher(target, id, selectors, defaultIndex) {
  const selectElement = document.getElementById(id);
  if (!selectElement) {
    console.error(`Element with ID ${id} not found`);
    return;
  }
  const defaultChoice = selectElement.options[defaultIndex].value;
  const targetSelectors = selectors;

  function applyChange(value) {
    targetSelectors.forEach((selector) => {
      document.querySelectorAll(selector).forEach((element) => {
        element.style[target] = value; // attribute before
      });
    });
  }

  // Load the saved value from localStorage or use the default value
  const savedValue = localStorage.getItem(target) || defaultChoice;
  applyChange(savedValue);

  // Set the select dropdown to the saved or default value
  selectElement.value = savedValue;

  selectElement.addEventListener("change", function () {
    const selectedValue = selectElement.value;
    applyChange(selectedValue);

    // Save the selected value to localStorage
    localStorage.setItem(target, selectedValue);

    // Broadcast the change to other tabs
    window.localStorage.setItem(`${target}Changed`, Date.now());
  });

  // Listen for changes in localStorage to update the value in real-time
  window.addEventListener("storage", function (event) {
    if (event.key === `${target}Changed`) {
      const newValue = localStorage.getItem(target);
      if (newValue) {
        applyChange(newValue);
        selectElement.value = newValue;
      }
    }
  });
}

function scrollIndicator() {
  var winScroll = document.body.scrollTop || document.documentElement.scrollTop;
  var height =
    document.documentElement.scrollHeight -
    document.documentElement.clientHeight;
  var scrolled = (winScroll / height) * 100;
  document.getElementById("myBar").style.width = scrolled + "%";
}


const font_size = [
  "p",
  ".material-description",
  ".theorem",
  ".solution",
  ".problem",
  ".content-grid"
];

// === Initialization ===
document.addEventListener("DOMContentLoaded", function () {
  // Add smooth scrolling to all links
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

  setupDropdownEffect();
  fetchCommit();
  window.onscroll = scrollIndicator;

  const initialLightTheme = codeThemeSwitch("light-theme-select", "lightTheme", 0);
  const initialDarkTheme = codeThemeSwitch("dark-theme-select", "darkTheme", 0);
  CodeDarkMode(initialLightTheme, initialDarkTheme);
  BodyDarkMode();
  extendSearchBar();

  Switcher("fontFamily", "font-select", [".content-grid"], 0);
  Switcher("fontSize", "font-size-select", font_size, 2);
  Switcher("display", "indicator-select", [".progress-container", ".progress-bar"], 0);

  SearchBar();
});

function fetchCommit() {
  // Fetch repository stats
  Promise.all([
    fetch('https://api.github.com/repos/hilbertcube/hilbertcube.github.io'),
    fetch('https://api.github.com/repos/hilbertcube/hilbertcube.github.io/commits?per_page=1'),
    fetch('/assets/json/latest_commit.json'),
    fetch('/assets/json/articles.json'),
    fetch('https://api.github.com/repos/hilbertcube/hilbertcube.github.io/git/trees/main?recursive=1')
  ])
    .then(async ([repoRes, commitsRes, localCommitRes, articlesRes, treeRes]) => {
      const repoData = await repoRes.json();
      const articlesData = await articlesRes.json();
      const treeData = await treeRes.json();
      const totalCommits = Math.round((commitsRes.headers.get('Link')
        ? parseInt(commitsRes.headers.get('Link').match(/page=(\d+)>; rel="last"/)?.[1] || '0')
        : 1) / 2);

      // Calculate lines of code by filtering out binary/image files
      const codeExtensions = ['.html', '.css', '.js', '.json', '.md', '.txt', '.py', '.sh', '.xml', '.yml', '.yaml'];
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.ico', '.bmp', '.pdf', '.woff', '.woff2', '.ttf', '.otf', '.eot'];

      const codeFiles = treeData.tree?.filter(file => {
        const hasCodeExt = codeExtensions.some(ext => file.path.toLowerCase().endsWith(ext));
        const hasImageExt = imageExtensions.some(ext => file.path.toLowerCase().endsWith(ext));
        return hasCodeExt && !hasImageExt && file.type === 'blob';
      }) || [];

      // Estimate lines: smaller multiplier since we're only counting actual code files
      // Average code file has ~50-100 lines, and average line is ~50 bytes
      const totalCodeSize = codeFiles.reduce((sum, file) => sum + (file.size || 0), 0);
      const estimatedLines = Math.round(totalCodeSize / 50); // ~50 bytes per line of code

      // Count articles and posts
      const articleCount = articlesData.articles?.length || 0;
      const postCount = articlesData.posts?.length || 0;

      // Calculate repository age
      const createdDate = new Date(repoData.created_at);
      const now = new Date();
      const ageInDays = Math.floor((now - createdDate) / (1000 * 60 * 60 * 24));
      const years = Math.floor(ageInDays / 365);
      const months = Math.floor((ageInDays % 365) / 30);
      const ageString = years > 0
        ? `${years} year${years > 1 ? 's' : ''}, ${months} month${months !== 1 ? 's' : ''}`
        : `${months} month${months !== 1 ? 's' : ''}`;

      // Format numbers with commas
      const formatNumber = (num) => num.toLocaleString('en-US');

      // Update repo stats
      const statsElement = document.getElementById('repo-stats');
      if (statsElement) {
        statsElement.textContent =
          `\nTotal Updates: ${formatNumber(totalCommits)}\n` +
          `Estimated Lines: ${formatNumber(estimatedLines)}\n` +
          `Articles: ${articleCount} | Posts: ${postCount}\n` +
          `Repository Age: ${ageString}`;
      }

      // Handle latest commit info
      return localCommitRes.json();
    })
    .then(commit => {
      const message = commit.commit.message;
      const utcDateStr = commit.commit.author.date;

      // Convert to California time with comma instead of 'at'
      const localDateObj = new Date(utcDateStr);
      const datePart = localDateObj.toLocaleDateString('en-US', {
        timeZone: 'America/Los_Angeles',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
      const timePart = localDateObj.toLocaleTimeString('en-US', {
        timeZone: 'America/Los_Angeles',
        hour: 'numeric',
        minute: '2-digit'
      });

      const commitEl = document.getElementById('commit-info');
      if (commitEl) {
        commitEl.textContent =
          `\nLast Updated: ${datePart}, ${timePart} (PST)\nCommit: ${message}`;
      }
    })
    .catch(error => {
      console.error('Error fetching data:', error);
      const statsElement = document.getElementById('repo-stats');
      if (statsElement) {
        statsElement.textContent = 'Unable to load stats';
      }
    });
}

// js minifier: https://www.toptal.com/developers/javascript-minifier