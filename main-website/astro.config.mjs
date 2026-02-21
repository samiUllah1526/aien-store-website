// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';

// https://astro.build/config
// Fully static output — deployable to Cloudflare Pages, Vercel, Netlify, or any static host.
export default defineConfig({
  output: 'static',
  integrations: [
    react(),
    tailwind({
      applyBaseStyles: false,
    }),
  ],
});
