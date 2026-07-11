/**
 * content.config.ts
 * =================
 * Typed, validated data collections layered over the existing
 * `public/assets/json/articles.json`. The JSON file stays where it is (it is
 * still fetched at runtime by tags.js / the search fallback, and edited by the
 * new-article.sh / generate-rss.sh scripts). These collections give the
 * build-time consumers (ArticleCards, PostList, HighlightsAndAttribute, and each
 * article/post page) type-safe access via getCollection(), and a Zod schema that
 * fails the build on a missing/malformed entry instead of silently dropping it.
 */
import { defineCollection, z } from "astro:content";
import { file } from "astro/loaders";

const JSON_PATH = "public/assets/json/articles.json";

// Shared fields every catalog entry carries.
const common = {
  title: z.string(),
  link: z.string(),
  topics: z.array(z.string()),
  description: z.string(),
  date: z.string(),
};

const articles = defineCollection({
  loader: file(JSON_PATH, { parser: (text) => JSON.parse(text).articles }),
  schema: z.object({
    ...common,
    id: z.string(),
    image: z.string(),
  }),
});

const posts = defineCollection({
  // Posts key on `pid`; map it to `id` so the file() loader has a unique key.
  loader: file(JSON_PATH, {
    parser: (text) =>
      JSON.parse(text).posts.map((p: Record<string, unknown>) => ({
        ...p,
        id: p.pid,
      })),
  }),
  schema: z.object({
    ...common,
    pid: z.string(),
  }),
});

const others = defineCollection({
  // "others" have no id field; derive one from their link.
  loader: file(JSON_PATH, {
    parser: (text) =>
      JSON.parse(text).others.map((o: Record<string, unknown>) => ({
        ...o,
        id: o.link,
      })),
  }),
  schema: z.object(common),
});

export const collections = { articles, posts, others };
