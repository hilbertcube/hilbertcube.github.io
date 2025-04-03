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

// SET BANNER
function setBanner() {
  const imageUrl = ROOT + "/public/Images/code-banner.PNG";
  const banner = document.querySelector(".right-section-banner");
  banner.style.backgroundImage = `url("${imageUrl}")`;
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
  fetch(ROOT + "/assets/json/suggestions.json")
    .then((response) => response.json())
    .then((data) => {
      const articles = data.articles;
      if (random_article) shuffleArray(articles);
      displayArticles(articles.slice(0, NUM_ARTICLE));
    })
    .catch((error) => console.error("Error loading articles:", error));

  function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  function displayArticles(articles) {
    const container = document.getElementById("rec-article-container");
    container.innerHTML = ""; // Clear previous content

    articles.forEach((article) => {
      const articleLink = document.createElement("a");
      articleLink.href = ROOT + article.link;
      articleLink.classList.add("article");
      articleLink.target = "_blank"; // Open in new tab (optional)

      // Create image container
      const imageContainer = document.createElement("div");
      imageContainer.className = "article-image-container";

      const img = document.createElement("img");
      img.src = image_root + article.image;
      img.alt = article.title;
      imageContainer.appendChild(img);

      // Create text container
      const textContainer = document.createElement("div");
      textContainer.className = "article-text-container"; // New container for text

      const title = document.createElement("div");
      title.classList.add("article-name");
      title.textContent = article.title;

      const topic = document.createElement("div");
      topic.classList.add("article-topic");
      topic.textContent = "Topics: " + article.topic;

      const description = document.createElement("div");
      description.classList.add("article-description");
      description.textContent = article.description;

      const date = document.createElement("div");
      date.classList.add("article-date");
      date.textContent = "Updated " + article.date;

      // Append text elements to text container
      textContainer.appendChild(title);
      if (des) {
        textContainer.appendChild(topic);
        textContainer.appendChild(description);
        textContainer.appendChild(date);
      }

      // Append containers to the article link
      articleLink.appendChild(imageContainer);
      articleLink.appendChild(textContainer);

      // Append article link to main container
      container.appendChild(articleLink);
    });

    mobileHover([".article"]);
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

mobileHover([".materials-right img", ".hyperlink"]);

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
  fetch(ROOT + "/assets/json/suggestions.json")
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

// SMOOTHS SCROLLING
// has to use with scroll-padding-top: 120px; in html{} for smoothness
$(document).ready(function () {
  // Add smooth scrolling to all links
  $("a").on("click", function (event) {
    // Make sure this.hash has a value before overriding default behavior
    if (this.hash !== "") {
      // Prevent default anchor click behavior
      event.preventDefault();

      // Store hash
      var hash = this.hash;

      // Adjust the scroll position by subtracting the navbar height
      var Offset = 120; // Height of navbar
      var targetOffset = $(hash).offset().top - Offset;

      // Using jQuery's animate() method to add smooth page scroll
      // 800 milliseconds to scroll to the specified area
      $("html, body").animate(
        {
          scrollTop: targetOffset,
        },
        800,
        function () {
          // Add hash (#) to URL when done scrolling (default click behavior)
          // enable this thing to add hash
          // window.location.hash = hash;
        }
      );
    }
  });
});



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
  fetch(ROOT + "/assets/json/suggestions.json")
    .then((response) => {
      if (!response.ok) {
        throw new Error(
          "Network response is sloppy sloppy: " + response.statusText
        );
      }
      return response.json();
    })
    .then((data) => {
      const suggestions = data.articles; // Access the articles array within the JSON data

      searchBars.forEach((searchBar) => {
        searchBar.addEventListener("input", function () {
          const query = searchBar.value.toLowerCase();
          dropdown.innerHTML = "";
          currentFocus = -1;

          if (query) {
            const choice = "include"; // or "start-with"
            const filteredSuggestions =
              choice === "include"
                ? suggestions
                    .filter((item) => item.title.toLowerCase().includes(query))
                    .slice(0, maxItems)
                : suggestions
                    .filter((item) =>
                      item.title.toLowerCase().startsWith(query)
                    )
                    .slice(0, maxItems);

            filteredSuggestions.forEach((item, index) => {
              const div = document.createElement("div");
              const itemTitle = item.title;

              // Apply both bold and color change
              const highlightedText = itemTitle.replace(
                new RegExp(query, "gi"),
                (match) =>
                  `<strong style="color: var(--highlight-dropdown-color); font-weight: normal; text-decoration: underline;">${match}</strong>`
              );

              div.innerHTML = highlightedText; // Use innerHTML to insert the styled text
              div.className = "autocomplete-item";
              div.addEventListener("click", function () {
                searchBar.value = item.title;
                window.open(ROOT + item.link, "_blank"); // Open in new tab
                searchBar.value = ""; // Clear the search bar
                dropdown.innerHTML = "";
                dropdown.style.display = "none";
              });
              dropdown.appendChild(div);
            });

            dropdown.style.display = "block"; // Show dropdown
          } else {
            dropdown.style.display = "none"; // Hide dropdown
          }
        });

        // const searchBar_ = document.getElementById('searchBar');
        // const searchBarMobile_ = document.getElementById('searchBarMobile');
        searchBar.addEventListener("keydown", function (event) {
          const items = dropdown.getElementsByClassName("autocomplete-item");

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
            collapseSearchBar();
            if (currentFocus > -1 && items[currentFocus]) {
              // Simulate click event when pressing Enter on an active item
              items[currentFocus].click();
            } else {
              // If no active item, find the suggestion that exactly matches the search term
              const filteredSuggestion = suggestions.find(
                (item) =>
                  item.title.toLowerCase() === searchBar.value.toLowerCase()
              );
              if (filteredSuggestion) {
                window.open(filteredSuggestion.link, "_blank");
                searchBar.value = "";
                dropdown.innerHTML = "";
                dropdown.style.display = "none";
              }
            }
          }
        });

        function addActive(items) {
          if (!items) return false;
          removeActive(items);
          if (currentFocus >= items.length) currentFocus = 0;
          if (currentFocus < 0) currentFocus = items.length - 1;
          items[currentFocus].classList.add("autocomplete-active");
        }

        function removeActive(items) {
          for (let item of items) {
            item.classList.remove("autocomplete-active");
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
          dropdown.style.display = "none";
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

  searchBarContainer.classList.remove("expanded");
  leftSection.classList.remove("hidden"); // Show the left section again
  overlay.style.display = "none"; // Hide overlay
}

function extendSearchBar() {
  const searchBar = document.getElementById("searchBar");
  const searchBarMobile = document.getElementById("searchBarMobile");
  const searchBarContainer = document.getElementById("searchBarContainer");
  const overlay = document.getElementById("searchOverlay");
  const leftSection = document.querySelector(".left"); // Get the .left section

  function expandSearchBar() {
    searchBarContainer.classList.add("expanded");
    leftSection.classList.add("hidden"); // Hide the left section
    overlay.style.display = "block"; // Show overlay
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

  // Listen for Esc key to blur the search bars and hide dropdown
  [searchBar, searchBarMobile].forEach((bar) => {
    bar.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        bar.blur(); // Remove focus from the search bar
      }
    });
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
  ".reference",
  ".solution",
  ".problem",
  ".two-columns-block",
  "section",
];

$(document).ready(function () {
  $(".side-nav-container").load(ROOT + "/assets/source/side-nav.html");
  $(".highlights-and-attribute").load(
    ROOT + "/assets/source/highlights-and-attribute.html",
    function () {
      loadAndSetupSuggestions();
    }
  );
  $("#logo").load(ROOT + "/assets/source/logo.html", function () {
    setImage("logoImage", "/public/Images/Logo/pendulum_logo.png");
  });
  $(".footer").load(ROOT + "/assets/source/footer.html", function () {
    currentYear();
  });

  // Load the top bar
  $("body").prepend('<div class="top-nav"></div>');
  $(".top-nav").load(
    ROOT + "/assets/source/top-bar-and-setting.html",
    function () {
      window.onscroll = function () {
        scrollIndicator();
      };
      const initialLightTheme = codeThemeSwitch(
        "light-theme-select",
        "lightTheme",
        0
      );
      const initialDarkTheme = codeThemeSwitch(
        "dark-theme-select",
        "darkTheme",
        0
      );
      CodeDarkMode(initialLightTheme, initialDarkTheme);
      extendSearchBar();
      BodyDarkMode();

      $(".top-nav").load(
        ROOT + "/assets/source/top-bar-and-setting.html",
        function () {
          // Once the top bar is loaded, initialize functionalities
          BodyDarkMode();
          extendSearchBar();
          const lightTheme = codeThemeSwitch(
            "light-theme-select",
            "lightTheme",
            0
          );
          const darkTheme = codeThemeSwitch(
            "dark-theme-select",
            "darkTheme",
            0
          );
          CodeDarkMode(lightTheme, darkTheme);
          Switcher(
            "fontFamily",
            "font-select",
            [".general-wrapper", ".navbar"],
            0
          );
          Switcher("fontSize", "font-size-select", font_size, 2); // , '.MathJax'
          Switcher(
            "display",
            "indicator-select",
            [".progress-container", ".progress-bar"],
            0
          );
          SearchBar();
        }
      );
    }
  );
});
