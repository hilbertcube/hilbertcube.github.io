import { defineConfig } from 'astro/config';

export default defineConfig({
  // Output static HTML (same as your current site)
  output: 'static',

  // The build output goes to dist/, which you deploy
  outDir: 'dist',

  // Your site URL for canonical links, sitemaps, etc.
  site: 'https://neumanncondition.com',

  vite: {
    server: {
      fs: {
        allow: ['..'],
      },
    },
  },
});
