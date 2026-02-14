/**
 * Product response DTO compatible with Astro store frontend (ProductCard, ShopGrid).
 * categories: many-to-many; category/categoryId kept for backward compat (first category).
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
  /** All categories this product belongs to. */
  categories: Array<{ id: string; name: string; slug: string }>;
  /** First category name (backward compat). */
  category: string | null;
  /** First category id (backward compat). */
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
  /** Category names for display/tags. */
  categories: string[];
}
