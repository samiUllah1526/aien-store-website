// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import mdx from '@astrojs/mdx';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
// Fully static output — deployable to Cloudflare Pages, Vercel, Netlify, or any static host.
export default defineConfig({
  output: 'static',
  integrations: [react(), mdx()],

  vite: {
    plugins: [tailwindcss()]
  }
});