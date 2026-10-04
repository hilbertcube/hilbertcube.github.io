/**
 * katex-render.js
 * ===============
 * Client-side KaTeX rendering, loaded on every page.
 *
 * - `.equation` divs (<E>) hold raw LaTeX and render in display mode.
 * - Inline `$...$` / `\(...\)` (and `$$` / `\[...\]`) go through auto-render.
 *
 * Each `.equation` is a separate render, so KaTeX would restart numbering at
 * (1) every time; per-block numbers are stripped and a running `\tag{n}`
 * injected instead. NUMBER_EQUATIONS = false turns numbering off.
 *
 * Shared macros are in `macros` below.
 */
(function () {
  var NUMBER_EQUATIONS = true;

  var macros = {
    "\\R": "\\mathbb{R}",
    "\\N": "\\mathbb{N}",
    "\\Z": "\\mathbb{Z}",
    "\\pd": "\\dfrac{\\partial #1}{\\partial #2}",
    "\\secondpd": "\\dfrac{\\partial^{2} #1}{\\partial #2^{2}}",
    "\\fourthpd": "\\dfrac{\\partial^{4} #1}{\\partial #2^{4}}",
    "\\lbrac": "\\left(",
    "\\rbrac": "\\right)",
    "\\lcm": "\\operatorname{lcm}",
    "\\modular": "\\operatorname{mod}",
  };

  // Strip one surrounding delimiter pair; katex.render() wants delimiter-free input.
  function stripDelimiters(s) {
    s = s.trim();
    if (s.slice(0, 2) === "$$" && s.slice(-2) === "$$") return s.slice(2, -2).trim();
    if (s.slice(0, 2) === "\\[" && s.slice(-2) === "\\]") return s.slice(2, -2).trim();
    if (s.slice(0, 2) === "\\(" && s.slice(-2) === "\\)") return s.slice(2, -2).trim();
    if (s.slice(0, 1) === "$" && s.slice(-1) === "$") return s.slice(1, -1).trim();
    return s;
  }

  // Non-numbering counterparts of the numbered display environments.
  var NONUM = { align: "aligned", alignat: "alignedat", gather: "gathered" };

  // Replace a numbered environment's built-in (per-block-resetting) number with a
  // single running document number, or none. Returns the LaTeX to hand to KaTeX.
  function numberedNormalize(src, counter) {
    var m = src.match(/^\\begin\{(equation|multline|align|alignat|gather)\}/);
    if (!m) return src; // starred envs, $$/\[ displays, cases, etc. -> untouched
    var env = m[1];
    var tag = NUMBER_EQUATIONS ? " \\tag{" + counter.n++ + "}" : "";
    if (env === "equation" || env === "multline") {
      src = src
        .replace(/^\\begin\{(equation|multline)\}/, "")
        .replace(/\\end\{(equation|multline)\}\s*$/, "");
    } else {
      var to = NONUM[env];
      src = src
        .replace(new RegExp("^\\\\begin\\{" + env + "\\}"), "\\begin{" + to + "}")
        .replace(new RegExp("\\\\end\\{" + env + "\\}\\s*$"), "\\end{" + to + "}");
    }
    return src + tag;
  }

  function render() {
    if (!window.katex) return;
    var counter = { n: 1 };

    var blocks = document.querySelectorAll(".equation");
    for (var i = 0; i < blocks.length; i++) {
      var el = blocks[i];
      if (el.dataset.katexRendered) continue;
      var src = numberedNormalize(stripDelimiters(el.textContent), counter);
      try {
        window.katex.render(src, el, {
          displayMode: true,
          macros: macros,
          throwOnError: false,
          strict: false,
        });
        el.dataset.katexRendered = "1";
      } catch (e) {
        /* leave raw LaTeX visible on failure */
      }
    }

    // Inline math authored via <M> (escape-free), rendered explicitly.
    var inlines = document.querySelectorAll(".inline-math");
    for (var j = 0; j < inlines.length; j++) {
      var im = inlines[j];
      if (im.dataset.katexRendered) continue;
      var isrc = stripDelimiters(im.textContent);
      if (!isrc) continue;
      try {
        window.katex.render(isrc, im, {
          displayMode: false,
          macros: macros,
          throwOnError: false,
          strict: false,
        });
        im.dataset.katexRendered = "1";
      } catch (e) {
        /* leave raw LaTeX visible on failure */
      }
    }

    // Remaining inline/display math authored as raw `$...$` etc. in prose.
    if (window.renderMathInElement) {
      window.renderMathInElement(document.body, {
        delimiters: [
          { left: "$$", right: "$$", display: true },
          { left: "\\[", right: "\\]", display: true },
          { left: "$", right: "$", display: false },
          { left: "\\(", right: "\\)", display: false },
        ],
        ignoredClasses: ["equation", "inline-math"],
        ignoredTags: ["script", "noscript", "style", "textarea", "pre", "code", "option"],
        macros: macros,
        throwOnError: false,
        strict: false,
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", render);
  } else {
    render();
  }
})();
