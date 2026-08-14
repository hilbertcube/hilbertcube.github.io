/**
 * formatDate.ts
 * =============
 * Display formatter over the collections' `pubDate` (ISO "YYYY-MM-DD")
 * field, used for both articles and posts.
 */

export function formatDate(pubDate: string): string {
  const date = new Date(`${pubDate}T00:00:00Z`);
  const month = date.toLocaleDateString("en-US", {
    month: "short",
    timeZone: "UTC",
  });
  const day = date.toLocaleDateString("en-US", {
    day: "numeric",
    timeZone: "UTC",
  });
  const year = date.toLocaleDateString("en-US", {
    year: "numeric",
    timeZone: "UTC",
  });
  return `${month}. ${day}, ${year}`;
}
