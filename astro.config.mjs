import { defineConfig } from 'astro/config';

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

  vite: {
    server: {
      fs: {
        allow: ['..'],
      },
    },
  },
});
