/**
 * tags.ts
 * =======
 * The tags panel: every topic as a chip, and the pages carrying all of the
 * selected ones. Facets and the filtered search come from searchIndex.ts.
 */

import { initPanel } from "./panel";
import {
  escapeHtml,
  getFacets,
  loadingRow,
  openResult,
  searchWithTags,
} from "./searchIndex";

export function initTagsPanel() {
  const chips = document.getElementById("tagsChips");
  const results = document.getElementById("tagsResults");
  const label = document.getElementById("tagsResultLabel");
  const hint = document.getElementById("tagsHint");
  const clear = document.getElementById("tagsClear");
  const total = document.getElementById("tagsTotal");
  if (!chips || !results || !label || !hint || !clear || !total) return;

  // Tags currently selected; results must match ALL of them.
  let activeTags: string[] = [];
  // Monotonic token: each render() bumps it so a slower, superseded run (e.g. an
  // in-flight tag search that resolves after the user has already unselected the
  // tag) bails out instead of clobbering the newer render.
  let seq = 0;

  const panel = initPanel("tagsBtn", "tagsPanel", render);
  if (!panel) return;

  function toggleTag(tag: string) {
    const i = activeTags.indexOf(tag);
    if (i === -1) activeTags.push(tag);
    else activeTags.splice(i, 1);
    render();
  }

  clear.addEventListener("click", () => {
    activeTags = [];
    render();
  });

  // Most-used topics first, then alphabetical.
  function renderChips(facets: Record<string, number>) {
    chips!.innerHTML = "";
    Object.keys(facets)
      .sort((a, b) => facets[b] - facets[a] || a.localeCompare(b))
      .forEach((tag) => {
        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = "tag-chip";
        chip.setAttribute("aria-pressed", String(activeTags.includes(tag)));
        chip.innerHTML = `${escapeHtml(tag)}<span class="tag-chip-count">${facets[tag]}</span>`;
        chip.addEventListener("click", () => toggleTag(tag));
        chips!.appendChild(chip);
      });
  }

  function appendResult(item: any) {
    const link = document.createElement("a");
    link.className = "tag-result";
    link.href = item.url;
    const title = document.createElement("span");
    title.className = "tag-result-title";
    title.textContent = item.title;
    const meta = document.createElement("span");
    meta.className = "tag-result-meta";
    meta.innerHTML =
      `<span class="tag-result-type">${item.type}</span>` +
      (item.date ? ` · ${escapeHtml(item.date)}` : "");
    link.append(title, meta);
    link.addEventListener("click", (event) => {
      event.preventDefault();
      openResult(item.url);
      activeTags = [];
      panel!.close();
    });
    results!.appendChild(link);
  }

  async function render() {
    const mySeq = ++seq;
    // On a cold first open, getFacets() boots Pagefind (fetching its JS +
    // filter-index chunks), which can take a moment — show a loading state.
    // Once chips exist they stay visible while re-rendering.
    if (!chips!.querySelector(".tag-chip")) chips!.replaceChildren(loadingRow());
    const facets = await getFacets();
    if (mySeq !== seq) return; // superseded while facets loaded

    // Phase 1: the chips, the header's Clear and the footer count, painted
    // without waiting on the (slower) filtered search below.
    renderChips(facets);
    total!.textContent = `${Object.keys(facets).length} topics`;
    clear!.hidden = !activeTags.length;
    clear!.textContent = `Clear (${activeTags.length})`;
    results!.innerHTML = "";
    hint!.hidden = activeTags.length > 0;
    const selection = activeTags.join(", ");
    label!.textContent = activeTags.length ? `Pages with all of: ${selection}` : "Pages";

    if (!activeTags.length) return;

    // Phase 2: the filtered pages. Pagefind fetches an index chunk per tag, so
    // pulse the selected chips and show "Loading…" — after a short delay, so a
    // fast (warm-index) filter doesn't flicker.
    const activeChips = [
      ...chips!.querySelectorAll<HTMLElement>('.tag-chip[aria-pressed="true"]'),
    ];
    const loading = loadingRow();
    const loadingTimer = setTimeout(() => {
      if (mySeq !== seq) return;
      activeChips.forEach((chip) => chip.classList.add("loading"));
      results!.appendChild(loading);
    }, 150);

    const result = await searchWithTags(activeTags);
    clearTimeout(loadingTimer);
    // Safe even when superseded: a newer render has already detached these.
    activeChips.forEach((chip) => chip.classList.remove("loading"));
    loading.remove();
    if (mySeq !== seq || !result) return;

    const n = result.items.length;
    label!.textContent = n
      ? `${n} page${n === 1 ? "" : "s"} with all of: ${selection}`
      : `No pages with all of: ${selection}`;
    result.items.forEach(appendResult);
  }

  // Warm the tag facets during idle time so the chips are ready instantly on
  // first open, instead of cold-loading Pagefind on the click. getFacets() is
  // memoized, so the later open reuses this result. Fire-and-forget.
  const warmFacets = () => getFacets().catch(() => {});
  if ("requestIdleCallback" in window) {
    requestIdleCallback(warmFacets, { timeout: 2500 });
  } else {
    setTimeout(warmFacets, 1200);
  }
}
