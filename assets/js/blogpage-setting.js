article(4, true, true);

// Problem solution, open by default
const solutionDefaultOpen = true;

if (solutionDefaultOpen) {
  const solutions = document.querySelectorAll(".solution");
  solutions.forEach((solution) => {
    solution.setAttribute("open", "");
  });
}

document.querySelectorAll("img").forEach((img) => {
  img.setAttribute("loading", "lazy");
});

// Blog toc section highlight
document.addEventListener("DOMContentLoaded", function () {
  const sections = document.querySelectorAll("section");
  const tocLinks = document.querySelectorAll(".toc a");

  function removeActiveClasses() {
    tocLinks.forEach((link) => link.classList.remove("active"));
  }

  function highlightTocLink() {
    let currentSection = null;

    sections.forEach((section) => {
      const rect = section.getBoundingClientRect();

      // Check if any part of the section is within the viewport
      if (rect.top < window.innerHeight && rect.bottom > 0) {
        currentSection = section;
      }
    });

    // Highlight the corresponding TOC link if we found a current section
    if (currentSection) {
      removeActiveClasses();
      const link = document.querySelector(
        `.toc a[href="#${currentSection.id}"]`
      );
      if (link) link.classList.add("active");
    }
  }

  window.addEventListener("scroll", highlightTocLink);
});

// function loadTitleAndDate(id) {
//     fetch(ROOT + '/assets/json/suggestions.json')
//         .then(response => {
//             if (!response.ok) {
//                 throw new Error(`Error fetching JSON: ${response.status}`);
//             }
//             return response.json();
//         })
//         .then(data => {
//             const article = data.articles.find(article => article.id === id);

//             if (article) {
//                 // Update the <h1> element with the title
//                 const h1Element = document.querySelector('h1.title');
//                 if (h1Element) {
//                     h1Element.textContent = article.title;
//                 } else {
//                     console.error("No <h1 class='title'> element found in the DOM.");
//                 }

//                 // Update the <div> element with the date
//                 const dateDiv = document.querySelector('div.date');
//                 if (dateDiv) {
//                     const dateText = article.date
//                         ? `Updated ${article.date}`
//                         : "Date not available";
//                     dateDiv.textContent = dateText;
//                 } else {
//                     console.error("No <div class='date'> element found in the DOM.");
//                 }
//             } else {
//                 console.error(`No article found with ID: ${id}`);
//             }
//         })
//         .catch(error => {
//             console.error("Error:", error);
//         });
// }

function loadDate(id) {
  fetch("/assets/json/articles.json") // Adjust the path as needed
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Error fetching JSON: ${response.status}`);
      }
      return response.json();
    })
    .then((data) => {
      const article = data.articles.find((article) => article.id === id);

      if (article) {
        // Update the <div> element with the date
        const dateDiv = document.querySelector("div.date");
        if (dateDiv) {
          const dateText = article.date
            ? `Updated ${article.date}`
            : "Date not available";
          dateDiv.textContent = dateText;
        } else {
          console.error("No <div class='date'> element found in the DOM.");
        }
      } else {
        console.error(`No article found with ID: ${id}`);
      }
    })
    .catch((error) => {
      console.error("Error:", error);
    });
}