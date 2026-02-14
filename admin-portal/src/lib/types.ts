/** Product list item from GET /products */
export interface ProductListItem {
  id: string;
  slug: string;
  name: string;
  price: number;
  currency: string;
  image: string;
  sizes: string[];
  featured: boolean;
  /** Category names (from backend categories array). */
  categories?: string[];
}

/** Full product from GET /products/:id */
export interface Product {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  image: string;
  images: string[];
  sizes: string[];
  categories: Array<{ id: string; name: string; slug: string }>;
  category: string | null;
  categoryId: string | null;
  featured: boolean;
  urduVerse: string | null;
  urduVerseTransliteration: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Payload for create/update. Backend expects price in cents, mediaIds, categoryIds. */
export interface ProductFormData {
  name: string;
  slug: string;
  description?: string;
  categoryIds?: string[];
  priceCents: number;
  currency?: string;
  sizes?: string[];
  featured?: boolean;
  mediaIds?: string[];
}

// ---------------------------------------------------------------------------
// Orders (GET /orders, GET /orders/:id, PUT /orders/:id)
// ---------------------------------------------------------------------------

export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED';

export interface OrderItem {
  id: string;
  productId: string;
  productName?: string;
  productImage?: string | null;
  quantity: number;
  unitCents: number;
}

export interface OrderStatusHistoryEntry {
  status: string;
  createdAt: string;
}

export interface Order {
  id: string;
  status: string;
  totalCents: number;
  currency: string;
  customerEmail: string;
  customerName: string | null;
  customerPhone: string | null;
  shippingCountry: string | null;
  shippingAddressLine1: string | null;
  shippingAddressLine2: string | null;
  shippingCity: string | null;
  shippingPostalCode: string | null;
  assignedToUserId: string | null;
  assignedToUserName: string | null;
  items: OrderItem[];
  statusHistory: OrderStatusHistoryEntry[];
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Users (GET /users, GET /users/roles, POST /users, PUT /users/:id, DELETE /users/:id)
// ---------------------------------------------------------------------------

export interface UserRoleDto {
  roleId: string;
  roleName: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  status: string;
  lastLoginAt: string | null;
  roleIds: string[];
  roles: UserRoleDto[];
  createdAt: string;
  updatedAt: string;
}

export interface Role {
  id: string;
  name: string;
}

// ---------------------------------------------------------------------------
// Categories (GET /categories, POST /categories, PUT /categories/:id, DELETE /categories/:id)
// ---------------------------------------------------------------------------

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
  productCount?: number;
}
