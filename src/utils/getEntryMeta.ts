/**
 * getEntryMeta.ts
 * ===============
 * Look up a page's catalog entry by matching its URL against `data.link`.
 * `getEntryMeta` takes the collection; `resolveEntryMeta` infers it from the
 * path and memoizes (used by TopicTags/PageTitle/PubDate).
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

// One lookup per pathname per build; promises are cached so concurrent callers share it.
const cache = new Map<string, Promise<ResolvedEntry>>();

/** Resolve a page's entry from its URL; only /articles/* and /posts/* have one. */
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
