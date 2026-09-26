import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  // Output static HTML (same as your current site)
  output: 'static',

  // The build output goes to dist/, which you deploy
  outDir: 'dist',

  // Your site URL for canonical links, sitemaps, etc.
  site: 'https://neumanncondition.com',

  // The resources page used to live at the root; keep old links working.
  redirects: {
    '/recommended-materials': '/posts/resources',
  },

  // sitemap-index.xml + sitemap-0.xml, built from every page in `site`. The
  // lorem-ipsum templates and standalone test pages are kept out of it.
  integrations: [
    sitemap({
      filter: (page) => !/\/(template|test)\//.test(new URL(page).pathname),
    }),
  ],

  vite: {
    server: {
      fs: {
        allow: ['..'],
      },
    },
  },
});
