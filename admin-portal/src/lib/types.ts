export interface ProductVariant {
  id: string;
  color: string;
  size: string;
  sku: string | null;
  stockQuantity: number;
  priceOverrideCents: number | null;
  isActive: boolean;
  image?: string;
  images?: string[];
  mediaIds?: string[];
}

/** Product list item from GET /products */
export interface ProductListItem {
  id: string;
  slug: string;
  name: string;
  price: number;
  currency: string;
  image: string;
  variants: ProductVariant[];
  colors: string[];
  sizes: string[];
  featured: boolean;
  /** Current stock level. */
  stockQuantity: number;
  /** True when stockQuantity > 0. */
  inStock: boolean;
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
  mediaIds?: string[];
  variants: ProductVariant[];
  colors: string[];
  sizes: string[];
  categories: Array<{ id: string; name: string; slug: string }>;
  category: string | null;
  categoryId: string | null;
  featured: boolean;
  /** Current stock level. */
  stockQuantity: number;
  /** True when stockQuantity > 0. */
  inStock: boolean;
  urduVerse: string | null;
  urduVerseTransliteration: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Payload for create/update. Backend expects price in minor units (e.g. paisa), mediaIds, categoryIds. */
export interface ProductFormData {
  name: string;
  slug: string;
  description?: string;
  categoryIds?: string[];
  priceCents: number;
  currency?: string;
  variants: Array<{
    id?: string;
    color: string;
    size: string;
    sku?: string;
    stockQuantity: number;
    priceOverrideCents?: number;
    isActive?: boolean;
    mediaIds?: string[];
  }>;
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
  variantId: string;
  productName?: string;
  productImage?: string | null;
  color?: string | null;
  /** Size at time of order (e.g. S, M, L). Optional. */
  size?: string | null;
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
  subtotalCents?: number | null;
  shippingCents?: number | null;
  discountType?: string | null;
  voucherCode?: string | null;
  discountCents?: number;
  customerEmail: string;
  customerFirstName: string | null;
  customerLastName: string | null;
  customerName: string | null;
  customerPhone: string | null;
  shippingCountry: string | null;
  shippingAddressLine1: string | null;
  shippingAddressLine2: string | null;
  shippingCity: string | null;
  shippingPostalCode: string | null;
  paymentMethod: string;
  paymentProofPath: string | null;
  courierServiceName: string | null;
  trackingId: string | null;
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
  firstName: string | null;
  lastName: string | null;
  email: string;
  status: string;
  lastLoginAt: string | null;
  roleIds: string[];
  roles: UserRoleDto[];
  permissions?: string[];
  isSuperAdmin?: boolean;
  directPermissionIds?: string[];
  /** True if user can sign in with email/password. */
  hasPassword?: boolean;
  /** True if user has linked Google sign-in. */
  hasGoogleLogin?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Role {
  id: string;
  name: string;
  description?: string | null;
}

/** Role with counts (GET /roles). */
export interface RoleDetail {
  id: string;
  name: string;
  description: string | null;
  userCount: number;
  permissionCount: number;
  permissionIds: string[];
}

/** Permissions grouped by category (GET /roles/permissions/grouped). */
export interface PermissionGroup {
  category: string | null;
  permissions: Array<{ id: string; name: string; description: string | null }>;
}

/** Single permission as returned by POST /roles/permissions and PATCH /roles/permissions/:id */
export interface PermissionDetail {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Categories (GET /categories, POST /categories, PUT /categories/:id, DELETE /categories/:id)
// ---------------------------------------------------------------------------

export interface Category {
  id: string;
  name: string;
  slug: string;
  /** Rich-text HTML from the admin TipTap editor; legacy plain text renders identically. */
  description: string | null;
  /** Bullet list shown on storefront category page (max 20 items, ≤120 chars each). */
  highlights: string[];
  bannerImageUrl: string | null;
  showOnLanding: boolean;
  landingOrder: number | null;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
  productCount?: number;
}

// ---------------------------------------------------------------------------
// Vouchers (GET /vouchers, POST /vouchers, etc.)
// ---------------------------------------------------------------------------

export type VoucherType = 'PERCENTAGE' | 'FIXED_AMOUNT' | 'FREE_SHIPPING';

export interface Voucher {
  id: string;
  code: string;
  type: VoucherType;
  value: number;
  minOrderValueCents: number;
  maxDiscountCents: number | null;
  startDate: string;
  expiryDate: string;
  usageLimitGlobal: number | null;
  usageLimitPerUser: number | null;
  usedCount: number;
  applicableProductIds: string[];
  applicableCategoryIds: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface VoucherFormData {
  code: string;
  type: VoucherType;
  value: number;
  minOrderValueCents?: number;
  maxDiscountCents?: number;
  startDate: string;
  expiryDate: string;
  usageLimitGlobal?: number;
  usageLimitPerUser?: number;
  applicableProductIds?: string[];
  applicableCategoryIds?: string[];
  isActive?: boolean;
}

// ---------------------------------------------------------------------------
// Sales Campaigns (GET /sales-campaigns, POST /sales-campaigns, etc.)
// ---------------------------------------------------------------------------

export type SalesCampaignType = 'PERCENTAGE' | 'FIXED_AMOUNT';
export type SalesCampaignStatus = 'DRAFT' | 'SCHEDULED' | 'PAUSED';
export type SalesCampaignScope = 'ALL_PRODUCTS' | 'SPECIFIC_PRODUCTS' | 'SPECIFIC_CATEGORIES';
export type SalesCampaignDisplayStatus = 'DRAFT' | 'SCHEDULED' | 'ACTIVE' | 'PAUSED' | 'ENDED';

export interface SalesCampaignProduct {
  productId: string;
  overrideValue: number | null;
  product: { id: string; name: string; slug: string; priceCents: number };
}

export interface SalesCampaignCategory {
  categoryId: string;
  category: { id: string; name: string; slug: string };
}

export interface SalesCampaign {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  type: SalesCampaignType;
  value: number;
  startsAt: string;
  endsAt: string;
  status: SalesCampaignStatus;
  displayStatus: SalesCampaignDisplayStatus;
  applyTo: SalesCampaignScope;
  badgeText: string | null;
  priority: number;
  productCount: number;
  categoryCount: number;
  products: SalesCampaignProduct[];
  categories: SalesCampaignCategory[];
  createdBy: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface SalesCampaignFormData {
  name: string;
  slug?: string;
  description?: string;
  type: SalesCampaignType;
  value: number;
  startsAt: string;
  endsAt: string;
  applyTo: SalesCampaignScope;
  badgeText?: string;
  priority?: number;
  productIds?: string[];
  productOverrides?: Array<{ productId: string; overrideValue: number }>;
  categoryIds?: string[];
}

export interface VoucherStats {
  totalRedemptions: number;
  revenueImpactCents: number;
  remainingUses: number | null;
  usedCount: number;
  usageLimitGlobal: number | null;
  redemptions?: Array<{
    id: string;
    orderId: string;
    userId: string | null;
    createdAt: string;
    order: { id: string; discountCents: number; totalCents: number; createdAt: string };
  }>;
}
