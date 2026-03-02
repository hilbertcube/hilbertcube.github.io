import { defineConfig } from 'astro/config';

export default defineConfig({
  // Output static HTML (same as your current site)
  output: 'static',

  // The build output goes to dist/, which you deploy
  outDir: 'dist',

  // Your site URL for canonical links, sitemaps, etc.
  site: 'https://neumanncondition.com',

  // Astro's public/ directory for static assets.
  // We use astro-public/ to avoid colliding with the existing public/ folder.
  // Symlinks inside astro-public/ point to existing asset directories.
  publicDir: 'astro-public',

  vite: {
    server: {
      fs: {
        allow: ['..'],
      },
    },
  },
});
