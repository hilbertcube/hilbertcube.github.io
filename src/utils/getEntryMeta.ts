/**
 * getEntryMeta.ts
 * ===============
 * Every article/post page looks up its own collection entry by matching
 * its URL against `data.link`. This centralizes that lookup (and the
 * "entry not found" guard) so page files don't repeat it.
 */
import { getCollection, type CollectionEntry } from "astro:content";

export async function getEntryMeta<C extends "articles" | "posts">(
  collection: C,
  pathname: string,
): Promise<CollectionEntry<C>["data"]> {
  const slug = pathname.replace(/\/$/, "");
  const entry = (await getCollection(collection)).find(
    (e) => e.data.link.replace(/\/$/, "") === slug,
  );

  if (!entry) {
    throw new Error(`Entry metadata not found in "${collection}" for slug: ${slug}`);
  }

  return entry.data;
}
