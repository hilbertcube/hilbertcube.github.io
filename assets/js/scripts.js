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

const ROOT = ""; // /neumanncondition

function LoadScript(scriptId, source) {
  const jsSrc = ROOT + source;
  const scriptElement = document.createElement("script");
  scriptElement.id = scriptId;
  scriptElement.src = jsSrc;
  document.head.appendChild(scriptElement);
}

// TAB ICON
function setFavicon() {
  const link = document.createElement("link");
  link.rel = "icon";
  link.href = ROOT + "/public/Images/Logo/favicon.png";
  link.type = "image/png";
  document.head.appendChild(link);
}
setFavicon();

// // OPEN FULL IMG
document.addEventListener("DOMContentLoaded", function () {
    const allImages = document.querySelectorAll("img");
    
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
      closeButton.style.top = "10px";
      closeButton.style.right = "10px";
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
      imgContainer.appendChild(closeButton);
      viewerWrapper.appendChild(imgContainer);
      
      // Add navigation buttons to the nav container
      navContainer.appendChild(leftButton);
      navContainer.appendChild(rightButton);
      navContainer.appendChild(counterDisplay);
      
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

      leftButton.addEventListener("click", function(e) {
        e.stopPropagation();
        showImage(currentIndex - 1);
      });

      rightButton.addEventListener("click", function(e) {
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

/// NAVIGATE TO IMAGE BASED ON ROOT
function navigateToImage(element) {
  const newUrl = ROOT + element.getAttribute("src");
  location.href = newUrl;
}

// SET IMAGE DYNAMICALLY
function setImage(imageId, source) {
  const imageSrc = ROOT + source;
  document.getElementById(imageId).src = imageSrc;
}


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
  const toggleBtn = document.querySelector(".toggle-btn");

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
}
checkWidthAndToggle();
window.addEventListener("resize", checkWidthAndToggle); // Event listener for window resize

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

// Close the dropdown if the user clicks outside of it
window.onclick = function (event) {
  condition =
    event.target.matches(".dropbtn") ||
    event.target.matches(".switch") ||
    event.target.matches(".slider") ||
    event.target.matches("#modeToggle");
  if (!condition) {
    var dropdowns = document.getElementsByClassName("dropdown-content");
    for (var i = 0; i < dropdowns.length; i++) {
      var openDropdown = dropdowns[i];
      if (openDropdown.classList.contains("show")) {
        openDropdown.classList.remove("show");
      }
    }
  }
};

// drop down menu
function applyDropdownDelays() {
  document.querySelectorAll(".dropdown-content").forEach((dropdown) => {
    dropdown.querySelectorAll("a").forEach((item, index) => {
      item.style.animationDelay = `${0.06 * index}s`; // Adjust delay increment as needed
    });
  });
}

function dropDown(dropdownId) {
  var dropdown = document.getElementById(dropdownId);
  dropdown.classList.toggle("show");
  applyDropdownDelays(); // Apply delays whenever dropdown is shown
}

// Ensure delays are set on page load
document.addEventListener("DOMContentLoaded", applyDropdownDelays);

// ARTICLES
const image_root = ROOT + "/public/Images/";

function article(NUM_ARTICLE, des, random_article) {
  // Cache for the articles data to avoid repeated fetches articles
  let articlesCache = null;
  
  // Check if we already have the data cached
  if (articlesCache) {
    processArticles(articlesCache);
  } else {
    fetch(ROOT + "/assets/json/articles.json")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to load articles: " + response.statusText);
        }
        return response.json();
      })
      .then((data) => {
        articlesCache = data.articles;
        processArticles(articlesCache);
      })
      .catch((error) => console.error("Error loading articles:", error));
  }

  function processArticles(articles) {
    // Filter out articles without IDs
    const validArticles = articles.filter(article => article.id);
    
    // Shuffle if needed
    if (random_article) shuffleArray(validArticles);
    
    // Display the articles
    displayArticles(validArticles.slice(0, NUM_ARTICLE));
  }

  function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  function displayArticles(articles) {
    const container = document.getElementById("rec-article-container");
    if (!container) {
      console.error("Article container not found");
      return;
    }
    
    container.innerHTML = ""; // Clear previous content
    
    // Create document fragment for better performance
    const fragment = document.createDocumentFragment();

    articles.forEach((article) => {
      const articleLink = document.createElement("a");
      articleLink.href = ROOT + article.link;
      articleLink.classList.add("article");
      // articleLink.target = "_blank";

      // Create image container
      const imageContainer = document.createElement("div");
      imageContainer.className = "article-image-container";

      // Create image with lazy loading
      const img = document.createElement("img");
      img.loading = "lazy"; // Add lazy loading
      img.src = image_root + article.image;
      img.alt = article.title;
      
      // Add error handling for images
      img.onerror = function() {
        this.src = image_root + "placeholder.png"; // Fallback image
        this.onerror = null; // Prevent infinite loop
      };
      
      imageContainer.appendChild(img);

      // Create text container
      const textContainer = document.createElement("div");
      textContainer.className = "article-text-container";

      const title = document.createElement("div");
      title.classList.add("article-name");
      title.textContent = article.title;
      textContainer.appendChild(title);

      // Only add description elements if des flag is true
      if (des) {
        const topic = document.createElement("div");
        topic.classList.add("article-topic");
        topic.textContent = "Tags: " + (article.topics ? article.topics.join(", ") : "N/A");
        textContainer.appendChild(topic);

        const description = document.createElement("div");
        description.classList.add("article-description");
        description.textContent = article.description;
        textContainer.appendChild(description);

        const date = document.createElement("div");
        date.classList.add("article-date");
        date.textContent = "Posted " + article.date;
        textContainer.appendChild(date);
      }

      // Append containers to the article link
      articleLink.appendChild(imageContainer);
      articleLink.appendChild(textContainer);

      // Add to fragment instead of directly to DOM
      fragment.appendChild(articleLink);
    });

    // Add all articles to DOM at once
    container.appendChild(fragment);

    // Mobile hover functionality
    if (typeof mobileHover === 'function') {
      mobileHover([".article"]);
    }
  }
}

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

// LOAD SUGGESTIONS ON SIDE NAV
function loadAndSetupSuggestions() {
  fetch(ROOT + "/assets/json/articles.json")
    .then((response) => response.json())
    .then((data) => {
      const articles = data.articles;
      document.querySelectorAll(".home-li").forEach((li) => {
        const title = li.getAttribute("data-id");
        const article = articles.find((article) => article.id === title);

        if (article) {
          // Create a link element for the image
          const articleLink = document.createElement("a");
          articleLink.href = ROOT + article.link;
          articleLink.target = "_blank"; // Open link in a new tab (optional)
          articleLink.className = "recommend-img";

          // Create and add the image dynamically
          const img = document.createElement("img");
          img.src = image_root + article.image;
          img.alt = article.title;

          // Append the image to the link
          articleLink.appendChild(img);

          // Create a span element to hold the title
          const titleSpan = document.createElement("span");
          titleSpan.textContent = article.title;

          // Clear any existing content and append the title and link (which contains the image) to the li element
          li.textContent = ""; // Clear any existing text
          li.appendChild(titleSpan); // Append the title
          li.appendChild(articleLink); // Append the link with image
        }
      });

      // Setup dropdown effect
      setupDropdownEffect();
    })
    .catch((error) => console.error("Error loading articles:", error));
}

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
    default:
      return;
  }

  window.open(shareUrl, "_blank"); // Open the share link in a new tab
}


function BodyDarkMode() {
  const modeToggle = document.getElementById("modeToggle");
  const toggleIcon = document.getElementById("toggleIcon");
  const body = document.body;

  // Check for saved mode in localStorage
  let darkMode = localStorage.getItem("mode") === "dark";

  function updateMode() {
    if (darkMode) {
      body.classList.add("dark-mode");
      toggleIcon.classList.replace("fa-moon", "fa-sun"); // Change to sun icon
    } else {
      body.classList.remove("dark-mode");
      toggleIcon.classList.replace("fa-sun", "fa-moon"); // Change to moon icon
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
      document.body.classList.add("dark-mode");
      toggleIcon.classList.replace("fa-moon-o", "fa-sun-o"); // Change to sun icon
    } else {
      const savedLightTheme =
        localStorage.getItem("lightTheme") || lightThemeHref;
      lightThemeLink.href = savedLightTheme;
      lightThemeLink.disabled = false;
      if (document.head.contains(darkThemeLink)) {
        document.head.removeChild(darkThemeLink); // Remove dark theme
      }
      document.body.classList.remove("dark-mode");
      toggleIcon.classList.replace("fa-sun-o", "fa-moon-o"); // Change to moon icon
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

  // Load suggestions from JSON file
  fetch(ROOT + "/assets/json/articles.json")
    .then((response) => {
      if (!response.ok) {
        throw new Error(
          "Network response is sloppy sloppy: " + response.statusText
        );
      }
      return response.json();
    })
    .then((data) => {
      // Get both articles and others from the JSON file
      const articles = data.articles || [];
      const others = data.others || [];
      const posts = data.posts || [];
      
      // Combine both arrays for searching
      const allSuggestions = [...articles, ...others, ...posts];

      searchBars.forEach((searchBar) => {
        searchBar.addEventListener("input", function () {
          const query = searchBar.value.toLowerCase();
          dropdown.innerHTML = "";
          currentFocus = -1;

          if (query) {
            // Enhanced search across multiple fields
            const filteredSuggestions = allSuggestions.filter((item) => {
              // Search in title, topic, description
              return (
                item.title.toLowerCase().includes(query) ||
                (item.topics && item.topics.some(t => t.toLowerCase().includes(query))) ||
                (item.description && item.description.toLowerCase().includes(query)) ||
                (item.date && item.date.toLowerCase().includes(query))
              );
            });
            
            // Get total matches count before slicing
            const totalMatches = filteredSuggestions.length;
            
            // Slice for display
            const displayedSuggestions = filteredSuggestions.slice(0, maxItems);
            
            // Create and add the results count indicator
            if (totalMatches > 0) {
              const countDiv = document.createElement("div");
              countDiv.className = "results-count";
              countDiv.textContent = `Displaying ${Math.min(maxItems, totalMatches)} out of ${totalMatches} results`;
              countDiv.style.padding = "8px 10px";
              countDiv.style.color = "var(--text-color, #666)";
              countDiv.style.fontSize = "0.9em";
              countDiv.style.borderBottom = "1px solid var(--border-color, var(--search-item-border-color))";
              dropdown.appendChild(countDiv);
            }

            // Display suggestions with enhanced information
            displayedSuggestions.forEach((item) => {
              const container = document.createElement("div");
              container.className = "autocomplete-item-container";
              container.style.padding = "10px";
              container.style.borderBottom = "1px solid var(--border-color, var(--search-item-border-color))";
              
              // Title section with highlighting
              const titleDiv = document.createElement("div");
              titleDiv.className = "autocomplete-item-title";
              titleDiv.style.fontWeight = "bold";
              titleDiv.style.marginBottom = "3px";
              
              // Apply highlighting to title
              const highlightedTitle = item.title.replace(
                new RegExp(query, "gi"),
                (match) =>
                  `<span style="color: var(--highlight-dropdown-color); text-decoration: underline;">${match}</span>`
              );
              titleDiv.innerHTML = highlightedTitle;
              
              // Topic section with highlighting if topics exist
              if (item.topics && item.topics.length > 0) {
                const topicDiv = document.createElement("div");
                topicDiv.className = "autocomplete-item-topic";
                topicDiv.style.fontSize = "0.85em";
                topicDiv.style.marginBottom = "3px";
                
                // Apply highlighting to topic
                const topicText = Array.isArray(item.topics) ? item.topics.join(", ") : "";
                const highlightedTopic = topicText.replace(
                  new RegExp(query, "gi"),
                  (match) =>
                    `<span style="color: var(--highlight-dropdown-color); text-decoration: underline;">${match}</span>`
                );
                topicDiv.innerHTML = `<strong>Tags:</strong> ${highlightedTopic}`;
                container.appendChild(topicDiv);
              }
              
              // Description section with highlighting if description exists
              if (item.description) {
                const descDiv = document.createElement("div");
                descDiv.className = "autocomplete-item-description";
                descDiv.style.fontSize = "0.85em";
                descDiv.style.marginBottom = "3px";
                
                // Apply highlighting to description
                const highlightedDesc = item.description.replace(
                  new RegExp(query, "gi"),
                  (match) =>
                    `<span style="color: var(--highlight-dropdown-color); text-decoration: underline;">${match}</span>`
                );
                descDiv.innerHTML = highlightedDesc;
                container.appendChild(descDiv);
              }
              
              // Date section with highlighting if date exists
              if (item.date) {
                const dateDiv = document.createElement("div");
                dateDiv.className = "autocomplete-item-date";
                dateDiv.style.fontSize = "0.85em";
                dateDiv.style.fontStyle = "italic";
                dateDiv.style.color = "var(--muted-text-color, #888)";
                
                // Apply highlighting to date
                const highlightedDate = item.date.replace(
                  new RegExp(query, "gi"),
                  (match) =>
                    `<span style="color: var(--highlight-dropdown-color); text-decoration: underline;">${match}</span>`
                );
                dateDiv.innerHTML = highlightedDate;
                container.appendChild(dateDiv);
              }
              
              // Source indicator (article or other)
              const sourceDiv = document.createElement("div");
              sourceDiv.className = "autocomplete-item-source";
              sourceDiv.style.fontSize = "0.75em";
              sourceDiv.style.marginTop = "3px";
              let sourceType = "Resource"; // Default value
              if (item.hasOwnProperty("id")) {
                  sourceType = "Article";
              } else if (item.hasOwnProperty("pid")) {
                  sourceType = "Post";
              }
              sourceDiv.textContent = sourceType;
              container.appendChild(sourceDiv);
              
              // Assemble the title component
              container.prepend(titleDiv);
              
              container.addEventListener("click", function () {
                searchBar.value = item.title;
                window.open(ROOT + item.link, "_blank"); // Open in new tab
                searchBar.value = ""; // Clear the search bar
                dropdown.innerHTML = "";
                dropdown.style.display = "none";
              });
              
              dropdown.appendChild(container);
            });

            dropdown.style.display = "block"; // Show dropdown
          } else {
            dropdown.style.display = "none"; // Hide dropdown
          }
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
            if (typeof collapseSearchBar === 'function') {
              collapseSearchBar();
            }
            if (currentFocus > -1 && items[currentFocus]) {
              // Simulate click event when pressing Enter on an active item
              items[currentFocus].click();
            } else {
              // If no active item, find the suggestion that matches the search term
              const filteredSuggestion = allSuggestions.find(
                (item) =>
                  item.title.toLowerCase() === searchBar.value.toLowerCase() ||
                  (item.topics && item.topics.some(t => t.toLowerCase() === searchBar.value.toLowerCase())) ||
                  (item.description && item.description.toLowerCase() === searchBar.value.toLowerCase())
              );
              if (filteredSuggestion) {
                window.open(ROOT + filteredSuggestion.link, "_blank");
                searchBar.value = "";
                dropdown.innerHTML = "";
                dropdown.style.display = "none";
              }
            }
          } else if (event.key === "Escape") {
            // Enhanced Escape key functionality: clear search bar and hide dropdown
            event.preventDefault();
            searchBar.value = ""; // Clear the input value
            dropdown.innerHTML = ""; // Clear dropdown content
            dropdown.style.display = "none"; // Hide dropdown
            searchBar.blur(); // Remove focus from search bar
            collapseSearchBar(); // Collapse the expanded search bar
          }
        });

        function addActive(items) {
          if (!items) return false;
          removeActive(items);
          if (currentFocus >= items.length) currentFocus = 0;
          if (currentFocus < 0) currentFocus = items.length - 1;
          items[currentFocus].classList.add("autocomplete-active");
          
          // Add some styling to make active item clearly visible
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
            // Clear all search bars when clicking outside
            searchBars.forEach(searchBar => {
              searchBar.value = "";
            });
            dropdown.innerHTML = ""; // Clear dropdown content
            dropdown.style.display = "none"; // Hide dropdown
        }
      });
    })
    .catch((error) => {
      console.error("Error loading suggestions:", error);
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
    
    // Only hide these elements on mobile
    if (window.innerWidth <= 640) {
      if (settingContainer) settingContainer.classList.add("hidden");
      if (toggleButton) toggleButton.classList.add("hidden");
    }
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
  window.addEventListener("resize", function() {
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

// Output the current year into the span
function currentYear() {
  const currentYear = new Date().getFullYear();
  document.getElementById("currentYear").textContent = currentYear;
}

const font_size = [
  "p",
  ".material-description",
  ".theorem",
  ".solution",
  ".problem",
  ".general-wrapper"
];


// === Load components ===
document.addEventListener("DOMContentLoaded", function () {
  // Add smooth scrolling to all links
  document.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", function (event) {
      if (this.hash !== "") {
        event.preventDefault();
        
        const target = document.querySelector(this.hash);
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

  // Helper function for fetch operations
  const fetchAndInsert = (url, selector) => {
    return fetch(ROOT + url)
      .then(response => {
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        return response.text();
      })
      .then(data => {
        const element = document.querySelector(selector);
        if (element) element.innerHTML = data;
        return data;
      })
      .catch(error => console.error(`Error loading ${url}:`, error));
  };

  /// Load components ///

  // Load highlights-and-attribute and setup suggestions
  fetch(ROOT + "/assets/components/highlights-and-attribute.html")
    .then(response => response.text())
    .then(data => {
      document.querySelector(".highlights-and-attribute").innerHTML = data;
      loadAndSetupSuggestions();
      fetchCommit();
    })
    .catch(error => console.error('Error loading highlights and attribute:', error));

  // Load logo and set image
  fetch(ROOT + "/assets/components/logo.html")
    .then(response => response.text())
    .then(data => {
      document.querySelector(".logo-and-side-nav").innerHTML = data;
      setImage("logoImage", "/public/Images/Logo/pendulum_logo.webp");
    })
    .catch(error => console.error('Error loading logo:', error));

  // Load footer and set current year
  fetch(ROOT + "/assets/components/footer.html")
    .then(response => response.text())
    .then(data => {
      document.querySelector("footer").innerHTML = data;
      currentYear();
    })
    .catch(error => console.error('Error loading footer:', error));

  // Load top bar
  const topNavContainer = document.createElement('div');
  topNavContainer.classList.add('top-nav');
  document.body.prepend(topNavContainer);

  fetchAndInsert("/assets/components/top-bar-and-setting.html", ".top-nav")
    .then(() => {
      // Setup scrolling indicator
      window.onscroll = scrollIndicator;
      
      // Initialize themes and UI components
      const initialLightTheme = codeThemeSwitch("light-theme-select", "lightTheme", 0);
      const initialDarkTheme = codeThemeSwitch("dark-theme-select", "darkTheme", 0);
      
      CodeDarkMode(initialLightTheme, initialDarkTheme);
      BodyDarkMode();
      extendSearchBar();
      
      // Initialize UI switches
      Switcher("fontFamily", "font-select", [".general-wrapper"], 0);
      Switcher("fontSize", "font-size-select", font_size, 2);
      Switcher("display", "indicator-select", [".progress-container", ".progress-bar"], 0);
      
      // Initialize search
      SearchBar();
    });
});

function fetchCommit() {
  fetch('/assets/json/latest_commit.json')
    .then(res => res.json())
    .then(commit => {
      const message = commit.commit.message;
      //const author = commit.commit.author.name;
      const utcDateStr = commit.commit.author.date;

      // Convert to California time with comma instead of 'at'
      const localDateObj = new Date(utcDateStr);
      const datePart = localDateObj.toLocaleDateString('en-US', {
        timeZone: 'America/Los_Angeles',
        dateStyle: 'long'
      });
      const timePart = localDateObj.toLocaleTimeString('en-US', {
        timeZone: 'America/Los_Angeles',
        hour: 'numeric',
        minute: '2-digit'
      });

      document.getElementById('commit-info').textContent =
        `Last Updated: ${datePart}, ${timePart} (Pacific)\nCommit Message: ${message}\n*Fetched via Github API`;
    });
}

function loadPosts() {
  const postContainer = document.getElementById("post-container");
  
  if (!postContainer) {
    console.error("Post container element not found");
    return;
  }
  
  // Create a loading indicator
  const loadingElement = document.createElement("div");
  loadingElement.textContent = "Loading posts...";
  postContainer.innerHTML = "";
  postContainer.appendChild(loadingElement);
  
  // Fetch posts data from JSON file
  fetch(ROOT + "/assets/json/articles.json")
    .then(response => {
      if (!response.ok) {
        throw new Error("Network response error: " + response.statusText);
      }
      return response.json();
    })
    .then(data => {
      // Check if posts array exists
      const posts = data.posts || [];
      
      if (posts.length === 0) {
        postContainer.innerHTML = "<p>No posts available</p>";
        return;
      }
      
      // Create the post list
      const postList = document.createElement("ul");
      postList.className = "post-list";
      
      // Add each post to the list
      posts.forEach(post => {
        const listItem = document.createElement("li");

        const outerDiv = document.createElement("div");
        
        const postLink = document.createElement("a");
        postLink.href = post.link;
        postLink.className = "post";
        
        const headerRow = document.createElement("div");
        headerRow.className = "post-header-row";
        
        const postTitle = document.createElement("h3");
        postTitle.textContent = post.title;
        
        const postDate = document.createElement("div");
        postDate.className = "post-date";
        postDate.textContent = post.date;
        
        const postDescription = document.createElement("p");
        postDescription.textContent = post.description;
        
        // Assemble the post structure
        headerRow.appendChild(postTitle);
        headerRow.appendChild(postDate);
        
        postLink.appendChild(headerRow);
        postLink.appendChild(postDescription);
        
        outerDiv.appendChild(postLink);
        listItem.appendChild(outerDiv);
        postList.appendChild(listItem);
      });
      
      // Replace loading indicator with posts
      postContainer.innerHTML = "";
      postContainer.appendChild(postList);
    })
    .catch(error => {
      console.error("Error loading posts:", error);
      postContainer.innerHTML = `<p>Error loading posts: ${error.message}</p>`;
    });
}

// js minifier: https://www.toptal.com/developers/javascript-minifier