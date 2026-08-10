/**
 * repoStats.ts
 * ============
 * Build-time repository statistics for the "Website's Data" sidebar panel
 * (see HighlightsAndAttribute.astro).
 *
 * This used to be a client-side job: scripts.js hit the GitHub API on every page
 * load for the commit count / repo age / file tree, and read the last commit out
 * of `public/assets/json/latest_commit.json`, which a bot workflow committed back
 * to the repo every hour. Astro builds in Node inside a real checkout, so the
 * same numbers can just be read from git at build time — no API rate limits for
 * visitors, no bot commits, and the file-size heuristic can be replaced with an
 * actual line count.
 *
 * Requires an unshallow checkout (`fetch-depth: 0`) for the commit count and the
 * repository age; see .github/workflows/static-pages.yml. Every stat degrades to
 * a placeholder rather than failing the build.
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

/** Author name used by the (now removed) latest-commit workflow. Its commits are
 *  still in history, so they are discounted to keep "Total Updates" honest. */
const BOT_AUTHOR = "github-actions";

/** Binary/asset files have no meaningful line count. */
const BINARY_EXTENSIONS = [
  ".jpg", ".jpeg", ".png", ".gif", ".svg", ".webp", ".ico", ".bmp",
  ".pdf", ".woff", ".woff2", ".ttf", ".otf", ".eot", ".mp4", ".webm",
];

/** Machine-generated, and big enough to dominate the total. */
const GENERATED_FILES = ["package-lock.json"];

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

/** Commits authored by a human, i.e. total history minus the bot's commits. */
function totalUpdates(): string {
  const total = git("rev-list", "--count", "HEAD");
  const bot = git("rev-list", "--count", "HEAD", `--author=${BOT_AUTHOR}`);
  if (total === null) return UNAVAILABLE;
  const count = Number(total) - Number(bot ?? 0);
  return count.toLocaleString("en-US");
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

/** Time between the root commit and now, as "N years, M months". */
function repositoryAge(): string {
  // --reverse prints oldest first, so the first line is the root commit.
  const dates = git("log", "--format=%aI", "--reverse");
  if (!dates) return UNAVAILABLE;

  const created = new Date(dates.split("\n")[0]);
  const days = Math.floor((Date.now() - created.getTime()) / 86_400_000);
  const years = Math.floor(days / 365);
  const months = Math.floor((days % 365) / 30);
  return years > 0
    ? `${years} year${years > 1 ? "s" : ""}, ${months} month${months !== 1 ? "s" : ""}`
    : `${months} month${months !== 1 ? "s" : ""}`;
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
  return {
    totalUpdates: totalUpdates(),
    linesOfCode: linesOfCode(),
    repositoryAge: repositoryAge(),
    lastUpdated: commit.date,
    lastCommitMessage: commit.message,
  };
}
