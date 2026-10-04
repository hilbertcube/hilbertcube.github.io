/**
 * references.ts
 * =============
 * Types for each article's `_references.ts` and the formatter behind
 * `<References>`. Each `type` has its own required fields (a type error if
 * missing); `authors` is a list of printed names, titles print as written,
 * page ranges get an en dash, `edition: 4` → "4th edition", `doi` → doi.org link.
 */

type Authors = string | string[];
type Pages = string | number;

interface Common {
  /** Names as they should print, in order. Omit for unsigned pages. */
  authors?: Authors;
  title: string;
  year?: number;
  /** A sentence placed before the link, e.g. "CUDA module documentation:". */
  note?: string;
  /** Linked in the citation. Ignored when `doi` is set. */
  url?: string;
  /** e.g. "10.1109/ICCV.2011.6126544"; linked through https://doi.org. */
  doi?: string;
  /** When a web source was last checked, as an ISO date ("2024-05-26"). */
  accessed?: string;
}

/** A paper in a journal. */
export interface ArticleRef extends Common {
  type: "article";
  journal: string;
  volume?: string | number;
  issue?: string | number;
  pages?: Pages;
}

/** A paper in conference or workshop proceedings. */
export interface ProceedingsRef extends Common {
  type: "inproceedings";
  /** The proceedings' name, printed in italics after "In". */
  proceedings: string;
  pages?: Pages;
  /** Where the conference was held, or the publisher's city. */
  location?: string;
  publisher?: string;
}

/** A whole book. The title prints in italics. */
export interface BookRef extends Common {
  type: "book";
  publisher?: string;
  location?: string;
  edition?: number;
}

/** A chapter or page range of a book. */
export interface ChapterRef extends Common {
  type: "chapter";
  /** The book the chapter is from, if it has a different title. */
  book?: string;
  pages?: Pages;
  publisher?: string;
  location?: string;
  edition?: number;
}

/** A thesis or dissertation. The title prints in italics. */
export interface ThesisRef extends Common {
  type: "thesis";
  /** "PhD", "Master's", ... — printed as "PhD thesis". */
  degree: string;
  institution: string;
  location?: string;
}

/** A report, preprint or lecture notes issued by an institution. */
export interface ReportRef extends Common {
  type: "report";
  institution?: string;
  pages?: Pages;
  location?: string;
}

/** A web page or online documentation. */
export interface WebRef extends Common {
  type: "web";
  /** The site or organisation it belongs to, if not obvious from the title. */
  site?: string;
}

export type Reference =
  | ArticleRef
  | ProceedingsRef
  | BookRef
  | ChapterRef
  | ThesisRef
  | ReportRef
  | WebRef;

/**
 * Wraps a page's `_references.ts` so each entry is checked against
 * `Reference` (and the editor autocompletes its fields). Keys become the
 * `#ref-<key>` anchors; entries are numbered in the order they are written.
 */
export function defineReferences<K extends string>(
  refs: Record<K, Reference>,
): Record<K, Reference> {
  return refs;
}

/** One run of citation text: plain, italic, or a link showing its URL. */
export type Segment = string | { em: string } | { href: string };

// A citation is a run of sentences; each sentence is clauses joined by ", ";
// each clause is one or more segments ("In " + italic proceedings name).
// An undefined clause is an absent field, dropped when the sentence is built.
type Clause = Segment[];
type Sentence = (Clause | undefined)[];

const text = (s: Segment) =>
  typeof s === "string" ? s : "em" in s ? s.em : s.href;

const formatPages = (p: Pages) => String(p).replace(/\s*-+\s*/g, "–");

const pagesClause = (p: Pages | undefined): Clause | undefined =>
  p === undefined
    ? undefined
    : [`${/[–,]/.test(formatPages(p)) ? "pages" : "page"} ${formatPages(p)}`];

function ordinal(n: number): string {
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return `${n}th`;
  return `${n}${({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[n % 10] ?? "th"}`;
}

function formatAuthors(authors: Authors): string {
  const names = typeof authors === "string" ? [authors] : authors;
  if (names.length <= 2) return names.join(" and ");
  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
}

/** Shorthand: a clause from plain text, skipped when the value is empty. */
const plain = (s: string | number | undefined): Clause | undefined =>
  s === undefined || s === "" ? undefined : [String(s)];

/** The sentences that differ by type, between the authors and the shared tail. */
function body(ref: Reference): Sentence[] {
  switch (ref.type) {
    case "article": {
      let numbering: Clause | undefined;
      if (ref.volume !== undefined) {
        const issue = ref.issue !== undefined ? `(${ref.issue})` : "";
        const pages = ref.pages !== undefined ? `:${formatPages(ref.pages)}` : "";
        numbering = [`${ref.volume}${issue}${pages}`];
      } else {
        numbering = pagesClause(ref.pages);
      }
      return [[[ref.title]], [[{ em: ref.journal }], numbering, plain(ref.year)]];
    }
    case "inproceedings": {
      const venue: Clause = ["In ", { em: ref.proceedings }];
      // With a publisher, "Springer, Berlin, 2006." reads as its own sentence.
      return ref.publisher
        ? [
            [[ref.title]],
            [venue, pagesClause(ref.pages)],
            [plain(ref.publisher), plain(ref.location), plain(ref.year)],
          ]
        : [
            [[ref.title]],
            [venue, pagesClause(ref.pages), plain(ref.location), plain(ref.year)],
          ];
    }
    case "book":
      return [
        [[{ em: ref.title }]],
        [
          plain(ref.publisher),
          plain(ref.location),
          ref.edition ? [`${ordinal(ref.edition)} edition`] : undefined,
          plain(ref.year),
        ],
      ];
    case "chapter":
      return [
        ref.book ? [[ref.title]] : [[ref.title], pagesClause(ref.pages)],
        ref.book ? [["In ", { em: ref.book }], pagesClause(ref.pages)] : [],
        [
          plain(ref.publisher),
          plain(ref.location),
          ref.edition ? [`${ordinal(ref.edition)} edition`] : undefined,
          plain(ref.year),
        ],
      ];
    case "thesis":
      return [
        [[{ em: ref.title }]],
        [[`${ref.degree} thesis`], [ref.institution], plain(ref.location), plain(ref.year)],
      ];
    case "report":
      return [
        [[ref.title]],
        [plain(ref.institution), pagesClause(ref.pages), plain(ref.location), plain(ref.year)],
      ];
    case "web":
      return [[[ref.title]], [plain(ref.site), plain(ref.year)]];
  }
}

/** The full citation for one entry, as segments ready to render. */
export function formatReference(ref: Reference): Segment[] {
  const link = ref.doi ? `https://doi.org/${ref.doi}` : ref.url;
  const sentences: Sentence[] = [
    [ref.authors ? [formatAuthors(ref.authors)] : undefined],
    ...body(ref),
    [plain(ref.note)],
  ];

  const out: Segment[] = [];
  const push = (segs: Segment[]) => {
    if (out.length) out.push(" ");
    out.push(...segs);
  };

  for (const sentence of sentences) {
    const clauses = sentence.filter((c): c is Clause => !!c && c.length > 0);
    if (!clauses.length) continue;
    const segs: Segment[] = clauses.flatMap((c, i) => (i ? [", ", ...c] : c));
    // Close the sentence unless it already ends in punctuation ("…?", "…:").
    if (!/[.?!:]$/.test(text(segs[segs.length - 1]))) segs.push(".");
    push(segs);
  }
  // The link is left bare: a trailing period would read as part of the URL.
  if (link) push([{ href: link }]);
  if (ref.accessed) push([`Accessed: ${ref.accessed}.`]);
  return out;
}
