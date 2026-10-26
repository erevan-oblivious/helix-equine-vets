// @ts-check
import { defineConfig } from 'astro/config';

import cloudflare from '@astrojs/cloudflare';

// https://astro.build/config
export default defineConfig({
  site: 'https://www.helixequine.co.uk', // <-- required for canonical url configuration
  output: 'server', // <-- Required for API endpoints to work
  adapter: cloudflare(),
  build: {
    inlineStylesheets: 'always', // Inlines all stylesheets directly in <head>
  },
});
