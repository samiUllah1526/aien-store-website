/**
 * Product detail section: carousel shows all images; when a variant is selected,
 * the carousel scrolls to that variant's first image.
 * Renders a two-column layout: carousel on the left, children + AddToCart on the right.
 */

import { useState, useMemo, type ReactNode } from 'react';
import type { ProductVariant } from './AddToCart';
import AddToCart from './AddToCart';
import ProductImageCarousel from './ProductImageCarousel';

export interface ProductDetailSectionProps {
  productId: string;
  name: string;
  slug: string;
  price: number;
  currency: string;
  image: string;
  images: string[];
  variants: ProductVariant[];
  inStock?: boolean;
  children?: ReactNode;
}

/** Build a merged list of all variant + product images and a map variantId -> first index. */
function buildFullImageListAndVariantIndices(
  variants: ProductVariant[],
  productImages: string[],
  productImage: string
): { fullList: string[]; variantStartIndex: Record<string, number> } {
  const fullList: string[] = [];
  const seen = new Set<string>();
  const variantStartIndex: Record<string, number> = {};

  const add = (url: string) => {
    if (!url || seen.has(url)) return;
    seen.add(url);
    fullList.push(url);
  };

  for (const v of variants) {
    variantStartIndex[v.id] = fullList.length;
    if (v.images?.length) {
      v.images.forEach(add);
    } else if (v.image) {
      add(v.image);
    }
  }

  productImages.forEach(add);
  if (productImage) add(productImage);

  return { fullList, variantStartIndex };
}

export default function ProductDetailSection({
  productId,
  name,
  slug,
  price,
  currency,
  image,
  images,
  variants,
  inStock = true,
  children,
}: ProductDetailSectionProps) {
  const defaultVariant = useMemo(
    () =>
      variants.find((v) => v.isActive && v.stockQuantity > 0) ??
      variants.find((v) => v.isActive) ??
      null,
    [variants],
  );
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(defaultVariant);

  const { fullList: displayImages, variantStartIndex } = useMemo(
    () => buildFullImageListAndVariantIndices(variants, images, image),
    [variants, images, image],
  );

  const scrollToIndex = selectedVariant ? variantStartIndex[selectedVariant.id] ?? 0 : 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
      <div className="w-full">
        <ProductImageCarousel
          images={displayImages}
          alt={name}
          scrollToIndex={scrollToIndex}
        />
      </div>
      <div className="flex flex-col">
        {children}
        <AddToCart
          productId={productId}
          name={name}
          slug={slug}
          price={price}
          currency={currency}
          image={image}
          variants={variants}
          inStock={inStock}
          onVariantChange={setSelectedVariant}
        />
      </div>
    </div>
  );
}
