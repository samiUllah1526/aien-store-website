/**
 * Responsive image component with Cloudinary URL optimization.
 * When src is a Cloudinary URL, injects transforms (resize, format, quality).
 */

import { optimizedImageUrl, type ImageTransformOptions } from '../lib/image-optimize';

interface CloudinaryImageProps
  extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src: string;
  /** Cloudinary transform options. Ignored for non-Cloudinary URLs. */
  transform?: ImageTransformOptions;
  /** Use srcset with multiple widths for responsive images (Cloudinary only). */
  responsive?: boolean;
}

const RESPONSIVE_WIDTHS = [320, 640, 960, 1280];

export default function CloudinaryImage({
  src,
  transform,
  responsive,
  ...imgProps
}: CloudinaryImageProps) {
  const optimizedSrc = transform
    ? optimizedImageUrl(src, transform)
    : optimizedImageUrl(src);

  if (responsive && src && /^https:\/\/res\.cloudinary\.com\//.test(src)) {
    const srcSet = RESPONSIVE_WIDTHS.map(
      (w) =>
        `${optimizedImageUrl(src, { ...transform, width: w })} ${w}w`,
    ).join(', ');
    const sizes =
      imgProps.sizes ?? '(max-width: 640px) 100vw, (max-width: 960px) 50vw, 33vw';
    return (
      <img
        {...imgProps}
        src={optimizedSrc}
        srcSet={srcSet}
        sizes={sizes}
        loading={imgProps.loading ?? 'lazy'}
        decoding="async"
      />
    );
  }

  return (
    <img
      {...imgProps}
      src={optimizedSrc}
      loading={imgProps.loading ?? 'lazy'}
      decoding="async"
    />
  );
}
