import { Injectable, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { IMailTransport } from './interfaces/mail.interface';
import {
  IMailService,
  OrderConfirmationEmailPayload,
  OrderStatusEmailPayload,
  WelcomeEmailPayload,
  UserCreatedEmailPayload,
  PasswordResetEmailPayload,
} from './interfaces/mail.interface';
import { MAIL_TRANSPORT } from './constants';
import { renderMjmlTemplate } from './templates/render';

/** Serialize any error to a JSON-safe object for storage. */
function serializeError(err: unknown): Record<string, unknown> {
  const safe = (v: unknown): unknown => {
    if (v === null || v === undefined) return v;
    try {
      JSON.stringify(v);
      return v;
    } catch {
      return String(v);
    }
  };
  if (err instanceof Error) {
    const obj: Record<string, unknown> = {
      name: err.name,
      message: err.message,
      stack: err.stack,
    };
    const anyErr = err as unknown as Record<string, unknown>;
    if (anyErr.code != null) obj.code = anyErr.code;
    if (anyErr.response != null) {
      const res = anyErr.response as Record<string, unknown>;
      obj.response = {
        status: res.status,
        statusText: res.statusText,
        data: safe(res.data),
      };
    }
    return obj;
  }
  if (typeof err === 'object' && err !== null) {
    try {
      return JSON.parse(JSON.stringify(err));
    } catch {
      return { raw: String(err) };
    }
  }
  return { value: String(err) };
}

@Injectable()
export class MailService implements IMailService {
  private readonly logger = new Logger(MailService.name);
  private readonly fromEmail: string;
  private readonly fromName: string;
  private readonly companyName: string;
  private readonly appUrl: string;
  private readonly adminLoginUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    @Inject(MAIL_TRANSPORT) private readonly transport: IMailTransport,
  ) {
    this.fromEmail =
      this.configService.get<string>('MAIL_FROM_EMAIL') ?? 'orders@example.com';
    this.fromName =
      this.configService.get<string>('MAIL_FROM_NAME') ?? 'E-Commerce';
    this.companyName =
      this.configService.get<string>('MAIL_COMPANY_NAME') ?? this.fromName;
    this.appUrl =
      this.configService.get<string>('APP_URL') ?? 'https://example.com';
    this.adminLoginUrl =
      this.configService.get<string>('ADMIN_LOGIN_URL') ??
      `${this.appUrl.replace(/\/$/, '')}/admin/login`;
  }

  async sendOrderConfirmation(
    payload: OrderConfirmationEmailPayload,
  ): Promise<string> {
    const subject = `Order confirmed – ${payload.orderId}`;
    const metadata = { orderId: payload.orderId };
    let content: { subject: string; text?: string; html?: string } | null = null;
    try {
      const totalFormatted = this.formatCurrency(
        payload.totalCents,
        payload.currency,
      );
      const itemsTableHtml = this.buildOrderItemsTableHtml(payload.items);
      const { html, text } = renderMjmlTemplate('order-confirmation', {
        customerName: payload.customerName ?? 'Customer',
        orderId: payload.orderId,
        orderDate: payload.orderDate,
        totalFormatted,
        companyName: this.companyName,
        itemsTable_html: itemsTableHtml,
      });
      content = { subject, text, html };
      await this.transport.send({
        to: payload.to,
        from: this.fromEmail,
        fromName: this.fromName,
        subject,
        text,
        html,
      });
      const logId = await this.logEmail({ type: 'order-confirmation', to: payload.to, subject, status: 'sent', metadata, content });
      this.logger.log(`Email sent: order-confirmation to ${payload.to} (order ${payload.orderId})`);
      return logId ?? '';
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await this.logEmail({ type: 'order-confirmation', to: payload.to, subject, status: 'failed', error: serializeError(err), metadata, content: content ?? undefined });
      this.logger.warn(`Email failed: order-confirmation to ${payload.to}: ${msg}`);
      throw err;
    }
  }

  async sendOrderStatusChange(payload: OrderStatusEmailPayload): Promise<string> {
    const subject = `Order ${payload.orderId} – Status: ${payload.status}`;
    const metadata = { orderId: payload.orderId, status: payload.status };
    let content: { subject: string; text?: string; html?: string } | null = null;
    try {
      const { html, text } = renderMjmlTemplate('order-status-change', {
        customerName: payload.customerName ?? 'Customer',
        orderId: payload.orderId,
        status: payload.status,
        statusUpdatedAt: payload.statusUpdatedAt,
        companyName: this.companyName,
      });
      content = { subject, text, html };
      await this.transport.send({
        to: payload.to,
        from: this.fromEmail,
        fromName: this.fromName,
        subject,
        text,
        html,
      });
      const logId = await this.logEmail({ type: 'order-status-change', to: payload.to, subject, status: 'sent', metadata, content });
      this.logger.log(`Email sent: order-status-change to ${payload.to} (order ${payload.orderId}, status ${payload.status})`);
      return logId ?? '';
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await this.logEmail({ type: 'order-status-change', to: payload.to, subject, status: 'failed', error: serializeError(err), metadata, content: content ?? undefined });
      this.logger.warn(`Email failed: order-status-change to ${payload.to}: ${msg}`);
      throw err;
    }
  }

  async sendWelcome(payload: WelcomeEmailPayload): Promise<string> {
    const subject = `Welcome to ${this.companyName}`;
    let content: { subject: string; text?: string; html?: string } | null = null;
    try {
      const { html, text } = renderMjmlTemplate('welcome', {
        name: payload.name,
        companyName: this.companyName,
      });
      content = { subject, text, html };
      await this.transport.send({
        to: payload.to,
        from: this.fromEmail,
        fromName: this.fromName,
        subject,
        text,
        html,
      });
      const logId = await this.logEmail({ type: 'welcome', to: payload.to, subject, status: 'sent', content });
      this.logger.log(`Email sent: welcome to ${payload.to}`);
      return logId ?? '';
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await this.logEmail({ type: 'welcome', to: payload.to, subject, status: 'failed', error: serializeError(err), content: content ?? undefined });
      this.logger.warn(`Email failed: welcome to ${payload.to}: ${msg}`);
      throw err;
    }
  }

  async sendUserCreated(payload: UserCreatedEmailPayload): Promise<string> {
    const subject = `Your account has been created – ${this.companyName}`;
    let content: { subject: string; text?: string; html?: string } | null = null;
    try {
      const loginUrl = payload.loginUrl ?? this.adminLoginUrl;
      const { html, text } = renderMjmlTemplate('user-created', {
        name: payload.name,
        loginUrl,
        companyName: this.companyName,
      });
      content = { subject, text, html };
      await this.transport.send({
        to: payload.to,
        from: this.fromEmail,
        fromName: this.fromName,
        subject,
        text,
        html,
      });
      const logId = await this.logEmail({ type: 'user-created', to: payload.to, subject, status: 'sent', content });
      this.logger.log(`Email sent: user-created to ${payload.to}`);
      return logId ?? '';
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await this.logEmail({ type: 'user-created', to: payload.to, subject, status: 'failed', error: serializeError(err), content: content ?? undefined });
      this.logger.warn(`Email failed: user-created to ${payload.to}: ${msg}`);
      throw err;
    }
  }

  async sendPasswordReset(payload: PasswordResetEmailPayload): Promise<string> {
    const subject = `Reset your password – ${this.companyName}`;
    let content: { subject: string; text?: string; html?: string } | null = null;
    try {
      const { html, text } = renderMjmlTemplate('password-reset', {
        name: payload.name,
        resetLink: payload.resetLink,
        companyName: this.companyName,
      });
      content = { subject, text, html };
      await this.transport.send({
        to: payload.to,
        from: this.fromEmail,
        fromName: this.fromName,
        subject,
        text,
        html,
      });
      const logId = await this.logEmail({ type: 'password-reset', to: payload.to, subject, status: 'sent', content });
      this.logger.log(`Email sent: password-reset to ${payload.to}`);
      return logId ?? '';
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await this.logEmail({ type: 'password-reset', to: payload.to, subject, status: 'failed', error: serializeError(err), content: content ?? undefined });
      this.logger.warn(`Email failed: password-reset to ${payload.to}: ${msg}`);
      throw err;
    }
  }

  private async logEmail(params: {
    type: string;
    to: string;
    subject: string;
    status: 'sent' | 'failed';
    error?: Record<string, unknown>;
    content?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
  }): Promise<string | null> {
    try {
      const log = await this.prisma.emailLog.create({
        data: {
          type: params.type,
          to: params.to,
          subject: params.subject,
          status: params.status,
          ...(params.error != null && { error: params.error as Prisma.InputJsonValue }),
          ...(params.content != null && { content: params.content as Prisma.InputJsonValue }),
          ...(params.metadata != null && { metadata: params.metadata as Prisma.InputJsonValue }),
        },
      });
      return log.id;
    } catch (e) {
      this.logger.warn('Failed to write EmailLog', e);
      return null;
    }
  }

  private formatCurrency(cents: number, currency: string): string {
    const value = (cents / 100).toFixed(2);
    const withCommas = value.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return currency ? `${currency} ${withCommas}` : withCommas;
  }

  private buildOrderItemsTableHtml(
    items: Array<{ productName: string; quantity: number; unitCents: number }>,
  ): string {
    const rows = items
      .map(
        (i) =>
          `<tr><td style="padding:8px 12px;border-bottom:1px solid #eee">${this.escapeHtml(i.productName)}</td><td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center">${i.quantity}</td><td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right">${this.formatCurrency(i.unitCents, '')}</td><td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right">${this.formatCurrency(i.quantity * i.unitCents, '')}</td></tr>`,
      )
      .join('');
    return `<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-top:8px"><thead><tr><th style="padding:8px 12px;text-align:left;border-bottom:2px solid #ddd">Product</th><th style="padding:8px 12px;text-align:center;border-bottom:2px solid #ddd">Qty</th><th style="padding:8px 12px;text-align:right;border-bottom:2px solid #ddd">Unit</th><th style="padding:8px 12px;text-align:right;border-bottom:2px solid #ddd">Total</th></tr></thead><tbody>${rows}</tbody></table>`;
  }

  private escapeHtml(s: string): string {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
