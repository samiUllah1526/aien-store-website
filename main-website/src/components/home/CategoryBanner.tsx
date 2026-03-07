/**
 * Category banner: headline + large title + optional SALE band and image.
 */

interface CategoryBannerProps {
  smallTitle: string;
  largeTitle: string;
  saleText?: string;
  imageSrc?: string;
  imageAlt?: string;
}

export default function CategoryBanner({
  smallTitle,
  largeTitle,
  saleText = 'SALE 30% OFF',
  imageSrc,
  imageAlt = '',
}: CategoryBannerProps) {
  return (
    <section className="px-4 sm:px-6 overflow-hidden" aria-label={largeTitle}>
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-6 sm:gap-8">
        <div className="flex-1 min-w-0">
          <p className="font-display text-xs sm:text-sm md:text-base uppercase tracking-widest text-ash">
            {smallTitle}
          </p>
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-soft-charcoal dark:text-off-white mt-1 break-words">
            {largeTitle}
          </h2>
          {saleText && (
            <div className="mt-3 sm:mt-4 overflow-hidden w-full">
              <p className="text-red-600 dark:text-red-400 text-xs sm:text-sm font-medium uppercase tracking-wider whitespace-nowrap">
                {Array(8).fill(saleText).join(' · ')}
              </p>
            </div>
          )}
        </div>
        {imageSrc && (
          <div className="flex-shrink-0 w-full md:w-80 lg:w-96 aspect-[4/5] overflow-hidden rounded-lg bg-ash/10 max-w-[18rem] mx-auto md:mx-0 md:max-w-none">
            <img src={imageSrc} alt={imageAlt} className="w-full h-full object-cover" />
          </div>
        )}
      </div>
    </section>
  );
}
