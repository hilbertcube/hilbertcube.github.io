/**
 * pageAsset.ts
 * ============
 * Resolve an image `src` against the page it appears on: a relative path
 * ("plot.webp", "figs/plot.webp") means the page's own folder under public/,
 * so on /articles/foo it becomes /articles/foo/plot.webp. Absolute paths,
 * URLs and data: URIs pass through unchanged.
 */
export function pageAsset(src: string, pathname: string): string {
  if (src.startsWith("/") || /^[a-z][a-z0-9+.-]*:/i.test(src)) return src;
  const dir = pathname.replace(/\/(index\.html)?$/, "");
  return `${dir}/${src.replace(/^\.\//, "")}`;
}
