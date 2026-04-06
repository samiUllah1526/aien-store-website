export interface OrdersByStatus {
  PENDING: number;
  CONFIRMED: number;
  PROCESSING: number;
  SHIPPED: number;
  DELIVERED: number;
  CANCELLED: number;
}

export interface OrdersOverTimeItem {
  date: string;
  count: number;
  totalCents: number;
}

export interface SalesByCategoryItem {
  categoryId: string | null;
  categoryName: string;
  totalCents: number;
  orderCount: number;
}

export interface PromotionOverTimeItem {
  date: string;
  campaignRevenueCents: number;
  campaignSavingsCents: number;
  voucherDiscountCents: number;
  voucherRedemptions: number;
}

export interface TopCampaignItem {
  campaignId: string;
  campaignName: string;
  revenueCents: number;
  itemsSold: number;
  savingsCents: number;
}

export interface DashboardStats {
  totalProducts: number;
  totalOrders: number;
  ordersByStatus: OrdersByStatus;
  ordersOverTime: OrdersOverTimeItem[];
  salesByCategory: SalesByCategoryItem[];

  activeCampaigns: number;
  campaignRevenueCents: number;
  campaignSavingsCents: number;
  activeVouchers: number;
  voucherRedemptionsCount: number;
  promotionOverTime: PromotionOverTimeItem[];
  topCampaigns: TopCampaignItem[];
}
