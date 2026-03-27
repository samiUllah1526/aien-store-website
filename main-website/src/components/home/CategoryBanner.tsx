/**
 * Category banner: image-only, full-bleed (edge-to-edge) like the hero carousel.
 */

interface CategoryBannerProps {
  imageSrc: string;
  imageAlt?: string;
}

export default function CategoryBanner({ imageSrc, imageAlt = '' }: CategoryBannerProps) {
  return (
    <section
      className="relative w-full aspect-video min-h-[280px] max-h-[85vh] overflow-hidden"
      aria-label={imageAlt || 'Category banner'}
    >
      <div className="absolute inset-0">
        <img
          src={imageSrc}
          alt={imageAlt}
          className="w-full h-full object-cover object-center"
          fetchPriority="high"
          draggable={false}
        />
      </div>
    </section>
  );
}
