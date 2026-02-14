# Adab — Wear the Words

A modern, aesthetic e-commerce frontend for an **Urdu / Adabi (literary) inspired streetwear** label. Built with Astro, React, and Tailwind CSS.

## Design

- **Vibe:** Poetic, soulful, minimal, premium — inspired by Urdu literature, adab, and mushaira culture. Apple-inspired polish: breathing space, soft shadows, smooth transitions.
- **Colors:** Deep charcoal, off-white (cream), beige (sand), emerald green, ink black, muted gold. Full **light & dark mode** (system-aware + manual toggle).
- **Typography:** Playfair Display (serif) for headings; DM Sans for body; Noto Nastaliq Urdu for Urdu verse.
- **Urdu text** is used as a design element (RTL, large poetic sections).

## Tech Stack

- **Astro** (latest) — routing, layout, static generation
- **React** — cart state, product interactions, filters (client islands)
- **Tailwind CSS** — styling with custom theme in `tailwind.config.mjs`
- **Zustand** — global cart store shared across Astro islands (no backend)

## Project Structure

```
src/
  components/     # Astro + React components
    cart/         # CartIcon, CartSidebar, CartPage
    checkout/     # CheckoutForm
    home/         # FeaturedCollections
    product/      # AddToCart
    shop/         # ShopGrid (filters + grid)
    Carousel.tsx  # Landing carousel (products + poetry)
    VideoHero.tsx # Cinematic hero (video/gradient + overlay)
    ThemeToggle.tsx
  data/
    products.json # Dummy product data (shirts, hoodies, Urdu verses)
  layouts/
    BaseLayout.astro
  pages/
    index.astro       # Home (VideoHero, Carousel, featured, CTA)
    shop/
      index.astro     # Shop grid + filters
      [...slug].astro # Product detail
    about.astro
    cart.astro
    checkout.astro
  store/
    cartStore.ts      # Zustand cart (shared across islands)
    themeStore.ts     # Light/dark/system theme (localStorage)
  styles/
    global.css
```

## Commands

| Command        | Action       |
|----------------|--------------|
| `npm run dev`  | Dev server   |
| `npm run build`| Static build |
| `npm run preview` | Preview build |

## Features

- **Landing:** Cinematic **VideoHero** (optional video + gradient overlay + Urdu line); **Carousel** (featured products + poetry slides, auto-play, arrows, swipe). Respects `prefers-reduced-motion`.
- **Theme:** Light / dark / system. Toggle in nav; class on `<html>`; smooth transition.
- **Reusable:** `Carousel`, `VideoHero`, `ThemeToggle`; all accessible and mobile-first.

## Pages

1. **Home** — Video hero (or gradient), carousel, featured grid, CTAs.
2. **Shop** — Product grid, category and price filters, hover effects.
3. **Product detail** — Large image, Urdu verse block, size selector, Add to cart (opens sidebar).
4. **About** — Storytelling about adab, Urdu literature, and the brand.
5. **Cart** — Full-page cart list (same state as sidebar).
6. **Checkout** — UI-only form (name, email, address); no payment.

## Notes

- **No backend or authentication.** Cart state is in-memory (Zustand); refresh clears it.
- Product images use placeholder URLs; replace with real assets in `src/data/products.json`.
- **Hero video:** To use a real video, pass `src` and optional `poster` to `VideoHero` in `index.astro` (e.g. fabric/calligraphy/apparel clip). Omit for gradient-only hero.
- Urdu placeholders use Noto Nastaliq Urdu (Google Fonts); ensure fonts load for correct display.
