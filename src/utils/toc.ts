/**
 * src/utils/toc.ts
 * ================
 * Builds the Table of Contents from rendered page HTML.
 *
 * Every `<h2>`–`<h4>` (configurable) becomes an entry, anchored to its own `id`
 * or else to the innermost enclosing `<section>` not yet claimed (ids generated
 * by assignSectionIds()). Unanchored headings are skipped. Nesting follows
 * heading level, not DOM nesting.
 *
 * Overrides on a heading or `<section>`:
 *   data-toc="Short label"   use this text; on a heading-less section, adds it
 *   data-toc="skip"          leave it out
 */

export interface TocItem {
  label: string;
  href?: string;
  children?: TocItem[];
}

export interface TocOptions {
  /** Shallowest heading level to include (default 2, i.e. `<h2>`). */
  minLevel?: number;
  /** Deepest heading level to include (default 4, i.e. `<h4>`). */
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

/** Heading text -> URL fragment: "Chladni's Law" -> "chladnis-law". */
export function slugify(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Gives every `<section>` without an `id` one derived from its label, so pages
 * never write section ids by hand. The label is the section's `data-toc` text
 * (unless "skip"), otherwise its first heading. A section with neither is left
 * alone. Ids already in the page (or handed out earlier) are never reused:
 * a clash gets `-2`, `-3`, … An `id` written in the markup still wins.
 *
 * Runs before `extractToc()`, so the TOC, the highlighter and Pagefind's
 * section anchors all see the generated ids.
 */
export function assignSectionIds(html: string): string {
  const comments: [number, number][] = [];
  for (const m of html.matchAll(/<!--[\s\S]*?-->/g)) {
    comments.push([m.index!, m.index! + m[0].length]);
  }
  const inComment = (i: number) => comments.some(([a, b]) => i >= a && i < b);

  const taken = new Set<string>();
  for (const m of html.matchAll(/\sid\s*=\s*["']([^"']+)["']/gi)) {
    taken.add(m[1]);
  }
  const unique = (base: string) => {
    let id = base;
    for (let n = 2; taken.has(id); n++) id = `${base}-${n}`;
    taken.add(id);
    return id;
  };

  /** Open sections still waiting for an id: where to write it. */
  const stack: { insertAt: number; pending: boolean }[] = [];
  const inserts: [number, string][] = [];
  const give = (insertAt: number, label: string) => {
    const base = slugify(label);
    if (!base) return false;
    inserts.push([insertAt, ` id="${unique(base)}"`]);
    return true;
  };

  TOKEN.lastIndex = 0;
  let token: RegExpExecArray | null;
  while ((token = TOKEN.exec(html)) !== null) {
    if (inComment(token.index)) continue;
    const [, sectionAttrs, tag, , inner] = token;

    if (sectionAttrs !== undefined) {
      const insertAt = token.index + "<section".length;
      let pending = attr(sectionAttrs, "id") === null;
      const toc = attr(sectionAttrs, "data-toc");
      if (pending && toc && toc !== "skip") pending = !give(insertAt, toc);
      stack.push({ insertAt, pending });
    } else if (!tag) {
      stack.pop(); // `</section>`
    } else {
      const open = stack[stack.length - 1];
      if (open?.pending) open.pending = !give(open.insertAt, headingText(inner));
    }
  }

  let out = html;
  for (const [at, text] of inserts.sort((a, b) => b[0] - a[0])) {
    out = out.slice(0, at) + text + out.slice(at);
  }
  return out;
}

/**
 * Scans rendered HTML and returns the nested TOC entries.
 * Safe on malformed markup: unmatched `</section>` tags are ignored.
 */
export function extractToc(html: string, options: TocOptions = {}): TocItem[] {
  const { minLevel = 2, maxLevel = 4 } = options;

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
