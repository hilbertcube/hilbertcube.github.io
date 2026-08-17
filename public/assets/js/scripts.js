// Site-wide behaviour that has no single owning component. Everything tied to a
// specific component now lives in that component's own <script>: see
// src/components/site/TopBar.astro (+ src/components/site/topbar/*) for the
// nav, dark mode, settings and search; Lightbox, ShareButton,
// HighlightsAndAttribute, CopyButton and TabBox for the rest.

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
