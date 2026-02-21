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

export interface DashboardStats {
  totalProducts: number;
  totalOrders: number;
  ordersByStatus: OrdersByStatus;
  ordersOverTime: OrdersOverTimeItem[];
  salesByCategory: SalesByCategoryItem[];
}
