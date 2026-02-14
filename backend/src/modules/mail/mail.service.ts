import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sgMail from '@sendgrid/mail';
import {
  IMailService,
  OrderStatusEmailPayload,
} from './interfaces/mail.interface';

@Injectable()
export class MailService implements IMailService {
  private readonly fromEmail: string;
  private readonly useSendGrid: boolean;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('SENDGRID_API_KEY');
    this.useSendGrid = Boolean(apiKey);
    if (this.useSendGrid && apiKey) {
      sgMail.setApiKey(apiKey);
    }
    this.fromEmail =
      this.configService.get<string>('MAIL_FROM_EMAIL') ||
      'orders@example.com';
  }

  async sendOrderStatusChange(payload: OrderStatusEmailPayload): Promise<void> {
    const subject = `Order ${payload.orderId} – Status: ${payload.status}`;
    const text = this.buildPlainText(payload);
    const html = this.buildHtml(payload);

    if (this.useSendGrid) {
      await sgMail.send({
        to: payload.to,
        from: this.fromEmail,
        subject,
        text,
        html,
      });
    } else {
      // Mock: log to console (e.g. development or no API key)
      console.log('[MailService] Order status email (mock)', {
        to: payload.to,
        orderId: payload.orderId,
        status: payload.status,
        subject,
        text: text.slice(0, 80) + '...',
      });
    }
  }

  private buildPlainText(payload: OrderStatusEmailPayload): string {
    const name = payload.customerName || 'Customer';
    return [
      `Hello ${name},`,
      '',
      `Your order ${payload.orderId} status has been updated.`,
      `New status: ${payload.status}`,
      `Updated at: ${payload.statusUpdatedAt}`,
      '',
      'Thank you for your order.',
    ].join('\n');
  }

  private buildHtml(payload: OrderStatusEmailPayload): string {
    const name = payload.customerName || 'Customer';
    return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Order Status Update</title></head>
<body style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
  <p>Hello ${this.escapeHtml(name)},</p>
  <p>Your order <strong>${this.escapeHtml(payload.orderId)}</strong> status has been updated.</p>
  <p><strong>New status:</strong> ${this.escapeHtml(payload.status)}</p>
  <p><strong>Updated at:</strong> ${this.escapeHtml(payload.statusUpdatedAt)}</p>
  <p>Thank you for your order.</p>
</body>
</html>`.trim();
  }

  private escapeHtml(s: string): string {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
