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

/**
 * Payload for order confirmation (sent when order is created).
 */
export interface OrderConfirmationEmailPayload {
  to: string;
  orderId: string;
  customerName?: string;
  totalCents: number;
  currency: string;
  orderDate: string;
  items: Array<{ productName: string; quantity: number; unitCents: number }>;
}

/**
 * Payload for welcome email (e.g. after registration).
 */
export interface WelcomeEmailPayload {
  to: string;
  name: string;
}

/**
 * Payload for user-created email (admin created a user account).
 */
export interface UserCreatedEmailPayload {
  to: string;
  name: string;
  /** Admin login URL; if omitted, MailService uses ADMIN_LOGIN_URL config. */
  loginUrl?: string;
}

export interface IMailService {
  sendOrderConfirmation(payload: OrderConfirmationEmailPayload): Promise<void>;
  sendOrderStatusChange(payload: OrderStatusEmailPayload): Promise<void>;
  sendWelcome(payload: WelcomeEmailPayload): Promise<void>;
  sendUserCreated(payload: UserCreatedEmailPayload): Promise<void>;
}

/**
 * Provider-agnostic options for sending a single email.
 * Implementations (Brevo, SendGrid, SMTP, etc.) adapt this to their API.
 */
export interface SendMailOptions {
  to: string;
  from: string;
  fromName?: string;
  subject: string;
  text?: string;
  html?: string;
}

/**
 * Low-level transport: send one email. Swap providers by changing implementation.
 */
export interface IMailTransport {
  send(options: SendMailOptions): Promise<void>;
}
