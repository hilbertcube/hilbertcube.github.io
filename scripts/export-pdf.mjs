/**
 * export-pdf.mjs
 * ==============
 * Renders articles from the built site (dist/) to PDF with headless Chromium,
 * so KaTeX, Shiki colours and web fonts come out exactly as in a browser —
 * vector text, selectable, with PDF bookmarks from the headings.
 *
 *   npm run build && npm run pdf                  # every article
 *   npm run pdf -- valgrind-debug-and-profile     # just these slugs
 *
 * Output: pdf/<slug>.pdf (gitignored). Layout — including the author header
 * and page numbers — comes from the @media print rules in
 * src/assets/css/utils/_print.css, the same ones the "Save as PDF" button uses.
 */

import { createServer } from "node:http";
import { readFile, mkdir, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { chromium } from "playwright";

const DIST = "dist";
const OUT = "pdf";

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".avif": "image/avif",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
};

// Minimal static server over dist/ (a directory serves its index.html).
async function serve() {
  const server = createServer(async (req, res) => {
    let path = normalize(decodeURIComponent(new URL(req.url, "http://x").pathname));
    let file = join(DIST, path);
    try {
      if ((await stat(file)).isDirectory()) file = join(file, "index.html");
      res.writeHead(200, { "Content-Type": TYPES[extname(file)] ?? "application/octet-stream" });
      res.end(await readFile(file));
    } catch {
      res.writeHead(404).end();
    }
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  return server;
}

// Prepare a loaded page for print: wait for fonts, math and every image.
async function settle(page) {
  await page.evaluate(async () => {
    // Lazy images only load when scrolled to; make them load now.
    for (const img of document.images) img.loading = "eager";
    await Promise.all(
      [...document.images].map((img) =>
        img.complete ? null : new Promise((r) => { img.onload = img.onerror = r; }),
      ),
    );
    await document.fonts.ready;
  });

  // KaTeX renders after DOMContentLoaded; wait until no <E> is left unrendered.
  await page.waitForFunction(
    () => [...document.querySelectorAll(".equation")].every((e) => e.querySelector(".katex")),
    null,
    { timeout: 15000 },
  ).catch(() => console.warn("  ! some equations did not render"));
}

const catalog = JSON.parse(await readFile("src/data/pages.json", "utf8"));
const wanted = new Set(process.argv.slice(2));
const articles = catalog.articles
  .map((a) => ({ ...a, slug: a.link.replace(/^\/articles\//, "").replace(/\/$/, "") }))
  .filter((a) => !wanted.size || wanted.has(a.slug));

if (!articles.length) {
  console.error(`No matching articles: ${[...wanted].join(", ")}`);
  process.exit(1);
}
try {
  await stat(join(DIST, "index.html"));
} catch {
  console.error("No dist/ found — run `npm run build` first.");
  process.exit(1);
}

await mkdir(OUT, { recursive: true });
const server = await serve();
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch();
// Fresh context = empty localStorage = light mode and default code theme.
const context = await browser.newContext({ deviceScaleFactor: 2 });
// Keep analytics out of the render (and out of the site's stats).
await context.route(/googletagmanager|google-analytics/, (r) => r.abort());

let failed = 0;
for (const a of articles) {
  const page = await context.newPage();
  try {
    await page.goto(base + a.link + "/", { waitUntil: "load" });
    await page.emulateMedia({ media: "print" });
    await settle(page);
    await page.pdf({
      path: join(OUT, `${a.slug}.pdf`),
      preferCSSPageSize: true,
      printBackground: true,
      outline: true,
      tagged: true,
    });
    console.log(`✓ ${OUT}/${a.slug}.pdf`);
  } catch (e) {
    failed++;
    console.error(`✗ ${a.slug}: ${e.message}`);
  } finally {
    await page.close();
  }
}

await browser.close();
server.close();
process.exit(failed ? 1 : 0);
