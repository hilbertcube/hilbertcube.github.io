/**
 * content.config.ts
 * =================
 * Typed, validated data collections layered over the hand-edited catalog at
 * `src/data/pages.json` (also read by the search fallback / tag-browse
 * panel, and appended to by the new-article.sh script). These collections give
 * the build-time consumers (ArticleCards, PostList, HighlightsAndAttribute, the
 * RSS feed, and each article/post page) type-safe access via getCollection(),
 * and a Zod schema that fails the build on a missing/malformed entry instead of
 * silently dropping it.
 */
import { defineCollection, z } from "astro:content";
import { file } from "astro/loaders";

const JSON_PATH = "src/data/pages.json";

// Shared fields every catalog entry carries.
const common = {
  title: z.string(),
  link: z.string(),
  topics: z.array(z.string()),
  description: z.string(),
};

// Every entry carries a single ISO date (YYYY-MM-DD) — the source of truth for
// both display (formatted via src/utils/formatDate.ts) and the RSS feed's
// <pubDate>.
const pubDate = { pubDate: z.string() };

// The file() loader needs a unique `id` per entry. `link` is already the
// catalog's primary key — getEntryMeta matches each page to its entry by link —
// so every collection derives its id from that rather than carrying a second
// identifier. The id is not declared in the schemas below, so Zod strips it and
// `entry.data` stays exactly the catalog's own fields.
const keyByLink = (entries: Record<string, unknown>[]) =>
  entries.map((e) => ({ ...e, id: e.link }));

const articles = defineCollection({
  loader: file(JSON_PATH, {
    parser: (text) => keyByLink(JSON.parse(text).articles),
  }),
  schema: z.object({
    ...common,
    ...pubDate,
    image: z.string(),
  }),
});

const posts = defineCollection({
  loader: file(JSON_PATH, {
    parser: (text) => keyByLink(JSON.parse(text).posts),
  }),
  schema: z.object({
    ...common,
    ...pubDate,
  }),
});

// Standing pages (About, License, the repo link) — same shape as posts; the
// date is when the page itself was last revised rather than a publish date.
const others = defineCollection({
  loader: file(JSON_PATH, {
    parser: (text) => keyByLink(JSON.parse(text).others),
  }),
  schema: z.object({
    ...common,
    ...pubDate,
  }),
});

export const collections = { articles, posts, others };
