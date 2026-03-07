# Main website style guide

There is **no separate external style guide**. The design system is defined in this repo and applied via Tailwind.

## Where it lives

- **`tailwind.config.mjs`** — Single source of truth for:
  - **Colors**: Aien palette (charcoal, bone, ash, mehndi, off-white, soft-charcoal, etc.). Comment in config: *"Aien design system: melancholic, editorial"*.
  - **Typography**: Font families and custom font sizes.
  - **Spacing, animation, transitions** used across the site.
- **`src/styles/global.css`** — Base body styles (`font-sans`, colors, Urdu utility).
- **`src/layouts/BaseLayout.astro`** — Google Fonts loaded (Montserrat, Noto Nastaliq Urdu).

## Typography (centralized)

All text uses **Montserrat** unless it’s Urdu. Do not add `font-sans` or `font-family` in components.

- **`tailwind.config.mjs`** — `sans` and `display` both point to Montserrat. Only `urdu` is a different family.
- **`src/styles/global.css`** — `body` has `font-sans`; that’s the single place for the default typeface. All content inherits Montserrat.
- **`font-display`** in components is for semantic headings/titles; it still resolves to Montserrat from the config.

| Role     | Font               | Set in              | Usage                    |
|----------|--------------------|---------------------|--------------------------|
| **Sans** | Montserrat         | body (global.css)   | All body and UI text     |
| **Display** | Montserrat      | tailwind.config.mjs | Headings, titles (same)  |
| **Urdu** | Noto Nastaliq Urdu | `.urdu-text`        | Urdu poetry / script     |

## Colors

- **Backgrounds**: `bg-bone` (light), `bg-charcoal` (dark).
- **Text**: `text-soft-charcoal` (light mode), `text-off-white` (dark).
- **Muted**: `text-ash`, `text-ash/80`.
- **Accent**: `mehndi` (green), used for focus/hover.
- Prefer semantic tokens over raw hex in components.

## Conventions

- Dark mode: `dark:` variants; theme set via `class` on `<html>`.
- Focus: use `.focus-ring` for accessible focus styles.
- Spacing: prefer Tailwind spacing scale; `prose` for readable line length where needed.

## Responsive (all screens including mobile)

- **Viewport**: `width=device-width, initial-scale=1.0, viewport-fit=cover` in `BaseLayout.astro`.
- **Breakpoints**: Tailwind defaults — `sm` 640px, `md` 768px, `lg` 1024px. Use `px-3 sm:px-6` (or `px-4 sm:px-6`) for consistent horizontal padding; avoid fixed widths that exceed 100vw.
- **Touch**: Interactive elements use at least `min-w-[2.75rem] min-h-[2.75rem]` (44px) where possible. Body has `-webkit-tap-highlight-color: transparent`.
- **Overflow**: `overflow-x: hidden` on body; sections that scroll horizontally (e.g. product carousels) use `overflow-x-auto` and `touch-pan-x` / `-webkit-overflow-scrolling: touch`.
- **Text**: Use responsive font sizes (e.g. `text-xs sm:text-sm`) and `break-words` / `break-all` for long emails or URLs in footer.
