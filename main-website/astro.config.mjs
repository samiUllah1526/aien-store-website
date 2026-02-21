// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import node from '@astrojs/node';

// https://astro.build/config
// Static output — deployable to Cloudflare Pages, Vercel, Netlify, or any static host.
export default defineConfig({
  output: 'static',
  adapter: node({ mode: 'standalone' }),
  integrations: [
    react(),
    tailwind({
      applyBaseStyles: false,
    }),
  ],
});
