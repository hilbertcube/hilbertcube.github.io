/**
 * search.ts
 * =========
 * The top bar's search field and tag browser. Full-text search runs on the
 * Pagefind index built into the site; `astro dev` (where no index exists)
 * falls back to the articles.json metadata list.
 */

const PAGEFIND_URL = "/pagefind/pagefind.js";

const HL_OPEN =
  '<span style="color: var(--highlight-dropdown-color); text-decoration: underline;">';
const HL_CLOSE = "</span>";

function escapeRegExp(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Highlight every case-insensitive occurrence of `query` in a PLAIN-TEXT string.
function highlight(text: string, query: string) {
  if (!query) return text;
  return text.replace(
    new RegExp(escapeRegExp(query), "gi"),
    (match) => `${HL_OPEN}${match}${HL_CLOSE}`,
  );
}

// Map a result URL to the Article / Post / Resource label the UI shows.
function typeFromUrl(url: string) {
  if (url.includes("/articles/")) return "Article";
  if (url.includes("/posts/")) return "Post";
  return "Resource";
}

// --- Engine selection ------------------------------------------------------

// Lazily pick a search engine: Pagefind (full-text) when its index is present
// in the built site, otherwise fall back to the articles.json metadata list so
// `astro dev` and offline still search titles/topics/descriptions.
let enginePromise: Promise<any> | null = null;
function getEngine() {
  return (enginePromise ||= loadEngine());
}

async function loadEngine(): Promise<any> {
  try {
    // Native dynamic import of the statically-hosted Pagefind bundle. The path
    // goes through a variable so Vite leaves it alone: the index is generated
    // by `pagefind --site dist` *after* astro build, so it cannot be resolved
    // at bundle time.
    const pagefind = await import(/* @vite-ignore */ PAGEFIND_URL);
    await pagefind.init();
    return { kind: "pagefind", pagefind };
  } catch (err) {
    console.warn("Pagefind unavailable, falling back to articles.json:", err);
    try {
      const res = await fetch("/assets/json/articles.json");
      if (!res.ok) throw new Error("Network response error: " + res.statusText);
      const data = await res.json();
      const suggestions = [
        ...(data.articles || []),
        ...(data.others || []),
        ...(data.posts || []),
      ];
      // Tag browsing mirrors the old /tags cloud: articles + posts only.
      const taggable = [...(data.articles || []), ...(data.posts || [])];
      const facets: Record<string, number> = {};
      taggable.forEach((item: any) =>
        (item.topics || []).forEach((t: string) => {
          facets[t] = (facets[t] || 0) + 1;
        }),
      );
      return { kind: "fallback", suggestions, taggable, facets };
    } catch (err2) {
      console.error("Error loading search fallback:", err2);
      return { kind: "none" };
    }
  }
}

// --- Tag / topic facets (powers the tags dropdown's chip cloud) ---
// Resolves { tag: count } once per page from whichever engine is live.
let facetsPromise: Promise<Record<string, number>> | null = null;
function getFacets() {
  return (facetsPromise ||= loadFacets());
}

async function loadFacets(): Promise<Record<string, number>> {
  const engine = await getEngine();
  if (engine.kind === "pagefind") {
    // Pagefind exposes filter values + counts without needing a query.
    const filters = await engine.pagefind.filters();
    return filters.topic || {};
  }
  if (engine.kind === "fallback") return engine.facets || {};
  return {};
}

// --- Custom excerpt building (Pagefind gives us every match position) ---

const CONTEXT = 16; // words of context on each side of a match cluster
const CLUSTER_GAP = 30; // matches farther apart than this become separate snippets
const MAX_SNIPPETS = 4; // per page

// Group sorted match word-positions: nearby matches share a snippet, far-apart
// ones (e.g. two paragraphs) split into separate snippets.
function clusterLocations(locations: number[]) {
  const sorted = [...new Set(locations)].sort((a, b) => a - b);
  const clusters: number[][] = [];
  for (const loc of sorted) {
    const last = clusters[clusters.length - 1];
    // Same snippet if nearby AND the cluster hasn't already grown too large.
    if (last && loc - last[last.length - 1] <= CLUSTER_GAP && last.length < 10)
      last.push(loc);
    else clusters.push([loc]);
  }
  return clusters;
}

// Build one highlighted snippet (…word word MATCH word…) around a cluster.
function buildSnippet(words: string[], cluster: number[]) {
  const matches = new Set(cluster);
  const start = Math.max(0, cluster[0] - CONTEXT);
  const end = Math.min(words.length - 1, cluster[cluster.length - 1] + CONTEXT);
  const parts: string[] = [];
  for (let i = start; i <= end; i++) {
    if (words[i] === undefined) continue;
    const w = escapeHtml(words[i]);
    parts.push(matches.has(i) ? `${HL_OPEN}${w}${HL_CLOSE}` : w);
  }
  let html = parts.join(" ");
  if (start > 0) html = "… " + html;
  if (end < words.length - 1) html = html + " …";
  return html;
}

// Append ?pagefind-highlight=<query> (before any #anchor) so the destination
// page scrolls to and highlights the exact match via pagefind-highlight.js.
function withHighlight(url: string, q: string) {
  const [path, hash] = url.split("#");
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}pagefind-highlight=${encodeURIComponent(q)}${hash ? "#" + hash : ""}`;
}

// Turn one Pagefind result into a render item: the page title plus one snippet
// per match cluster, each linked to (and headed by) the section it falls in.
function buildPageItem(d: any, query: string) {
  const title = (d.meta && d.meta.title) || d.url;
  const words = (d.content || "").split(/\s+/);

  // Section anchors sorted by word position. anchor.location and the match
  // locations share the same index base into d.content, so a match maps to the
  // nearest heading above it, which we link straight to.
  const anchors = (d.anchors || [])
    .filter((a: any) => a.id && typeof a.location === "number")
    .sort((a: any, b: any) => a.location - b.location);
  const headingById: Record<string, string> = {}; // readable section titles come from sub_results
  for (const sr of d.sub_results || []) {
    const h = (sr.url || "").indexOf("#");
    if (h >= 0 && sr.title) headingById[sr.url.slice(h + 1)] = sr.title;
  }
  const sectionFor = (pos: number) => {
    let found = null;
    for (const a of anchors) {
      if (a.location > pos) break;
      found = a;
    }
    return found;
  };
  const prettify = (id: string) =>
    id.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  // Score clusters by Pagefind's match weights so the tightest / most relevant
  // match (e.g. an exact phrase) leads, rather than the first one in the page.
  const weighted = d.weighted_locations || [];
  const scoreByLoc: Record<number, number> = {};
  for (const w of weighted)
    scoreByLoc[w.location] = w.balanced_score || w.weight || 1;
  const positions = weighted.length
    ? weighted.map((w: any) => w.location)
    : d.locations || [];

  let hits = clusterLocations(positions)
    .map((cluster) => ({
      cluster,
      score: cluster.reduce((s, l) => s + (scoreByLoc[l] || 1), 0),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_SNIPPETS)
    .map(({ cluster }) => {
      const sec = sectionFor(cluster[0]);
      const heading = sec ? headingById[sec.id] || prettify(sec.id) : null;
      return {
        heading: heading && heading !== title ? heading : null,
        url: withHighlight(d.url + (sec ? "#" + sec.id : ""), query),
        excerptHtml: buildSnippet(words, cluster),
      };
    });

  // Fallback if the page exposed no match positions (e.g. meta-only match).
  if (!hits.length) {
    const excerptHtml = (d.excerpt || "")
      .replace(/<mark>/g, HL_OPEN)
      .replace(/<\/mark>/g, HL_CLOSE);
    hits = [{ heading: null, url: withHighlight(d.url, query), excerptHtml }];
  }
  return { title, url: d.url, type: typeFromUrl(d.url), hits };
}

// Build the renderer item shape for one articles.json entry (dev/offline
// fallback path). Shared by full-text search() and tag-filtered searchWithTags().
function buildFallbackItem(item: any, query: string) {
  return {
    title: item.title,
    url: item.link,
    type: item.hasOwnProperty("id")
      ? "Article"
      : item.hasOwnProperty("pid")
        ? "Post"
        : "Resource",
    topicsHtml:
      item.topics && item.topics.length
        ? highlight(item.topics.join(", "), query)
        : null,
    hits: [
      {
        heading: null,
        url: item.link,
        excerptHtml: item.description ? highlight(item.description, query) : "",
      },
    ],
  };
}

// Normalised item shape used by the renderer:
//   { title, url, type, hits: [{ heading, url, excerptHtml }], topicsHtml? }
async function search(query: string) {
  const engine = await getEngine();

  if (engine.kind === "pagefind") {
    // Pagefind's debouncedSearch resolves to null when superseded by a newer call.
    const result = await engine.pagefind.debouncedSearch(query, {}, 180);
    if (!result) return null;
    const datas = await Promise.all(result.results.map((r: any) => r.data()));
    return {
      total: result.results.length,
      items: datas.map((d) => buildPageItem(d, query)),
    };
  }

  if (engine.kind === "fallback") {
    const q = query.toLowerCase();
    // Title-only: Pagefind handles full-text; this fallback just matches titles.
    const filtered = engine.suggestions.filter((item: any) =>
      item.title.toLowerCase().includes(q),
    );
    return {
      total: filtered.length,
      items: filtered.map((item: any) => buildFallbackItem(item, query)),
    };
  }

  return { total: 0, items: [] };
}

// Search constrained to the active tags. AND semantics: a page must carry
// every active tag — matching the old /tags page. For Pagefind we run one
// filtered search per tag and intersect by id. Called only with a non-empty
// tag list (the tags menu has no text input), so there's no query to apply.
async function searchWithTags(activeTags: string[]) {
  const engine = await getEngine();

  if (engine.kind === "pagefind") {
    const perTag = await Promise.all(
      activeTags.map((t) =>
        engine.pagefind.search(null, { filters: { topic: t } }),
      ),
    );
    let common = perTag[0].results;
    for (let i = 1; i < perTag.length; i++) {
      const ids = new Set(perTag[i].results.map((r: any) => r.id));
      common = common.filter((r: any) => ids.has(r.id));
    }
    const datas = await Promise.all(common.map((r: any) => r.data()));
    return {
      total: common.length,
      items: datas.map((d) => buildPageItem(d, "")),
    };
  }

  if (engine.kind === "fallback") {
    const filtered = (engine.taggable || []).filter((item: any) =>
      activeTags.every((t) => (item.topics || []).includes(t)),
    );
    return {
      total: filtered.length,
      items: filtered.map((item: any) => buildFallbackItem(item, "")),
    };
  }

  return { total: 0, items: [] };
}

// --- Parameterized renderers (shared by the search bar + the tags menu) ---

function showLoading(dd: HTMLElement) {
  dd.innerHTML = "";
  const el = document.createElement("div");
  el.className = "search-loading";
  el.textContent = "Loading…";
  dd.appendChild(el);
  dd.style.display = "block";
}

// Clear a dropdown's contents and hide it.
function hideDropdown(dd: HTMLElement) {
  dd.innerHTML = "";
  dd.style.display = "none";
}

// Call onOutside() when a document click lands outside every element in
// insideEls. Guards against a detached target: toggling a chip re-renders the
// panel, detaching the clicked chip before this bubbles up, and a detached
// node isn't a real "outside" click.
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

// Tag chip cloud: every tag with its count, active ones highlighted. Clicking a
// chip calls onToggle(tag); the Clear button calls onClear(). Appended to `dd`.
function appendTagPanel(
  dd: HTMLElement,
  facets: Record<string, number>,
  activeTags: string[],
  onToggle: (tag: string) => void,
  onClear: () => void,
) {
  const panel = document.createElement("div");
  panel.className = "search-tag-panel";

  const head = document.createElement("div");
  head.className = "search-tag-head";
  const label = document.createElement("span");
  label.textContent = activeTags.length ? "Filtering by tag" : "Browse by tag";
  head.appendChild(label);

  if (activeTags.length) {
    const clear = document.createElement("button");
    clear.type = "button";
    clear.className = "search-tag-clear";
    clear.textContent = "Clear";
    // Don't let the mousedown steal focus / trigger a blur-close.
    clear.addEventListener("mousedown", (e) => e.preventDefault());
    clear.addEventListener("click", onClear);
    head.appendChild(clear);
  }
  panel.appendChild(head);

  const chips = document.createElement("div");
  chips.className = "search-tag-chips";
  Object.keys(facets)
    .sort((a, b) => a.localeCompare(b))
    .forEach((tag) => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "search-tag-chip";
      if (activeTags.includes(tag)) chip.classList.add("active");
      chip.innerHTML = `${escapeHtml(tag)} <span class="search-tag-count">[${facets[tag]}]</span>`;
      chip.addEventListener("mousedown", (e) => e.preventDefault());
      chip.addEventListener("click", () => onToggle(tag));
      chips.appendChild(chip);
    });
  panel.appendChild(chips);
  dd.appendChild(panel);
}

// Build the click handler that opens a result: same-page matches scroll in
// place; everything else opens in a new tab. Clears `dd` and runs onDone.
function makeGo(dd: HTMLElement, onDone?: () => void) {
  return (url: string) => {
    const dest = new URL(url, location.href);
    const samePage =
      dest.pathname.replace(/\/+$/, "") === location.pathname.replace(/\/+$/, "");
    if (samePage && typeof window.__pagefindGoInPage === "function") {
      window.__pagefindGoInPage(url);
    } else {
      window.open(url, "_blank");
    }
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

// --- The tags menu: a dedicated dropdown of tag chips + filtered posts. ---

function setupTagsMenu(tagsBtn: HTMLElement, tagsDropdown: HTMLElement) {
  const tagsOverlay = document.getElementById("tagsOverlay");
  // Tags currently selected; results must match ALL of them.
  let activeTags: string[] = [];
  // Monotonic token: each render() bumps it so a slower, superseded run (e.g. an
  // in-flight tag search that resolves after the user has already unselected the
  // tag) bails out instead of clobbering the newer render.
  let seq = 0;
  let open = false;

  const go = makeGo(tagsDropdown, () => {
    activeTags = [];
    close();
  });

  function openMenu() {
    open = true;
    tagsBtn.classList.add("active");
    if (tagsOverlay) tagsOverlay.style.display = "block";
    render();
  }

  function close() {
    open = false;
    tagsBtn.classList.remove("active");
    hideDropdown(tagsDropdown);
    if (tagsOverlay) tagsOverlay.style.display = "none";
  }

  function toggleTag(tag: string) {
    const i = activeTags.indexOf(tag);
    if (i === -1) activeTags.push(tag);
    else activeTags.splice(i, 1);
    render();
  }

  function clearTags() {
    activeTags = [];
    render();
  }

  async function render() {
    const mySeq = ++seq;
    // On a cold first open, getFacets() boots Pagefind (fetching its JS +
    // filter-index chunks), which can take a moment — show a loading state so
    // the panel gives feedback. If the facets are already warm the resolve
    // happens in the same task, so this loading DOM is replaced before any
    // paint (no flash). On re-render (toggling a tag) the chips are already
    // present, so we keep them visible instead of flashing to "Loading…".
    if (!tagsDropdown.querySelector(".search-tag-chip")) showLoading(tagsDropdown);
    const facets = await getFacets();
    if (mySeq !== seq) return; // superseded while facets loaded

    // Phase 1: paint the chip cloud immediately so chips show without waiting
    // on the (slower) filtered search below.
    tagsDropdown.innerHTML = "";
    appendTagPanel(tagsDropdown, facets, activeTags, toggleTag, clearTags);
    tagsDropdown.style.display =
      Object.keys(facets).length || activeTags.length ? "block" : "none";

    if (!activeTags.length) return;

    // Phase 2: the filtered results below the chips. Pagefind fetches an index
    // chunk per tag, so this is slow enough to need feedback: pulse the chips
    // being filtered on and show the search bar's "Loading…" row underneath.
    // Both are delayed slightly so a fast (warm-index) filter doesn't flicker.
    const activeChips = [
      ...tagsDropdown.querySelectorAll<HTMLElement>(".search-tag-chip.active"),
    ];
    const loadingRow = document.createElement("div");
    loadingRow.className = "search-loading";
    loadingRow.textContent = "Loading…";
    const loadingTimer = setTimeout(() => {
      if (mySeq !== seq) return;
      activeChips.forEach((chip) => chip.classList.add("loading"));
      tagsDropdown.appendChild(loadingRow);
    }, 150);

    const result = await searchWithTags(activeTags);
    clearTimeout(loadingTimer);
    // Safe even when superseded: a newer render has already detached these.
    activeChips.forEach((chip) => chip.classList.remove("loading"));
    loadingRow.remove();
    // Superseded (e.g. the tag was unselected) => bail so this stale result
    // can't overwrite the current render.
    if (mySeq !== seq) return;
    if (!result) return;

    // Append the results beneath the chip cloud phase 1 already painted — this
    // render wasn't superseded, so there's no need to rebuild the panel.
    if (!result.items.length) {
      const none = document.createElement("div");
      none.className = "search-count";
      none.textContent = "No results for the selected tags";
      tagsDropdown.appendChild(none);
    } else {
      appendResults(tagsDropdown, "", result.total, result.items, go);
    }
  }

  tagsBtn.addEventListener("click", (event) => {
    event.preventDefault();
    if (open) close();
    else openMenu();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && open) close();
  });

  // Close on a click outside the button/dropdown — this also covers the
  // dimming overlay. Guarded by `open` so it's a no-op when already closed.
  onOutsideClick([tagsBtn, tagsDropdown], () => {
    if (open) close();
  });
}

export function initSearch() {
  initSearchBarChrome();

  const searchBars = [
    ...document.querySelectorAll<HTMLInputElement>("#searchBar, #searchBarMobile"),
  ];
  const dropdown = document.getElementById("autocomplete-dropdown");
  const tagsBtn = document.getElementById("tagsBtn");
  const tagsDropdown = document.getElementById("tags-dropdown");

  if (!searchBars.length || !dropdown) {
    console.log("Search bar or dropdown element not found");
    return;
  }

  setupSearch(searchBars, dropdown);

  if (tagsBtn && tagsDropdown) {
    setupTagsMenu(tagsBtn, tagsDropdown);
    // Warm the tag facets during idle time so the chip cloud is ready instantly
    // on first open, instead of cold-loading Pagefind on the click. getFacets()
    // is memoized, so the later open reuses this result. Fire-and-forget.
    const warmFacets = () => getFacets().catch(() => {});
    if ("requestIdleCallback" in window) {
      requestIdleCallback(warmFacets, { timeout: 2500 });
    } else {
      setTimeout(warmFacets, 1200);
    }
  }
}
