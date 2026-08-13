/**
 * src/utils/toc.ts
 * ================
 * Builds a Table of Contents from already-rendered page HTML, so pages never
 * have to repeat their section list by hand.
 *
 * How a heading gets into the TOC
 * ------------------------------
 * Every `<h2>`–`<h3>` (configurable) in the page body becomes an entry, as long
 * as an anchor can be found for it:
 *
 *   1. an `id` on the heading itself   -> `<h2 id="books">Books</h2>`
 *   2. otherwise, the `id` of the innermost enclosing `<section>` that no
 *      earlier heading has already claimed:
 *          <section id="analysis"><h2>Data Analysis</h2> ...
 *
 * A heading with no anchor is skipped: a TOC row that can't be linked is dead
 * weight. Nesting follows heading level (h3 nests under the preceding h2), not
 * DOM nesting, which matches how the articles are actually written.
 *
 * Overrides, on a heading or on a `<section>`:
 *   data-toc="Short label"   -> use this text instead of the heading text; on a
 *                               section with no heading of its own (e.g. one
 *                               holding a `<Problem>`), this is what puts it in
 *                               the TOC at all
 *   data-toc="skip"          -> leave it out
 *
 * Only the *rendered* HTML is inspected, so headings produced by components or
 * `.map()` loops are picked up like any other, and commented-out markup is not.
 */

export interface TocItem {
  label: string;
  href?: string;
  children?: TocItem[];
}

export interface TocOptions {
  /** Shallowest heading level to include (default 2, i.e. `<h2>`). */
  minLevel?: number;
  /** Deepest heading level to include (default 3, i.e. `<h3>`). */
  maxLevel?: number;
}

/** One `<section>` currently open in the token stream. */
interface OpenSection {
  id: string | null;
  /** True once an entry has taken this section's id as its anchor. */
  claimed: boolean;
  skip: boolean;
}

const TOKEN =
  /<section\b([^>]*)>|<\/section\s*>|<(h[1-6])\b([^>]*)>([\s\S]*?)<\/\2\s*>/gi;

/** Reads one attribute out of a raw tag-attribute string. */
function attr(attrs: string, name: string): string | null {
  const m = attrs.match(
    new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"),
  );
  if (!m) return null;
  return m[2] ?? m[3] ?? m[4] ?? "";
}

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

/** Heading markup -> plain text: drop tags, decode entities, collapse space. */
export function headingText(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&([a-z]+);/gi, (m, name) => ENTITIES[name.toLowerCase()] ?? m)
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Scans rendered HTML and returns the nested TOC entries.
 * Safe on malformed markup: unmatched `</section>` tags are ignored.
 */
export function extractToc(html: string, options: TocOptions = {}): TocItem[] {
  const { minLevel = 2, maxLevel = 3 } = options;

  const stack: OpenSection[] = [];
  const roots: TocItem[] = [];
  /** Deepest entry seen at each level, so children can be attached to it. */
  const openByLevel = new Map<number, TocItem>();

  /** Files the entry under the closest shallower entry, or at the top. */
  function add(level: number, item: TocItem): void {
    let parent: TocItem | null = null;
    for (let l = level - 1; l >= minLevel; l--) {
      const candidate = openByLevel.get(l);
      if (candidate) {
        parent = candidate;
        break;
      }
    }

    if (parent) {
      (parent.children ??= []).push(item);
    } else {
      roots.push(item);
    }

    openByLevel.set(level, item);
    // A new entry at this level ends any deeper ones.
    for (let l = level + 1; l <= maxLevel; l++) openByLevel.delete(l);
  }

  /**
   * Level a section-labelled entry sits at: one below the heading it falls
   * under, so a run of such sections stays a flat list of siblings.
   */
  let openHeadingLevel = minLevel - 1;
  const nestedLevel = () => Math.max(minLevel, openHeadingLevel + 1);

  // Commented-out markup is not part of the page, so it is not in the TOC.
  const source = html.replace(/<!--[\s\S]*?-->/g, "");

  TOKEN.lastIndex = 0;
  let token: RegExpExecArray | null;

  while ((token = TOKEN.exec(source)) !== null) {
    const [, sectionAttrs, tag, headingAttrs, inner] = token;

    if (sectionAttrs !== undefined) {
      const id = attr(sectionAttrs, "id");
      const toc = attr(sectionAttrs, "data-toc");
      const section: OpenSection = {
        id,
        claimed: false,
        skip: toc === "skip",
      };
      stack.push(section);

      // An explicit label puts the section in the TOC on its own, whether or
      // not it contains a heading.
      if (toc && !section.skip && id) {
        const level = nestedLevel();
        if (level <= maxLevel) {
          section.claimed = true;
          add(level, { label: toc, href: `#${id}` });
        }
      }
      continue;
    }

    if (!tag) {
      // `</section>`
      stack.pop();
      continue;
    }

    const level = Number(tag[1]);
    if (level < minLevel || level > maxLevel) continue;

    const ownToc = attr(headingAttrs, "data-toc");
    if (ownToc === "skip") continue;

    // Find the anchor: own id first, then the nearest unclaimed section id.
    let href = attr(headingAttrs, "id");
    let section: OpenSection | null = null;
    if (!href) {
      for (let i = stack.length - 1; i >= 0; i--) {
        if (stack[i].id && !stack[i].claimed) {
          section = stack[i];
          href = section.id;
          section.claimed = true;
          break;
        }
      }
    }
    if (!href) continue;
    if (section?.skip) continue;

    const label = ownToc ?? headingText(inner);
    if (!label) continue;

    openHeadingLevel = level;
    add(level, { label, href: `#${href}` });
  }

  return roots;
}
