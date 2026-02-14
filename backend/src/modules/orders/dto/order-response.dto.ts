export interface OrderItemResponseDto {
  id: string;
  productId: string;
  productName?: string;
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
  customerEmail: string;
  assignedToUserId: string | null;
  assignedToUserName: string | null;
  items: OrderItemResponseDto[];
  statusHistory: OrderStatusHistoryEntryDto[];
  createdAt: string;
  updatedAt: string;
}
