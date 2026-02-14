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
  category: string | null;
  categoryId: string | null;
  featured: boolean;
  urduVerse: string | null;
  urduVerseTransliteration: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Payload for create/update. Backend expects price in cents, mediaIds for images. */
export interface ProductFormData {
  name: string;
  slug: string;
  description?: string;
  categoryId?: string;
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
  customerEmail: string;
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
