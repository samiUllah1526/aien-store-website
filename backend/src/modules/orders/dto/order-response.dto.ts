export interface OrderItemResponseDto {
  id: string;
  productId: string;
  productName?: string;
  /** First product image path for admin display (e.g. /media/file/...) */
  productImage?: string | null;
  quantity: number;
  unitCents: number;
}

export interface OrderStatusHistoryEntryDto {
  status: string;
  createdAt: string;
}

export interface OrderResponseDto {
  id: string;
  status: string;
  totalCents: number;
  currency: string;
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
  /** Path for payment proof image (e.g. "payment-proofs/uuid.jpg"). Build URL as baseUrl + "/media/file/" + path. */
  paymentProofPath: string | null;
  courierServiceName: string | null;
  trackingId: string | null;
  assignedToUserId: string | null;
  assignedToUserName: string | null;
  items: OrderItemResponseDto[];
  statusHistory: OrderStatusHistoryEntryDto[];
  createdAt: string;
  updatedAt: string;
}
