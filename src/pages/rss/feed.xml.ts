/**
 * src/pages/rss/feed.xml.ts
 * =========================
 * Build-time RSS 2.0 feed over the `articles` and `posts` collections.
 */
import rss from "@astrojs/rss";
import type { APIContext } from "astro";
import { getCollection } from "astro:content";

export async function GET(context: APIContext) {
  const [articles, posts] = await Promise.all([
    getCollection("articles"),
    getCollection("posts"),
  ]);

  const items = [...articles, ...posts]
    .map((entry) => ({
      title: entry.data.title,
      description: entry.data.description,
      link: entry.data.link,
      pubDate: new Date(entry.data.pubDate),
      categories: entry.data.topics,
    }))
    .sort((a, b) => b.pubDate.valueOf() - a.pubDate.valueOf());

  return rss({
    title: "neumanncondition",
    description: "Recent articles and posts from neumanncondition.com",
    site: context.site!,
    items,
  });
}
