/**
 * repoStats.ts
 * ============
 * Repository statistics for the "Website's Data" sidebar panel, read from git
 * at build time. Needs a full checkout (`fetch-depth: 0` in
 * .github/workflows/static-pages.yml); each stat falls back to a placeholder
 * rather than failing the build.
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

/** Bot commits in history, excluded from the counts. */
const BOT_AUTHOR = "github-actions";

/** Binary/asset files have no meaningful line count. */
const BINARY_EXTENSIONS = [
  ".jpg", ".jpeg", ".png", ".gif", ".svg", ".webp", ".ico", ".bmp",
  ".pdf", ".woff", ".woff2", ".ttf", ".otf", ".eot", ".mp4", ".webm",
];

/** Machine-generated, and big enough to dominate the total. */
const GENERATED_FILES = ["package-lock.json"];

/** Paths holding reader-facing content, in the current layout and in the
 *  older top-level layout that is still in git history. */
const CONTENT_PATHS = [
  "src/pages",
  "src/data/pages.json",
  "public/articles",
  "public/posts",
  "public/about",
  "public/media/Images",
  // Older layout.
  "index.html",
  "articles",
  "posts",
  "blogs",
  "about",
  "notes",
  "privacy-policy",
  "recommended-materials",
];

/** Under `src/pages`, these are scaffolding rather than something you read:
 *  the article/post layout templates, the scratch pages, the RSS route and the
 *  404. Git exclude pathspecs, so they subtract from CONTENT_PATHS above. */
const CONTENT_EXCLUDES = [
  ":!src/pages/template",
  ":!src/pages/test",
  ":!src/pages/rss",
  ":!src/pages/404.astro",
];

const UNAVAILABLE = "unavailable";

/** Run a git command, returning null instead of throwing when git is missing,
 *  the directory is not a repo, or the command fails. */
function git(...args: string[]): string | null {
  try {
    return execFileSync("git", args, {
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return null;
  }
}

/** Commits authored by a human, i.e. total history minus the bot's commits,
 *  optionally narrowed to a git pathspec. Null when git could not answer. */
function humanCommits(...pathspec: string[]): number | null {
  const scope = pathspec.length > 0 ? ["--", ...pathspec] : [];
  const total = git("rev-list", "--count", "HEAD", ...scope);
  if (total === null) return null;
  const bot = git("rev-list", "--count", "HEAD", `--author=${BOT_AUTHOR}`, ...scope);
  return Number(total) - Number(bot ?? 0);
}

/** A count as "1,234", or the placeholder when it could not be read. */
function formatCount(count: number | null): string {
  return count === null ? UNAVAILABLE : count.toLocaleString("en-US");
}

/** Newline count across tracked text files. */
function linesOfCode(): string {
  const tracked = git("ls-files");
  if (tracked === null) return UNAVAILABLE;

  let lines = 0;
  for (const path of tracked.split("\n")) {
    const lower = path.toLowerCase();
    if (BINARY_EXTENSIONS.some((ext) => lower.endsWith(ext))) continue;
    if (GENERATED_FILES.some((name) => lower.endsWith(name))) continue;
    try {
      // Count newline bytes directly: same semantics as `wc -l`, and avoids
      // decoding files that turn out not to be UTF-8 text after all.
      const buffer = readFileSync(path);
      for (const byte of buffer) if (byte === 0x0a) lines++;
    } catch {
      // Listed in the index but not on disk (e.g. a deleted-but-unstaged file).
    }
  }
  return lines.toLocaleString("en-US");
}

/** "3 days", "1 day", etc. — a count with its unit pluralised. */
function plural(count: number, unit: string): string {
  return `${count} ${unit}${count === 1 ? "" : "s"}`;
}

/** Time between the root commit and now, as "N years, M months, K days".
 *  Units that are zero are dropped, except when every one of them is: a
 *  same-day repository reads "0 days" rather than an empty string. */
function repositoryAge(): string {
  // --reverse prints oldest first, so the first line is the root commit.
  const dates = git("log", "--format=%aI", "--reverse");
  if (!dates) return UNAVAILABLE;

  const created = new Date(dates.split("\n")[0]);
  const total = Math.floor((Date.now() - created.getTime()) / 86_400_000);
  const years = Math.floor(total / 365);
  const months = Math.floor((total % 365) / 30);
  const days = (total % 365) % 30;

  const parts = [
    [years, "year"],
    [months, "month"],
    [days, "day"],
  ] as const;
  const shown = parts.filter(([count]) => count > 0);
  return shown.length > 0
    ? shown.map(([count, unit]) => plural(count, unit)).join(", ")
    : plural(0, "day");
}

/** Date + subject of the most recent commit that the bot did not author. */
function latestCommit(): { date: string; message: string } {
  // Unit/record separators keep subjects containing whitespace intact.
  const log = git("log", "-30", "--format=%aI%x1f%an%x1f%s%x1e");
  if (!log) return { date: UNAVAILABLE, message: UNAVAILABLE };

  for (const record of log.split("\x1e")) {
    const entry = record.trim();
    if (!entry) continue;
    const [date, author, message] = entry.split("\x1f");
    if (author === BOT_AUTHOR) continue;
    return { date: formatPacific(date), message };
  }
  return { date: UNAVAILABLE, message: UNAVAILABLE };
}

/** ISO timestamp → "Aug 5, 2026, 1:02 AM (PDT)", in the site's home timezone. */
function formatPacific(iso: string): string {
  const timeZone = "America/Los_Angeles";
  const date = new Date(iso);

  const day = date.toLocaleDateString("en-US", {
    timeZone,
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const time = date.toLocaleTimeString("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  });
  // PST vs PDT depends on the date, so read the abbreviation back off the parts.
  const zone =
    new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "short" })
      .formatToParts(date)
      .find((part) => part.type === "timeZoneName")?.value ?? "PT";

  return `${day}, ${time} (${zone})`;
}

export interface RepoStats {
  totalUpdates: string;
  contentUpdates: string;
  codeUpdates: string;
  linesOfCode: string;
  repositoryAge: string;
  lastUpdated: string;
  lastCommitMessage: string;
}

export function getRepoStats(): RepoStats {
  if (git("rev-parse", "--is-shallow-repository") === "true") {
    console.warn(
      "[repoStats] Shallow checkout: commit count and repository age will be " +
        "wrong. Set `fetch-depth: 0` on the actions/checkout step.",
    );
  }

  const commit = latestCommit();
  const total = humanCommits();
  const content = humanCommits(...CONTENT_PATHS, ...CONTENT_EXCLUDES);
  // Everything the other two counts leave over: the commits that touched no
  // content path at all — components, styling, build config, tooling, docs. A
  // commit that revises a page *and* the code behind it is content, so the two
  // buckets never overlap and always add back up to the total.
  const code = total !== null && content !== null ? total - content : null;

  return {
    totalUpdates: formatCount(total),
    contentUpdates: formatCount(content),
    codeUpdates: formatCount(code),
    linesOfCode: linesOfCode(),
    repositoryAge: repositoryAge(),
    lastUpdated: commit.date,
    lastCommitMessage: commit.message,
  };
}
