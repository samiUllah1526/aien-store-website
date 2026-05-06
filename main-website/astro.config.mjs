// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
// Fully static output — deployable to Cloudflare Pages, Vercel, Netlify, or any static host.
//
// `site` is the canonical origin used by:
//   - @astrojs/sitemap to build absolute URLs in /sitemap-index.xml + /sitemap-0.xml
//   - <link rel="canonical"> when not explicitly overridden in BaseLayout
// It can be overridden per-environment via PUBLIC_SITE_URL.
const SITE_URL = (process.env.PUBLIC_SITE_URL || 'https://www.aien.store').replace(/\/+$/, '');

export default defineConfig({
  site: SITE_URL,
  output: 'static',
  integrations: [
    react(),
    tailwind({
      applyBaseStyles: false,
    }),
    sitemap({
      // Drop auth / account / checkout / cart pages from the public sitemap —
      // they're behind a session and should not be crawled or indexed.
      filter: (page) => {
        // Astro emits URLs with trailing slashes (e.g. https://site/cart/).
        // Normalise to a no-trailing-slash pathname before matching.
        const path = new URL(page).pathname.replace(/\/+$/, '') || '/';
        if (path.startsWith('/account')) return false;
        if (path === '/cart' || path === '/checkout') return false;
        if (path === '/login' || path === '/register') return false;
        if (path === '/forgot-password' || path === '/reset-password') return false;
        return true;
      },
      changefreq: 'weekly',
      priority: 0.7,
      lastmod: new Date(),
    }),
  ],
});
