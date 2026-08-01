/**
 * Product detail section: carousel shows all images; when a variant is selected,
 * the carousel scrolls to that variant's first image.
 * Renders a two-column layout: carousel on the left, children + AddToCart on the right.
 */

import { useState, useMemo, useEffect, useRef, type ReactNode } from 'react';
import type { ProductVariant } from './AddToCart';
import AddToCart from './AddToCart';
import ProductImageCarousel from './ProductImageCarousel';
import ProductPrice from '../ProductPrice';
import AnimatedUrduVerse from '../AnimatedUrduVerse';
import { centsToValue, trackPixel } from '../../lib/pixel';
import {
  resolveUnitSaleDisplay,
  type StoreSaleType,
} from '../../lib/computeStoreSalePrice';

export interface ProductDetailSectionProps {
  productId: string;
  name: string;
  slug: string;
  /** Effective shelf price in cents for the base product (sale-aware). */
  price: number;
  currency: string;
  /** Struck-through compare-at in cents when the base product is on sale. */
  compareAtPrice?: number | null;
  /** Active campaign type — used to price variant overrides correctly. */
  saleType?: StoreSaleType | null;
  saleDiscountValue?: number | null;
  image: string;
  images: string[];
  /**
   * Parallel array to `images`: 200×200 thumbnail variants used by the
   * carousel strip. Same length and order as `images`. Falls back to `images`
   * inside the carousel when omitted.
   */
  thumbnails?: string[];
  variants: ProductVariant[];
  inStock?: boolean;
  /** Category eyebrow + product title (price renders after this). */
  children?: ReactNode;
  description?: string | null;
  urduVerse?: string | null;
  urduVerseTransliteration?: string | null;
  /** Resolved size guide image URL (product → primary category). */
  sizeGuideUrl?: string | null;
}

/**
 * Build a merged list of all variant + product images and a map
 * variantId -> first index. Builds a parallel thumbnails fullList in lockstep
 * so the carousel can pair each main slide with its 200×200 strip variant.
 *
 * Variants carry their own optional `thumbnails` array (set by the page from
 * the raw URL via `productThumb`); when missing, we fall back to the variant
 * main image, which is acceptable but heavier — admins should always provide
 * variant images so thumbnails get computed at build time.
 */
function buildFullImageListAndVariantIndices(
  variants: ProductVariant[],
  productImages: string[],
  productImage: string,
  productThumbnails: string[] | undefined,
  productImageThumb: string | undefined,
): {
  fullList: string[];
  thumbList: string[];
  variantStartIndex: Record<string, number>;
} {
  const fullList: string[] = [];
  const thumbList: string[] = [];
  const seen = new Set<string>();
  const variantStartIndex: Record<string, number> = {};

  const add = (url: string, thumb?: string) => {
    if (!url || seen.has(url)) return;
    seen.add(url);
    fullList.push(url);
    thumbList.push(thumb || url);
  };

  for (const v of variants) {
    variantStartIndex[v.id] = fullList.length;
    if (v.images?.length) {
      v.images.forEach((src, i) => add(src, v.thumbnails?.[i]));
    } else if (v.image) {
      add(v.image, v.thumbnails?.[0]);
    }
  }

  productImages.forEach((src, i) => add(src, productThumbnails?.[i]));
  if (productImage) add(productImage, productImageThumb);

  return { fullList, thumbList, variantStartIndex };
}

export default function ProductDetailSection({
  productId,
  name,
  slug,
  price,
  currency,
  compareAtPrice = null,
  saleType = null,
  saleDiscountValue = null,
  image,
  images,
  thumbnails,
  variants,
  inStock = true,
  children,
  description,
  urduVerse = null,
  urduVerseTransliteration = null,
  sizeGuideUrl = null,
}: ProductDetailSectionProps) {
  const defaultVariant = useMemo(
    () =>
      variants.find((v) => v.isActive && v.stockQuantity > 0) ??
      variants.find((v) => v.isActive) ??
      null,
    [variants],
  );
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(defaultVariant);
  const viewContentFired = useRef(false);

  const sale = useMemo(
    () =>
      saleType && saleDiscountValue != null
        ? { type: saleType, discountValue: saleDiscountValue }
        : null,
    [saleType, saleDiscountValue],
  );

  const { displayPrice, displayCompareAt } = useMemo(() => {
    const catalogBase = compareAtPrice ?? price;
    const listUnit = selectedVariant?.priceOverrideCents ?? catalogBase;
    const resolved = resolveUnitSaleDisplay(listUnit, sale);
    return { displayPrice: resolved.price, displayCompareAt: resolved.compareAtPrice };
  }, [selectedVariant?.priceOverrideCents, compareAtPrice, price, sale]);

  useEffect(() => {
    if (viewContentFired.current) return;
    viewContentFired.current = true;
    trackPixel('ViewContent', {
      content_type: 'product',
      content_ids: [productId],
      content_name: name,
      value: centsToValue(displayPrice),
      currency: currency || 'PKR',
      contents: [{ id: productId, quantity: 1, item_price: centsToValue(displayPrice) }],
    });
  }, [productId, name, currency, displayPrice]);

  // Page passes `thumbnails` parallel to product `images`; the [0] entry also
  // doubles as the thumb for the lone product `image` when present (they're
  // built from the same raw URL).
  const productImageThumb = thumbnails?.[0];

  const { fullList: displayImages, thumbList: displayThumbs, variantStartIndex } = useMemo(
    () =>
      buildFullImageListAndVariantIndices(
        variants,
        images,
        image,
        thumbnails,
        productImageThumb,
      ),
    [variants, images, image, thumbnails, productImageThumb],
  );

  const scrollToIndex = selectedVariant ? variantStartIndex[selectedVariant.id] ?? 0 : 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-10 lg:gap-16">
      <div className="lg:col-span-7">
        <ProductImageCarousel
          images={displayImages}
          thumbnails={displayThumbs}
          alt={name}
          scrollToIndex={scrollToIndex}
        />
      </div>
      <div className="lg:col-span-5 lg:sticky lg:top-28 self-start h-fit">
        {children}
        <div className="mb-6 sm:mb-8">
          <ProductPrice
            amountCents={displayPrice}
            currency={currency}
            compareAtCents={displayCompareAt}
            size="detail"
            layout="inline"
          />
        </div>
        {urduVerse ? (
          <AnimatedUrduVerse verse={urduVerse} transliteration={urduVerseTransliteration} />
        ) : null}
        <div className="mt-8 sm:mt-12">
          <AddToCart
            productId={productId}
            name={name}
            slug={slug}
            price={price}
            compareAtPrice={compareAtPrice}
            saleType={saleType}
            saleDiscountValue={saleDiscountValue}
            currency={currency}
            image={image}
            variants={variants}
            inStock={inStock}
            onVariantChange={setSelectedVariant}
            description={description}
            sizeGuideUrl={sizeGuideUrl}
          />
        </div>
      </div>
    </div>
  );
}
