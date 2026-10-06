/**
 * src/utils/numbering.ts
 * ======================
 * Numbers a page's theorems, lemmas, definitions, problems, figures and tables
 * at build time, and resolves `<Ref to="…" />` cross-references to them.
 *
 * Numbered blocks, counted per kind in page order:
 *   - an element carrying `data-num="theorem|lemma|definition|problem"`
 *     (the math/ components emit it), referenced by its own `id`;
 *   - every `<figcaption>` (a figure without a caption isn't numbered),
 *     referenced by the `id` of its `<figure>`;
 *   - every `<caption>`, referenced by the `id` of its `<table>`.
 * Each gets `data-number="N"`, which the CSS label (`"Lemma " attr(data-number)`)
 * reads.
 *
 * `<a data-ref="id"></a>` (what `<Ref>` renders) becomes `<a href="#id">Lemma 3</a>`.
 * An unknown or duplicate id fails the build.
 *
 * A `<section>` with no heading and no `data-toc` is labelled after its first
 * numbered block (`data-toc="Problem 2"`), so the TOC needs no hand-typed number.
 *
 * Runs before assignSectionIds(); markup inside HTML comments is ignored.
 */

const LABELS = {
  theorem: "Theorem",
  lemma: "Lemma",
  definition: "Definition",
  problem: "Problem",
  figure: "Figure",
  table: "Table",
} as const;
type Kind = keyof typeof LABELS;

const TOKEN =
  /<(section|figure|table|figcaption|caption|h[1-6])\b([^>]*)>|<\/(section|figure|table)\s*>|<[a-z][\w-]*\b([^>]*\bdata-num="(\w+)"[^>]*)>/gi;

function attr(attrs: string, name: string): string | null {
  const m = attrs.match(new RegExp(`\\s${name}\\s*=\\s*"([^"]*)"`, "i"));
  return m ? m[1] : null;
}

const escapeAttr = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;");

interface OpenSection {
  insertAt: number;
  hasLabel: boolean;
  firstBlock: string | null;
}

export function numberBlocks(html: string, page: string): string {
  const comments: [number, number][] = [];
  for (const m of html.matchAll(/<!--[\s\S]*?-->/g)) {
    comments.push([m.index!, m.index! + m[0].length]);
  }
  const inComment = (i: number) => comments.some(([a, b]) => i >= a && i < b);

  const counts: Record<Kind, number> = {
    theorem: 0, lemma: 0, definition: 0, problem: 0, figure: 0, table: 0,
  };
  /** id -> "Lemma 3" */
  const labels = new Map<string, string>();
  const inserts: [number, string][] = [];
  const sections: OpenSection[] = [];
  /** id of the open <figure> / <table> waiting for its caption. */
  const pending: { figure: string | null; table: string | null } = { figure: null, table: null };

  const fail = (msg: string): never => {
    throw new Error(`numbering (${page}): ${msg}`);
  };
  const record = (id: string | null, label: string) => {
    if (!id) return;
    if (labels.has(id)) fail(`two numbered blocks have id="${id}"`);
    labels.set(id, label);
  };
  /** Numbers one block whose open tag ends at `tagEnd`; returns its label. */
  const number = (kind: Kind, tagEnd: number) => {
    const label = `${LABELS[kind]} ${++counts[kind]}`;
    inserts.push([tagEnd, ` data-number="${counts[kind]}"`]);
    const open = sections[sections.length - 1];
    if (open && !open.firstBlock) open.firstBlock = label;
    return label;
  };

  TOKEN.lastIndex = 0;
  let t: RegExpExecArray | null;
  while ((t = TOKEN.exec(html)) !== null) {
    if (inComment(t.index)) continue;
    const [whole, open, attrs = "", close, numAttrs, numKind] = t;
    const tagEnd = t.index + whole.length - (whole.endsWith("/>") ? 2 : 1);
    const name = (open ?? close ?? "").toLowerCase();

    if (numKind !== undefined) {
      if (!(numKind in LABELS) || numKind === "figure" || numKind === "table") {
        fail(`unknown data-num="${numKind}"`);
      }
      record(attr(numAttrs, "id"), number(numKind as Kind, tagEnd));
    } else if (close) {
      if (name === "section") {
        const s = sections.pop();
        if (s && !s.hasLabel && s.firstBlock) {
          inserts.push([s.insertAt, ` data-toc="${escapeAttr(s.firstBlock)}"`]);
        }
      } else {
        pending[name as "figure" | "table"] = null;
      }
    } else if (name === "section") {
      sections.push({
        insertAt: t.index + "<section".length,
        hasLabel: attr(attrs, "data-toc") !== null,
        firstBlock: null,
      });
    } else if (name[0] === "h") {
      for (const s of sections) s.hasLabel = true;
    } else if (name === "figure" || name === "table") {
      pending[name] = attr(attrs, "id");
    } else {
      const kind = name === "figcaption" ? "figure" : "table";
      record(pending[kind], number(kind, tagEnd));
      pending[kind] = null;
    }
  }

  let out = html;
  for (const [at, text] of inserts.sort((a, b) => b[0] - a[0])) {
    out = out.slice(0, at) + text + out.slice(at);
  }

  return out.replace(/<a data-ref="([^"]*)"><\/a>/g, (m, id: string, offset: number) => {
    // A <Ref> left in a comment would otherwise fail the build on a dead id.
    if (inCommentOut(out, offset)) return m;
    const label = labels.get(id);
    if (!label) {
      fail(
        `<Ref to="${id}"> matches no numbered block (figures and tables need a caption to be numbered)`,
      );
    }
    return `<a href="#${escapeAttr(id)}">${label}</a>`;
  });
}

function inCommentOut(html: string, offset: number): boolean {
  const open = html.lastIndexOf("<!--", offset);
  return open !== -1 && html.indexOf("-->", open) > offset;
}
