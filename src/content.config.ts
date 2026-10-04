/**
 * content.config.ts
 * =================
 * Zod-validated collections over `src/data/pages.json`; a missing or malformed
 * entry fails the build.
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

// ISO date (YYYY-MM-DD), used on the page and in the RSS feed.
const pubDate = { pubDate: z.string() };

// The file() loader needs a unique `id`; use `link`, the catalog's primary key.
// It isn't in the schemas, so Zod strips it from `entry.data`.
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

// Standing pages (About, License, …); the date is the last revision.
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
