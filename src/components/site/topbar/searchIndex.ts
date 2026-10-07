/**
 * searchIndex.ts
 * ==============
 * The site's search index, shared by the search bar (search.ts) and the tags
 * panel (tags.ts): full-text search on the Pagefind index built into the
 * site, falling back to the pages.json metadata list under `astro dev` (where
 * no index exists); topic facets; and the result helpers both use.
 */

import { formatDate } from "@utils/formatDate";

const PAGEFIND_URL = "/pagefind/pagefind.js";

const HL_OPEN =
  '<span style="color: var(--panel-link); text-decoration: underline;">';
const HL_CLOSE = "</span>";

function escapeRegExp(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Highlight every case-insensitive occurrence of `query` in a PLAIN-TEXT string.
export function highlight(text: string, query: string) {
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
// in the built site, otherwise fall back to the pages.json metadata list so
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
    console.warn("Pagefind unavailable, falling back to pages.json:", err);
    try {
      // Dynamic import: the catalog is code-split and only fetched here.
      const data = (await import("@data/pages.json")).default;
      const suggestions = [
        ...(data.articles || []),
        ...(data.others || []),
        ...(data.posts || []),
      ];
      // Tags cover articles + posts only.
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

// --- Tag / topic facets (powers the tags panel's chips) ---
// Resolves { tag: count } once per page from whichever engine is live.
let facetsPromise: Promise<Record<string, number>> | null = null;
export function getFacets() {
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
  const date = (d.meta && d.meta.date) || null;
  return { title, url: d.url, type: typeFromUrl(d.url), date, hits };
}

// Build the renderer item shape for one pages.json entry (dev/offline
// fallback path). Shared by full-text search() and tag-filtered searchWithTags().
function buildFallbackItem(item: any, query: string) {
  return {
    title: item.title,
    url: item.link,
    type: typeFromUrl(item.link),
    date: item.pubDate ? formatDate(item.pubDate) : null,
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
//   { title, url, type, date, hits: [{ heading, url, excerptHtml }], topicsHtml? }
export async function search(query: string) {
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
// every active tag. For Pagefind we run one
// filtered search per tag and intersect by id. Called only with a non-empty
// tag list (the tags panel has no text input), so there's no query to apply.
export async function searchWithTags(activeTags: string[]) {
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

// --- Shared result helpers ---

export function loadingRow() {
  const el = document.createElement("div");
  el.className = "search-loading";
  el.textContent = "Loading…";
  return el;
}

// Open a result: a same-page match scrolls in place; anything else opens in
// a new tab.
export function openResult(url: string) {
  const dest = new URL(url, location.href);
  const samePage =
    dest.pathname.replace(/\/+$/, "") === location.pathname.replace(/\/+$/, "");
  if (samePage && typeof window.__pagefindGoInPage === "function") {
    window.__pagefindGoInPage(url);
  } else {
    window.open(url, "_blank");
  }
}
