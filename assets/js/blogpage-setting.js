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

