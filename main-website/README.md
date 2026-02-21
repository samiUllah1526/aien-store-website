# Aien — Cultural-art Streetwear

A modern, cinematic e-commerce frontend for a **cultural-art streetwear** label. Built with Astro, React, and Tailwind CSS.

## Deploy (Static Site)

The site is **fully static** — no server required. Deploy the `dist` folder to any static host.

### Cloudflare Pages

```bash
npm run build
npx wrangler pages deploy dist/client --project-name=aien-store
```

Or connect your repo to Cloudflare Pages; it will build and deploy automatically.

### Vercel / Netlify / Other

- **Build:** `npm run build`
- **Output:** `dist/client/`
- Config files included: `vercel.json`, `netlify.toml`

## Environment Variables

| Variable | Description |
|----------|-------------|
| `PUBLIC_API_URL` | Backend API URL (required for cart, checkout, products). |
| `PUBLIC_HERO_VIDEO_URL` | Hero video (YouTube, Vimeo, or direct mp4). |
| `PUBLIC_HERO_VIDEO_POSTER` | Hero poster image (optional). |

Set these in your hosting dashboard or `.env` for local dev.

## Product Pages (Pre-rendered)

Product detail pages (`/shop/[slug]`) are pre-rendered at **build time** when `PUBLIC_API_URL` is reachable. If the API is unavailable during build, product pages won't be generated; home and shop will still work (data loads client-side).

## Commands

| Command | Action |
|---------|--------|
| `npm run dev` | Dev server |
| `npm run build` | Static build → `dist/` |
| `npm run preview` | Preview build |

## Tech Stack

- **Astro** — static generation, routing
- **React** — cart, product interactions, filters
- **Tailwind CSS** — styling
- **Framer Motion** — animations
- **Lenis** — smooth scroll
- **Zustand** — cart state
