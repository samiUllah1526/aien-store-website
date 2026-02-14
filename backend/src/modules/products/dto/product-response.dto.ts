/**
 * Product response DTO compatible with Astro store frontend (ProductCard, ShopGrid).
 * Mirrors main-website ProductCardProduct + product detail fields.
 */
export class ProductResponseDto {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  image: string;
  images: string[];
  sizes: string[];
  category: string | null;
  categoryId: string | null;
  featured: boolean;
  urduVerse: string | null;
  urduVerseTransliteration: string | null;
  createdAt: string;
  updatedAt: string;
}

export class ProductListResponseDto {
  id: string;
  slug: string;
  name: string;
  price: number;
  currency: string;
  image: string;
  sizes: string[];
  featured: boolean;
}
