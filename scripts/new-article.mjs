#!/usr/bin/env node
/**
 * new-article.mjs
 * ===============
 * Scaffold an article or post: `src/pages/<type>s/<slug>/index.astro` in the
 * canonical shape (docs/COMPONENTS.md §8), its image folder under `public/`,
 * and its `pages.json` entry at the top of the array (today's `pubDate`).
 *
 *   npm run new                                          # prompts for what's missing
 *   npm run new -- -t article -s my-slug --title "My Title" --topics "C++, Math"
 */
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline/promises";
import { parseArgs } from "node:util";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const JSON_PATH = path.join(ROOT, "src/data/pages.json");

const USAGE = `Usage: npm run new -- [options]

  -t, --type <article|post>
  -s, --slug <slug>            lowercase letters, digits and hyphens
      --title <title>          defaults to the slug in Title Case
      --short-title <title>    browser-tab title, if --title is long
      --topics <a, b, …>       comma-separated
      --description <text>
      --references             also create an empty _references.ts
  -h, --help

Missing type/slug (and, interactively, the rest) are prompted for.`;

const fail = (msg) => {
  console.error(`\x1b[31m✗ ${msg}\x1b[0m`);
  process.exit(1);
};

let opts;
try {
  ({ values: opts } = parseArgs({
    options: {
      type: { type: "string", short: "t" },
      slug: { type: "string", short: "s" },
      title: { type: "string" },
      "short-title": { type: "string" },
      topics: { type: "string" },
      description: { type: "string" },
      references: { type: "boolean", default: false },
      help: { type: "boolean", short: "h" },
    },
  }));
} catch (e) {
  fail(`${e.message}\n\n${USAGE}`);
}
if (opts.help) {
  console.log(USAGE);
  process.exit(0);
}

// Prompt only for what wasn't passed; a fully scripted call never blocks.
const interactive = !opts.type || !opts.slug;
const rl = interactive
  ? readline.createInterface({ input: process.stdin, output: process.stdout })
  : null;
const ask = async (q) => (await rl.question(q)).trim();

while (opts.type !== "article" && opts.type !== "post") {
  if (!rl) fail(`--type must be "article" or "post"`);
  opts.type = (await ask("Type (article/post): ")).toLowerCase();
}
while (!opts.slug) {
  opts.slug = await ask("Slug (e.g. my-new-article): ");
}
if (rl) {
  opts.title ??= await ask("Title (Enter to derive from slug): ");
  opts["short-title"] ??= await ask("Tab title (Enter to use the title): ");
  opts.topics ??= await ask("Topics (comma-separated, optional): ");
  opts.description ??= await ask("Description (optional): ");
  rl.close();
}

const { type, slug } = opts;
if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
  fail(`Slug "${slug}" must be lowercase letters, digits and single hyphens`);
}

const title =
  opts.title ||
  slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
const topics = (opts.topics ?? "")
  .split(",")
  .map((t) => t.trim())
  .filter(Boolean);
const description = opts.description ?? "";

const collection = `${type}s`;
const link = `/${collection}/${slug}`;
const pageDir = path.join(ROOT, "src/pages", collection, slug);
const pagePath = path.join(pageDir, "index.astro");
const publicDir = path.join(ROOT, "public", collection, slug);

const data = JSON.parse(fs.readFileSync(JSON_PATH, "utf8"));
const linkTaken = Object.values(data).some((entries) =>
  entries.some((e) => e.link.replace(/\/$/, "") === link),
);
if (fs.existsSync(pageDir)) fail(`${path.relative(ROOT, pageDir)} already exists`);
if (linkTaken) fail(`pages.json already has an entry for ${link}`);

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
const rel = path.relative(ROOT, pagePath);
const isArticle = type === "article";

const imports = [
  `import BaseLayout from "@layouts/BaseLayout.astro";`,
  `import TopicTags from "@components/article/TopicTags.astro";`,
  `import PageTitle from "@components/article/PageTitle.astro";`,
  `import PubDate from "@components/article/PubDate.astro";`,
  isArticle && `import FrontImage from "@components/article/FrontImage.astro";`,
  opts.references && `import References from "@components/article/References.astro";`,
].filter(Boolean);

const page = `---
/**
 * ${rel}
 * ${"=".repeat(rel.length)}
 * ${isArticle ? "Article" : "Post"}: ${title}
 */
${imports.join("\n")}
---

<BaseLayout toc>
  <header>
    <TopicTags />
    <PageTitle />
    <PubDate />${isArticle ? `\n    <FrontImage src="/${collection}/${slug}/banner.webp" />` : ""}
  </header>

  <section>
    <h2>Introduction</h2>
    <p>Write here.</p>
  </section>${opts.references ? "\n\n  <References />" : ""}
</BaseLayout>
`;

const references = `import { defineReferences } from "@utils/references";

export default defineReferences({});
`;

// ---------------------------------------------------------------------------
// Catalog entry (same key order as the existing entries)
// ---------------------------------------------------------------------------
const d = new Date();
const pubDate = [
  d.getFullYear(),
  String(d.getMonth() + 1).padStart(2, "0"),
  String(d.getDate()).padStart(2, "0"),
].join("-");

const entry = {
  title,
  ...(opts["short-title"] && { shortTitle: opts["short-title"] }),
  ...(isArticle && { image: `${slug}.webp` }),
  link,
  topics,
  description,
  pubDate,
};
data[collection].unshift(entry);

fs.mkdirSync(pageDir, { recursive: true });
fs.mkdirSync(publicDir, { recursive: true });
fs.writeFileSync(pagePath, page);
if (opts.references) fs.writeFileSync(path.join(pageDir, "_references.ts"), references);
fs.writeFileSync(JSON_PATH, JSON.stringify(data, null, 2) + "\n");

const g = (s) => `\x1b[32m${s}\x1b[0m`;
const dim = (s) => `\x1b[2m${s}\x1b[0m`;
console.log(`${g("✓")} ${rel}`);
if (opts.references) console.log(`${g("✓")} ${path.relative(ROOT, pageDir)}/_references.ts`);
console.log(`${g("✓")} src/data/pages.json → ${collection}[0] (${link})`);
console.log(`\n${dim("Next:")}`);
console.log(`  images      public/${collection}/${slug}/  ${dim(`(served at /${collection}/${slug}/…)`)}`);
if (isArticle) {
  console.log(`  banner      public/${collection}/${slug}/banner.webp`);
  console.log(`  card image  public/media/Images/${slug}.webp  ${dim('(pages.json "image")')}`);
}
if (!description) console.log(`  description is empty in pages.json`);
console.log(`  preview     npm run dev → http://localhost:4321${link}`);
