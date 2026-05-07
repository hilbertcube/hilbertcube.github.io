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
  const tocLinks = Array.from(document.querySelectorAll('.toc a[href^="#"]'));
  const targets = tocLinks
    .map((link) => {
      const href = link.getAttribute("href");
      return href ? document.getElementById(href.slice(1)) : null;
    })
    .filter((target) => target !== null);

  if (!tocLinks.length || !targets.length) {
    return;
  }

  function removeActiveClasses() {
    tocLinks.forEach((link) => link.classList.remove("active"));
  }

  function highlightTocLink() {
    let currentTarget = targets[0];
    const offset = 140;

    targets.forEach((target) => {
      const rect = target.getBoundingClientRect();

      if (rect.top - offset <= 0) {
        currentTarget = target;
      }
    });

    if (currentTarget) {
      removeActiveClasses();
      const link = document.querySelector(
        `.toc a[href="#${currentTarget.id}"]`
      );
      if (link) {
        link.classList.add("active");
      }
    }
  }

  highlightTocLink();
  window.addEventListener("scroll", highlightTocLink, { passive: true });
  window.addEventListener("resize", highlightTocLink);
});

