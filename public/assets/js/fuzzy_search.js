function SearchBar() {
  const searchBars = document.querySelectorAll("#searchBar, #searchBarMobile");
  const dropdown = document.getElementById("autocomplete-dropdown");
  const maxItems = 7;
  let currentFocus = -1;

  if (!searchBars.length || !dropdown) {
    console.log("Search bar or dropdown element not found");
    return;
  }

  // Levenshtein Distance implementation
  function levenshteinDistance(str1, str2) {
    const track = Array(str2.length + 1).fill(null).map(() => 
      Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) {
      track[0][i] = i;
    }
    
    for (let j = 0; j <= str2.length; j++) {
      track[j][0] = j;
    }
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        track[j][i] = Math.min(
          track[j][i - 1] + 1, // deletion
          track[j - 1][i] + 1, // insertion
          track[j - 1][i - 1] + indicator // substitution
        );
      }
    }
    
    return track[str2.length][str1.length];
  }

  // Helper function to check if a string has a fuzzy match with a query
  function hasFuzzyMatch(text, query) {
    if (!text || !query) return false;
    
    // For very short queries, only do exact matching
    if (query.length < 3) return text.toLowerCase().includes(query);
    
    const textWords = text.toLowerCase().split(/\s+/);
    const queryWords = query.toLowerCase().split(/\s+/);
    
    for (const qWord of queryWords) {
      for (const tWord of textWords) {
        // Skip very short words
        if (tWord.length < 3) continue;
        
        // Adjust max allowed distance based on word length
        const maxDistance = qWord.length > 5 ? 2 : 1;
        
        if (levenshteinDistance(qWord, tWord) <= maxDistance) {
          return true;
        }
      }
    }
    
    return false;
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
            // Enhanced search with fuzzy matching
            const filteredSuggestions = allSuggestions.filter((item) => {
              // First, try exact matching for performance
              const exactMatch = 
                item.title.toLowerCase().includes(query) ||
                (item.topics && item.topics.some(t => t.toLowerCase().includes(query))) ||
                (item.description && item.description.toLowerCase().includes(query)) ||
                (item.date && item.date.toLowerCase().includes(query));
              
              if (exactMatch) return true;
              
              // If no exact match, try fuzzy matching
              return (
                hasFuzzyMatch(item.title, query) ||
                (item.topics && item.topics.some(t => hasFuzzyMatch(t, query))) ||
                (item.description && hasFuzzyMatch(item.description, query)) ||
                (item.date && hasFuzzyMatch(item.date, query))
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
              const query = searchBar.value.toLowerCase();
              const filteredSuggestion = allSuggestions.find((item) => {
                // First, try exact matching
                const exactMatch = 
                  item.title.toLowerCase() === query ||
                  (item.topics && item.topics.some(t => t.toLowerCase() === query)) ||
                  (item.description && item.description.toLowerCase() === query);
                
                if (exactMatch) return true;
                
                // If no exact match, try fuzzy matching for single-word queries
                if (!query.includes(" ")) {
                  return (
                    hasFuzzyMatch(item.title, query) ||
                    (item.topics && item.topics.some(t => hasFuzzyMatch(t, query))) ||
                    (item.description && hasFuzzyMatch(item.description, query))
                  );
                }
                
                return false;
              });
              
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