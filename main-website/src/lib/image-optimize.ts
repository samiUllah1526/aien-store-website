/**
 * Image URL optimization. Provider-agnostic: optimizes when URL format is recognized.
 * - Cloudinary: injects transforms in URL path.
 * - S3/CloudFront, imgix, etc.: add handlers when those providers are used.
 * - Unknown URLs: returned as-is.
 */

/** Check if URL is from Cloudinary (for transform injection). */
export function isCloudinaryUrl(url: string): boolean {
  return /^https:\/\/res\.cloudinary\.com\//.test(url);
}

/** Check if URL supports optimization (extend when adding S3/imgix etc.). */
export function isOptimizableUrl(url: string): boolean {
  return isCloudinaryUrl(url);
}

export interface ImageTransformOptions {
  width?: number;
  height?: number;
  crop?: 'fill' | 'limit' | 'fit' | 'thumb' | 'scale' | 'pad';
  quality?: 'auto' | number;
  format?: 'auto' | 'webp' | 'avif' | 'jpg' | 'png';
  dpr?: 'auto' | 1 | 2 | 3;
}

const DEFAULT_OPTIONS: ImageTransformOptions = {
  crop: 'fill',
  quality: 'auto',
  format: 'auto',
};

/**
 * Build optimized URL with provider-specific transformations.
 * Cloudinary: injects in path. Others: returns as-is.
 */
export function optimizedImageUrl(
  url: string,
  options: ImageTransformOptions = {},
): string {
  if (!url) return '';
  if (!isCloudinaryUrl(url)) return url;

  const opts = { ...DEFAULT_OPTIONS, ...options };
  const parts: string[] = [];
  if (opts.width) parts.push(`w_${opts.width}`);
  if (opts.height) parts.push(`h_${opts.height}`);
  if (opts.crop) parts.push(`c_${opts.crop}`);
  if (opts.quality) parts.push(opts.quality === 'auto' ? 'q_auto' : `q_${opts.quality}`);
  if (opts.format) parts.push(opts.format === 'auto' ? 'f_auto' : `f_${opts.format}`);
  if (opts.dpr && opts.dpr !== 1) parts.push(opts.dpr === 'auto' ? 'dpr_auto' : `dpr_${opts.dpr}`);

  if (parts.length === 0) return url;

  const transformStr = parts.join(',');
  return url.replace(
    /(\/upload\/)(v\d+\/)?/,
    `$1${transformStr}/$2`,
  );
}

/** Thumbnail (e.g. cart, grid): 200px */
export function thumbnailUrl(url: string): string {
  return optimizedImageUrl(url, { width: 200, height: 200 });
}

/** Product detail main: 800px */
export function productDetailUrl(url: string): string {
  return optimizedImageUrl(url, { width: 800, height: 1000 });
}

/** OG/social: 1200px */
export function ogImageUrl(url: string): string {
  return optimizedImageUrl(url, { width: 1200, height: 630 });
}
