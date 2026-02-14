/**
 * Payload for order status change notification emails.
 */
export interface OrderStatusEmailPayload {
  to: string;
  orderId: string;
  status: string;
  statusUpdatedAt: string;
  customerName?: string;
}

export interface IMailService {
  sendOrderStatusChange(payload: OrderStatusEmailPayload): Promise<void>;
}
