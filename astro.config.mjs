// @ts-check
import { defineConfig } from 'astro/config';

import cloudflare from '@astrojs/cloudflare';

import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  // <-- required for canonical url configuration
  site: 'https://www.helixequine.co.uk',

  // <-- Required for API endpoints to work
  output: 'server',

  adapter: cloudflare(),

  build: {
    inlineStylesheets: 'always', // Inlines all stylesheets directly in <head>
  },

  integrations: [sitemap()],
});