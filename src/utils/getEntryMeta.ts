/**
 * getEntryMeta.ts
 * ===============
 * Every article/post page looks up its own collection entry by matching
 * its URL against `data.link`. This centralizes that lookup (and the
 * "entry not found" guard) so page files don't repeat it.
 *
 * Two entry points:
 * - `getEntryMeta(collection, pathname)` — explicit lookup, when the caller
 *   already knows which collection it wants.
 * - `resolveEntryMeta(pathname)` — infers the collection from the URL and
 *   memoizes the result. This is what the header components
 *   (TopicTags/PageTitle/PubDate) use so a page doesn't have to do the
 *   lookup itself.
 */
import { getCollection, type CollectionEntry } from "astro:content";

export type EntryKind = "articles" | "posts";

/** The fields shared by both collections, as a union of the two schemas. */
export type EntryMeta =
  | CollectionEntry<"articles">["data"]
  | CollectionEntry<"posts">["data"];

export interface ResolvedEntry {
  kind: EntryKind;
  data: EntryMeta;
}

export async function getEntryMeta<C extends EntryKind>(
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

// One lookup per pathname per build, shared by the three header components
// rendered on the same page. Promises are cached (not values) so concurrent
// callers await the same work.
const cache = new Map<string, Promise<ResolvedEntry>>();

/**
 * Resolve the collection entry for a page from its own URL.
 *
 * The collection is inferred from the path prefix, the same way BaseLayout
 * derives `isArticle`. Pages outside /articles/ and /posts/ have no catalog
 * entry, so callers there must pass values explicitly instead.
 */
export function resolveEntryMeta(pathname: string): Promise<ResolvedEntry> {
  const slug = pathname.replace(/\/$/, "");

  const cached = cache.get(slug);
  if (cached) return cached;

  const kind: EntryKind | null = slug.startsWith("/posts/")
    ? "posts"
    : slug.startsWith("/articles/")
      ? "articles"
      : null;

  if (!kind) {
    throw new Error(
      `Cannot infer a collection for "${slug}" — only /articles/* and /posts/* ` +
        `pages have catalog entries. Pass the value as a prop instead.`,
    );
  }

  const resolved = getEntryMeta(kind, slug).then((data) => ({ kind, data }));
  cache.set(slug, resolved);
  return resolved;
}
