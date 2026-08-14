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

// The Table of Contents highlight now ships with TableOfContents.astro's own
// <script>, so it is no longer part of this file.
