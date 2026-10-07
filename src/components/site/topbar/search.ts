/**
 * search.ts
 * =========
 * The top bar's search field and its results dropdown. Queries go through
 * searchIndex.ts.
 */

import { closePanels } from "./panel";
import { highlight, loadingRow, openResult, search } from "./searchIndex";

// --- Renderers ---

function showLoading(dd: HTMLElement) {
  dd.replaceChildren(loadingRow());
  dd.style.display = "block";
}

// Clear a dropdown's contents and hide it.
function hideDropdown(dd: HTMLElement) {
  dd.innerHTML = "";
  dd.style.display = "none";
}

// Call onOutside() when a document click lands outside every element in
// insideEls. A detached target (removed by a re-render before this bubbles up)
// isn't a real "outside" click.
function onOutsideClick(
  insideEls: (HTMLElement | null)[],
  onOutside: () => void,
) {
  document.addEventListener("click", (event) => {
    const target = event.target as Node;
    if (!target.isConnected) return;
    if (insideEls.some((el) => el && el.contains(target))) return;
    onOutside();
  });
}

// The search dropdown's result handler: opens the result, clears `dd` and
// runs onDone.
function makeGo(dd: HTMLElement, onDone?: () => void) {
  return (url: string) => {
    openResult(url);
    hideDropdown(dd);
    if (typeof onDone === "function") onDone();
  };
}

// Append the result cards (count + one group per article) to `dd`. The caller
// clears `dd` and handles the empty / visibility states.
function appendResults(
  dd: HTMLElement,
  query: string,
  total: number,
  items: any[],
  go: (url: string) => void,
) {
  const countDiv = document.createElement("div");
  countDiv.className = "search-count";
  countDiv.textContent = `Displaying ${total} result${total === 1 ? "" : "s"}`;
  dd.appendChild(countDiv);

  // One group (card) per article; one row per matching section within it.
  items.forEach((item) => {
    const group = document.createElement("div");
    group.className = "search-group";

    const head = document.createElement("div");
    head.className = "search-group-head";

    const titleEl = document.createElement("span");
    titleEl.className = "search-group-title";
    titleEl.innerHTML = highlight(item.title, query);
    titleEl.addEventListener("click", () => go(item.url));
    head.appendChild(titleEl);

    const badge = document.createElement("span");
    badge.className = "search-type-badge";
    badge.textContent = item.type;
    head.appendChild(badge);

    group.appendChild(head);

    if (item.topicsHtml) {
      const tags = document.createElement("div");
      tags.className = "search-group-tags";
      tags.innerHTML = `<strong>Tags:</strong> ${item.topicsHtml}`;
      group.appendChild(tags);
    }

    item.hits.forEach((hit: any) => {
      const row = document.createElement("div");
      row.className = "search-hit";

      if (hit.heading) {
        const h = document.createElement("div");
        h.className = "search-hit-heading";
        h.innerHTML = highlight(hit.heading, query);
        row.appendChild(h);
      }
      if (hit.excerptHtml) {
        const ex = document.createElement("div");
        ex.className = "search-hit-excerpt";
        ex.innerHTML = hit.excerptHtml;
        row.appendChild(ex);
      }

      row.addEventListener("click", () => go(hit.url));
      group.appendChild(row);
    });

    dd.appendChild(group);
  });
}

// --- Expand / collapse of the search field itself --------------------------

function collapseSearchBar() {
  const searchBarContainer = document.getElementById("searchBarContainer");
  const leftSection = document.querySelector<HTMLElement>(".left");
  const overlay = document.getElementById("searchOverlay");
  const settingContainer = document.querySelector<HTMLElement>(".buttons-container");
  const toggleButton = document.querySelector<HTMLElement>(".toggle-btn-container");

  searchBarContainer?.classList.remove("expanded");
  leftSection?.classList.remove("hidden");
  if (overlay) overlay.style.display = "none";

  document.getElementById("searchIconBtn")?.classList.remove("search-icon-hidden");

  if (window.innerWidth <= 640) {
    settingContainer?.classList.remove("hidden");
    toggleButton?.classList.remove("hidden");
  }
}

function initSearchBarChrome() {
  const searchBar = document.getElementById("searchBar") as HTMLInputElement | null;
  const searchBarMobile = document.getElementById("searchBarMobile") as HTMLInputElement | null;
  const searchBarContainer = document.getElementById("searchBarContainer");
  const overlay = document.getElementById("searchOverlay");
  const leftSection = document.querySelector<HTMLElement>(".left");
  const dropdown = document.getElementById("autocomplete-dropdown");
  const settingContainer = document.querySelector<HTMLElement>(".buttons-container");
  const toggleButton = document.querySelector<HTMLElement>(".toggle-btn-container");

  if (!searchBar || !searchBarMobile || !searchBarContainer || !overlay) return;

  function expandSearchBar() {
    // An open panel would sit over the search field and its results.
    closePanels();
    searchBarContainer!.classList.add("expanded");
    leftSection?.classList.add("hidden");
    overlay!.style.display = "block";

    document.getElementById("searchIconBtn")?.classList.add("search-icon-hidden");

    // Only hide these elements on mobile
    if (window.innerWidth <= 640) {
      settingContainer?.classList.add("hidden");
      toggleButton?.classList.add("hidden");
    }
  }

  // Tapping the mobile search icon reveals the search bar
  document.getElementById("searchIconBtn")?.addEventListener("click", () => {
    expandSearchBar();
    searchBarMobile.focus();
  });

  // The dropdown is anchored to (and sized by) the search container, so it can
  // only be on screen while that container carries `.expanded`.
  // Computed, not the inline style: the dropdown starts out hidden by CSS
  // alone, with no inline display set until the first query renders.
  const dropdownOpen = () =>
    !!dropdown && getComputedStyle(dropdown).display !== "none";

  [searchBar, searchBarMobile].forEach((bar) => {
    bar.addEventListener("focus", expandSearchBar);
    bar.addEventListener("blur", () =>
      setTimeout(() => {
        // iOS's keyboard-accessory "Done" only blurs the field — the results
        // are still on screen. Collapsing here would shrink the container the
        // dropdown is anchored to and leave it stranded at a compressed width,
        // so stay expanded until the results themselves go away (a result is
        // opened, or a click outside / Escape closes the dropdown, each of
        // which collapses the bar on its own).
        if (dropdownOpen()) return;
        collapseSearchBar();
      }, 100),
    );

    bar.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      bar.value = "";
      if (dropdown) hideDropdown(dropdown);
      bar.blur();
      collapseSearchBar();
    });
  });

  overlay.addEventListener("click", collapseSearchBar);

  // Placeholder hint while focused.
  searchBar.addEventListener("focus", () => {
    searchBar.setAttribute("placeholder", "Use your arrow keys to navigate");
  });
  searchBar.addEventListener("blur", () => {
    setTimeout(() => {
      searchBar.setAttribute("placeholder", "Type / to search");
    }, 100);
  });

  // Keep the chrome consistent if the viewport changes while expanded.
  window.addEventListener("resize", () => {
    if (!searchBarContainer.classList.contains("expanded")) return;
    const narrow = window.innerWidth <= 768;
    overlay.classList.toggle("hidden", narrow);
    settingContainer?.classList.toggle("hidden", narrow);
  });

  // "/" anywhere on the page jumps to the search field.
  document.addEventListener("keydown", (event) => {
    if (event.key !== "/") return;
    event.preventDefault();
    searchBar.focus();
  });
}

// --- The search bar: pure full-text search, no tag browsing. ---

function setupSearch(searchBars: HTMLInputElement[], dropdown: HTMLElement) {
  let currentFocus = -1;
  let seq = 0;
  const go = makeGo(dropdown, () => {
    searchBars.forEach((bar) => (bar.value = ""));
    // The field may already be blurred (mobile "Done"), in which case the blur
    // handler deliberately left the bar expanded for the dropdown's sake. The
    // dropdown is gone now, so put the bar back.
    collapseSearchBar();
  });

  async function update(searchBar: HTMLInputElement) {
    const mySeq = ++seq;
    const query = searchBar.value.trim();
    currentFocus = -1;

    // Empty query → nothing to show.
    if (!query) {
      hideDropdown(dropdown);
      return;
    }

    // Show "Loading…" only if the search is genuinely slow (mainly the first
    // query, while Pagefind's index loads) — avoids flicker on fast ones.
    const loadingTimer = setTimeout(() => {
      if (mySeq === seq && searchBar.value.trim() === query) showLoading(dropdown);
    }, 250);

    const result = await search(query);
    clearTimeout(loadingTimer);
    // Superseded by a newer keystroke => bail so a stale result can't clobber.
    if (mySeq !== seq) return;
    // Null => superseded by a newer keystroke (Pagefind debounce).
    if (!result) return;
    // Guard against out-of-order async results: only render for the live query.
    if (searchBar.value.trim() !== query) return;

    dropdown.innerHTML = "";
    currentFocus = -1;
    if (!result.items.length) {
      dropdown.style.display = "none";
      return;
    }
    appendResults(dropdown, query, result.total, result.items, go);
    dropdown.style.display = "block";
  }

  function setActive(items: HTMLCollectionOf<Element>) {
    if (!items.length) return;
    for (const item of items) item.classList.remove("autocomplete-active");
    if (currentFocus >= items.length) currentFocus = 0;
    if (currentFocus < 0) currentFocus = items.length - 1;
    items[currentFocus].classList.add("autocomplete-active");
    items[currentFocus].scrollIntoView({ block: "nearest" });
  }

  searchBars.forEach((searchBar) => {
    searchBar.addEventListener("input", () => update(searchBar));

    searchBar.addEventListener("keydown", (event) => {
      const items = dropdown.getElementsByClassName("search-hit");

      if (event.key === "ArrowDown") {
        event.preventDefault();
        currentFocus++;
        if (currentFocus >= items.length) currentFocus = 0;
        setActive(items);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        currentFocus--;
        if (currentFocus < 0) currentFocus = items.length - 1;
        setActive(items);
      } else if (event.key === "Enter") {
        event.preventDefault();
        collapseSearchBar();
        // Open the highlighted result, or the first one if none is highlighted.
        const target = items[currentFocus] || items[0];
        if (target) (target as HTMLElement).click();
      } else if (event.key === "Escape") {
        event.preventDefault();
        searchBar.value = "";
        hideDropdown(dropdown);
        searchBar.blur();
        collapseSearchBar();
      }
    });
  });

  // Clear + hide when clicking outside the bars/dropdown. The mobile search
  // icon counts as *inside*: its own click opens the bar, and this handler runs
  // on that same click — collapsing there would close the bar as it opens.
  const searchIconBtn = document.getElementById("searchIconBtn");
  onOutsideClick([...searchBars, dropdown, searchIconBtn], () => {
    searchBars.forEach((bar) => (bar.value = ""));
    hideDropdown(dropdown);
    collapseSearchBar();
  });
}

export function initSearch() {
  initSearchBarChrome();

  const searchBars = [
    ...document.querySelectorAll<HTMLInputElement>("#searchBar, #searchBarMobile"),
  ];
  const dropdown = document.getElementById("autocomplete-dropdown");

  if (!searchBars.length || !dropdown) {
    console.log("Search bar or dropdown element not found");
    return;
  }

  setupSearch(searchBars, dropdown);
}
