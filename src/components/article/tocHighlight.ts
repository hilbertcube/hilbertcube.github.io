/**
 * tocHighlight.ts
 * ===============
 * Marks the Table of Contents entry for the section being read.
 *
 * The current entry is the last one that starts above a "reading line" — the
 * height in the viewport past which a section counts as the one being read.
 * Two things about that line matter:
 *
 *   * It sits about a third of the way down the viewport, never above the
 *     fixed top bar. A line pinned near the very top (what this used to do)
 *     only crosses a short section once the section is already scrolling out,
 *     so short sections lit up late or not at all.
 *   * Once the page runs out of scrolling, the line slides down to the bottom
 *     of the viewport instead. The trailing sections can never be pushed up to
 *     a fixed line, so they would otherwise never become current — the shorter
 *     the last sections, the more of them stayed dark. Sliding the line hands
 *     each of them its turn over the final screenful of scrolling.
 */

// Anchors land 120px down (scroll-padding-top), so the line stays below that.
const MIN_LINE = 140;
const LINE_FRACTION = 0.3;

/** One TOC link paired with the element it points at, in document order. */
interface Entry {
  link: HTMLAnchorElement;
  target: HTMLElement;
}

export function initTocHighlight() {
  const entries: Entry[] = [];
  const claimed = new Set<string>();

  document
    .querySelectorAll<HTMLAnchorElement>('.toc a[href^="#"]')
    .forEach((link) => {
      const id = decodeURIComponent(link.getAttribute("href")!.slice(1));
      if (!id || claimed.has(id)) return;

      const target = document.getElementById(id);
      if (!target) return;

      claimed.add(id);
      entries.push({ link, target });
    });

  if (!entries.length) return;

  // The TOC is built from the page's own markup, so it is already in document
  // order — but a hand-written list (see TableOfContents.astro) need not be,
  // and the scan below assumes tops that grow down the page.
  entries.sort((a, b) =>
    a.target.compareDocumentPosition(b.target) & Node.DOCUMENT_POSITION_FOLLOWING
      ? -1
      : 1,
  );

  let active: Entry | null = null;

  function setActive(entry: Entry | null) {
    if (entry === active) return;

    if (active) {
      active.link.classList.remove("active");
      active.link.removeAttribute("aria-current");
    }
    active = entry;
    if (active) {
      active.link.classList.add("active");
      active.link.setAttribute("aria-current", "true");
    }
  }

  function highlightTocLink() {
    const viewport = window.innerHeight || document.documentElement.clientHeight;
    const scrolled = window.scrollY || window.pageYOffset || 0;
    const maxScroll = document.documentElement.scrollHeight - viewport;

    const base = Math.min(
      Math.max(viewport * LINE_FRACTION, MIN_LINE),
      viewport * 0.5,
    );

    // Fixed line for most of the page; over the last screenful it slides to the
    // viewport bottom as the scrolling left to do runs down to zero. A page
    // that doesn't scroll at all keeps the fixed line — sliding it there would
    // pin the highlight to the last section from the outset.
    const line =
      maxScroll > 0
        ? Math.max(base, viewport - Math.max(0, maxScroll - scrolled))
        : base;

    // Above the first section, the first entry stays lit rather than none.
    let current = entries[0];
    for (const entry of entries) {
      if (entry.target.getBoundingClientRect().top <= line) current = entry;
    }

    setActive(current);
  }

  // Positions are read fresh on every pass, so late layout shifts (images,
  // KaTeX) need no bookkeeping — but they can change which section is current
  // without any scrolling, hence the observer.
  let queued = false;
  function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(function () {
      queued = false;
      highlightTocLink();
    });
  }

  highlightTocLink();
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule);
  window.addEventListener("hashchange", schedule);
  window.addEventListener("load", schedule);
  if (window.ResizeObserver) {
    new ResizeObserver(schedule).observe(document.body);
  }
}
