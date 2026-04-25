/**
 * Single source of truth for building storefront image URLs.
 *
 * Two responsibilities:
 *   1. Resolve any backend-relative path (e.g. `/media/file/abc.jpg`) into an
 *      absolute URL on `storeApiBaseUrl`.
 *   2. Inject Cloudinary transforms (size, crop, quality, format) for that
 *      URL when applicable. Non-Cloudinary URLs pass through unchanged, so
 *      this is safe to use for every image source on the site.
 *
 * Use the named `IMAGE_PRESETS` so the rendered slot determines the bytes
 * shipped — never serve a 4 MP product detail variant for an 80 px cart
 * thumbnail.
 *
 * For full-bleed surfaces (hero, category banners) pair `buildImageUrl` with
 * `buildImageSrcSet` to emit a Cloudinary `srcset` so phones don't pull the
 * 1920 px desktop variant.
 */

import { optimizedImageUrl, type ImageTransformOptions } from './image-optimize';
import { storeApiBaseUrl } from '../config';

export const IMAGE_PRESETS = {
  /** Full-bleed hero / category / shop / about banners (desktop, 2:1 cinematic). */
  heroBanner:     { width: 1920, height: 960,  crop: 'fill', quality: 'auto', format: 'auto' },
  /** Mobile art-directed crop for collection / category banners (4:5 portrait). */
  heroBannerMobile:{ width: 800,  aspectRatio: '4:5', crop: 'fill', quality: 'auto', format: 'auto' },
  /** Bento grid primary card (home page LCP candidate). */
  bentoPrimary:   { width: 1200, height: 1200, crop: 'fill', quality: 'auto', format: 'auto' },
  /** Bento grid secondary card. */
  bentoSecondary: { width: 800,  height: 800,  crop: 'fill', quality: 'auto', format: 'auto' },
  /** 3:4 product card in shop / collection / favorites grids. */
  productCard:    { width: 600,  height: 800,  crop: 'fill', quality: 'auto', format: 'auto' },
  /** Product detail page main image (main carousel slide). */
  productDetail:  { width: 1200, height: 1600, crop: 'fill', quality: 'auto', format: 'auto' },
  /** Product detail thumbnail strip and quick-view modal previews. */
  productThumb:   { width: 200,  height: 200,  crop: 'fill', quality: 'auto', format: 'auto' },
  /** Cart line item image (cart page + cart sidebar). */
  cartItem:       { width: 240,  height: 320,  crop: 'fill', quality: 'auto', format: 'auto' },
  /** Order summary line item image. */
  orderItem:      { width: 160,  height: 160,  crop: 'fill', quality: 'auto', format: 'auto' },
  /** Header cart dropdown thumbnail. */
  cartPreview:    { width: 80,   height: 80,   crop: 'fill', quality: 'auto', format: 'auto' },
  /** Open Graph / social meta image. */
  ogImage:        { width: 1200, height: 630,  crop: 'fill', quality: 'auto', format: 'auto' },
} as const satisfies Record<string, ImageTransformOptions>;

export type ImagePresetName = keyof typeof IMAGE_PRESETS;

/** Prepend `root` if `url` is path-relative; pass http(s) URLs through. */
export function toAbsoluteUrl(
  url: string | null | undefined,
  root: string = storeApiBaseUrl,
): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  const cleanRoot = root.replace(/\/+$/, '');
  const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${cleanRoot}${cleanPath}`;
}

/**
 * Resolve `url` to absolute and apply Cloudinary transforms when applicable.
 * Returns an empty string when given a falsy input so callers can use
 * `&&`-style conditional rendering on the result.
 */
export function buildImageUrl(
  url: string | null | undefined,
  preset?: ImageTransformOptions,
): string {
  const abs = toAbsoluteUrl(url);
  if (!abs) return '';
  return preset ? optimizedImageUrl(abs, preset) : abs;
}

/**
 * Build a Cloudinary `srcset` string for full-bleed responsive images.
 *
 * Each width gets its own transformed URL with a `w` width descriptor so the
 * browser picks the closest variant for the viewport. Non-Cloudinary inputs
 * return an empty string (skip emitting `srcset` in that case).
 */
export function buildImageSrcSet(
  url: string | null | undefined,
  widths: ReadonlyArray<number>,
  baseTransform?: ImageTransformOptions,
): string {
  const abs = toAbsoluteUrl(url);
  if (!abs) return '';
  // optimizedImageUrl is a pass-through for non-Cloudinary URLs, so we'd just
  // emit the same URL for every width — useless and confusing in DevTools.
  // Detect that case by comparing the unmodified URL to the transformed one.
  const probe = optimizedImageUrl(abs, { width: widths[0] });
  if (probe === abs) return '';
  return widths
    .map((w) => `${optimizedImageUrl(abs, { ...baseTransform, width: w })} ${w}w`)
    .join(', ');
}
