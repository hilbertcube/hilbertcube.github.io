function BodyDarkMode() {
    const toggleSwitch = document.getElementById('modeToggle');
    const body = document.body;

    // Check for saved mode in local storage
    if (localStorage.getItem('mode') === 'dark') {
        body.classList.add('dark-mode');
        if (toggleSwitch) {
            toggleSwitch.checked = true;
        }
    }

    if (toggleSwitch) {
        toggleSwitch.addEventListener('change', () => {
            if (toggleSwitch.checked) {
                body.classList.add('dark-mode');
                localStorage.setItem('mode', 'dark');
            } 
            else {
                body.classList.remove('dark-mode');
                localStorage.setItem('mode', 'light');
            }
        });
    }
}



function CodeDarkMode(lightThemeHref, darkThemeHref) {
    let lightThemeLink = document.getElementById('light-theme-link');
    let darkThemeLink = document.getElementById('dark-theme-link');

    // Create light theme link if it doesn't exist
    if (!lightThemeLink) {
        lightThemeLink = document.createElement('link');
        lightThemeLink.id = 'light-theme-link';
        lightThemeLink.rel = 'stylesheet';
        document.head.appendChild(lightThemeLink);
    }

    // Create dark theme link if it doesn't exist
    if (!darkThemeLink) {
        darkThemeLink = document.createElement('link');
        darkThemeLink.id = 'dark-theme-link';
        darkThemeLink.rel = 'stylesheet';
        document.head.appendChild(darkThemeLink);
    }

    // Check for saved mode in local storage
    if (localStorage.getItem('mode') === 'dark') {
        darkThemeLink.href = darkThemeHref; // Load dark theme
        lightThemeLink.disabled = true; // Disable light theme
        document.head.appendChild(darkThemeLink);
    } else {
        const savedLightTheme = localStorage.getItem('lightTheme') || lightThemeHref; // Get saved light theme
        lightThemeLink.href = savedLightTheme; // Set the light theme link to the saved theme
        lightThemeLink.disabled = false; // Enable light theme

        if (document.head.contains(darkThemeLink)) {
            document.head.removeChild(darkThemeLink); // Ensure dark theme is unloaded
        }
    }

    const toggleSwitch = document.getElementById('modeToggle');
    if (toggleSwitch) {
        toggleSwitch.addEventListener('change', () => {
            if (toggleSwitch.checked) {
                darkThemeLink.href = darkThemeHref; // Load dark theme
                lightThemeLink.disabled = true; // Disable light theme
                localStorage.setItem('mode', 'dark'); // Save mode to local storage
                document.head.appendChild(darkThemeLink); // Append dark theme link
            } else {
                const savedLightTheme = localStorage.getItem('lightTheme') || lightThemeHref; // Get saved light theme
                lightThemeLink.href = savedLightTheme; // Set the light theme link to the saved theme
                lightThemeLink.disabled = false; // Enable light theme
                localStorage.setItem('mode', 'light'); // Save mode to local storage
                if (document.head.contains(darkThemeLink)) {
                    document.head.removeChild(darkThemeLink); // Unload dark theme
                }
            }
        });
    }
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

    selectElement.addEventListener('change', function () {
        const selectedValue = selectElement.value;

        // Save the selected value to localStorage
        localStorage.setItem(storageKey, selectedValue);

        // Broadcast the change to other tabs
        window.localStorage.setItem(`${storageKey}Changed`, Date.now());

        // Reload the page to apply the new theme
        window.location.reload();
    });

    // Listen for changes in localStorage to update the value in real-time
    window.addEventListener('storage', function(event) {
        if (event.key === `${storageKey}Changed`) {
            window.location.reload();
        }
    });

    return savedValue;
}



document.addEventListener('keydown', function(event) {
    if (event.key === '/') {
        event.preventDefault();  // Prevent the default action of '/'
        const searchBar = document.getElementById('searchBar');
        if (searchBar) {
            searchBar.focus();  // Focus the search bar
        } else {
            console.error('Search bar not found');
        }
    }
});


function SearchBar() {
    const searchBars = document.querySelectorAll('#searchBar, #searchBarMobile');
    const dropdown = document.getElementById('autocomplete-dropdown');
    const maxItems = 7;
    let currentFocus = -1;

    if (!searchBars.length || !dropdown) {
        console.log('Search bar or dropdown element not found');
        return;
    }

    // Load suggestions from JSON file
    fetch(ROOT + '/assets/json/suggestions.json')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response is sloppy sloppy: ' + response.statusText);
            }
            return response.json();
        })
        .then(data => {
            const suggestions = data.articles; // Access the articles array within the JSON data

            searchBars.forEach(searchBar => {
                searchBar.addEventListener('input', function () {
                    const query = searchBar.value.toLowerCase();
                    dropdown.innerHTML = '';
                    currentFocus = -1;

                    if (query) {
                        const choice = "include"; // or "start-with"
                        const filteredSuggestions = choice === "include" 
                            ? suggestions.filter(item => item.title.toLowerCase().includes(query)).slice(0, maxItems)
                            : suggestions.filter(item => item.title.toLowerCase().startsWith(query)).slice(0, maxItems);

                        filteredSuggestions.forEach((item, index) => {
                            const div = document.createElement('div');
                            const itemTitle = item.title;
                            
                            // Apply both bold and color change
                            const highlightedText = itemTitle.replace(new RegExp(query, 'gi'), match => `<strong style="color: var(--highlight-dropdown-color); font-weight: normal; text-decoration: underline;">${match}</strong>`);

                            div.innerHTML = highlightedText; // Use innerHTML to insert the styled text
                            div.className = 'autocomplete-item';
                            div.addEventListener('click', function () {
                                searchBar.value = item.title;
                                window.open(ROOT + item.link, '_blank'); // Open in new tab
                                searchBar.value = ''; // Clear the search bar
                                dropdown.innerHTML = '';
                                dropdown.style.display = 'none';
                            });
                            dropdown.appendChild(div);
                        });

                        dropdown.style.display = 'block'; // Show dropdown
                    } 
                    else {
                        dropdown.style.display = 'none'; // Hide dropdown
                    }
                });

                // const searchBar_ = document.getElementById('searchBar');
                // const searchBarMobile_ = document.getElementById('searchBarMobile');
                searchBar.addEventListener('keydown', function (event) {
                    const items = dropdown.getElementsByClassName('autocomplete-item');

                    if (event.key === 'ArrowDown') {
                        event.preventDefault();
                        currentFocus++;
                        if (currentFocus >= items.length) currentFocus = 0;
                        addActive(items);
                    } 
                    else if (event.key === 'ArrowUp') {
                        event.preventDefault();
                        currentFocus--;
                        if (currentFocus < 0) currentFocus = items.length - 1;
                        addActive(items);
                    } 
                    else if (event.key === 'Enter') {
                        event.preventDefault();
                        collapseSearchBar();
                        if (currentFocus > -1 && items[currentFocus]) {
                            // Simulate click event when pressing Enter on an active item
                            items[currentFocus].click();
                        } 
                        else {
                            // If no active item, find the suggestion that exactly matches the search term
                            const filteredSuggestion = suggestions.find(item => item.title.toLowerCase() === searchBar.value.toLowerCase());
                            if (filteredSuggestion) {
                                window.open(filteredSuggestion.link, '_blank');
                                searchBar.value = '';
                                dropdown.innerHTML = '';
                                dropdown.style.display = 'none'; 
                            }
                        }
                    }
                });

                function addActive(items) {
                    if (!items) return false;
                    removeActive(items);
                    if (currentFocus >= items.length) currentFocus = 0;
                    if (currentFocus < 0) currentFocus = items.length - 1;
                    items[currentFocus].classList.add('autocomplete-active');
                }

                function removeActive(items) {
                    for (let item of items) {
                        item.classList.remove('autocomplete-active');
                    }
                }
            });

            // Hide dropdown when clicking outside
            document.addEventListener('click', function (event) {
                const target = event.target;
                if (![...searchBars].some(bar => bar.contains(target)) && !dropdown.contains(target)) {
                    dropdown.style.display = 'none';
                }
            });

        })
        .catch(error => {
            console.error('Error loading suggestions:', error);
        });
}

function collapseSearchBar() {
    const searchBarContainer = document.getElementById('searchBarContainer');
    const leftSection = document.querySelector('.left'); // Get the .left section
    const overlay = document.getElementById('searchOverlay');

    searchBarContainer.classList.remove('expanded');
    leftSection.classList.remove('hidden'); // Show the left section again
    overlay.style.display = 'none'; // Hide overlay
}

function extendSearchBar() {
    const searchBar = document.getElementById('searchBar');
    const searchBarMobile = document.getElementById('searchBarMobile');
    const searchBarContainer = document.getElementById('searchBarContainer');
    const overlay = document.getElementById('searchOverlay');
    const leftSection = document.querySelector('.left'); // Get the .left section

    function expandSearchBar() {
        searchBarContainer.classList.add('expanded');
        leftSection.classList.add('hidden'); // Hide the left section
        overlay.style.display = 'block'; // Show overlay
    }


    // Listen for focus on both desktop and mobile search bars
    searchBar.addEventListener('focus', expandSearchBar);
    searchBarMobile.addEventListener('focus', expandSearchBar);
    searchBar.addEventListener('blur', function () {
        setTimeout(() => {
            collapseSearchBar(); // Collapse the search bar after a short delay
        }, 100);
    });

    searchBarMobile.addEventListener('blur', function () {
        setTimeout(() => {
            collapseSearchBar(); // Collapse the search bar after a short delay
        }, 100);
    });
    // Allow clicking on the overlay to close the search
    overlay.addEventListener('click', collapseSearchBar);


    // placeholder change
    searchBar.addEventListener('focus', function() {
        this.setAttribute('placeholder', 'Use your arrow keys to navigate');
    });
    
    // Restore the original placeholder when the input loses focus
    searchBar.addEventListener('blur', function() {
        setTimeout(() => {
            this.setAttribute('placeholder', 'Type / to search');
        }, 100);
        
    });

    // Listen for Esc key to blur the search bars and hide dropdown
    [searchBar, searchBarMobile].forEach(bar => {
        bar.addEventListener('keydown', function (event) {
            if (event.key === 'Escape') {
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
        targetSelectors.forEach(selector => {
            document.querySelectorAll(selector).forEach(element => {
                element.style[target] = value; // attribute before
            });
        });
    }

    // Load the saved value from localStorage or use the default value
    const savedValue = localStorage.getItem(target) || defaultChoice;
    applyChange(savedValue);

    // Set the select dropdown to the saved or default value
    selectElement.value = savedValue;

    selectElement.addEventListener('change', function () {
        const selectedValue = selectElement.value;
        applyChange(selectedValue);

        // Save the selected value to localStorage
        localStorage.setItem(target, selectedValue);

        // Broadcast the change to other tabs
        window.localStorage.setItem(`${target}Changed`, Date.now());
    });

    // Listen for changes in localStorage to update the value in real-time
    window.addEventListener('storage', function(event) {
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
    var height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    var scrolled = (winScroll / height) * 100;
    document.getElementById("myBar").style.width = scrolled + "%";
}

// Output the current year into the span
function currentYear(){
    const currentYear = new Date().getFullYear();
    document.getElementById('currentYear').textContent = currentYear;
}


const font_size = ['p' ,'.material-description', '.theorem', '.reference', '.solution', '.problem', '.two-columns-block'];


$(document).ready(function() {
    $(".side-nav-container").load(ROOT + "/assets/source/side-nav.html");
    $(".highlights-and-attribute").load(ROOT + "/assets/source/highlights-and-attribute.html", function(){
        loadAndSetupSuggestions();
    });
    $("#logo").load(ROOT + "/assets/source/logo.html", function(){
        setLogo();
    });
    $(".footer").load(ROOT + "/assets/source/footer.html",  function() {
        currentYear();
    });

    // Load the top bar
    $(".top-nav").load(ROOT + "/assets/source/top-bar-and-setting.html", function() {
        window.onscroll = function() {scrollIndicator()};
        const initialLightTheme = codeThemeSwitch('light-theme-select', 'lightTheme', 0);
        const initialDarkTheme = codeThemeSwitch('dark-theme-select', 'darkTheme', 0);
        CodeDarkMode(initialLightTheme, initialDarkTheme);
        extendSearchBar();
        BodyDarkMode();
        $(".top-nav").load(ROOT + "/assets/source/top-bar-and-setting.html", function() {
            // Once the top bar is loaded, initialize functionalities
            BodyDarkMode();
            extendSearchBar();
            const lightTheme = codeThemeSwitch('light-theme-select', 'lightTheme', 0);
            const darkTheme = codeThemeSwitch('dark-theme-select', 'darkTheme', 0);
            CodeDarkMode(lightTheme, darkTheme); 
            Switcher('fontFamily', 'font-select', ['.general-wrapper', '.navbar'], 0);
            Switcher('fontSize', 'font-size-select', font_size, 2); // , '.MathJax'
            Switcher('display', 'indicator-select', ['.progress-container', '.progress-bar'], 0);
            SearchBar();
    
        });
    });
    
});

