import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { Prisma } from '@prisma/client';
import type { EmailLogQueryDto } from './dto/email-log-query.dto';

@Injectable()
export class EmailLogsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  async findOne(id: string): Promise<{
    id: string;
    type: string;
    to: string;
    subject: string;
    status: string;
    error: unknown;
    content: unknown;
    metadata: unknown;
    createdAt: string;
  }> {
    const log = await this.prisma.emailLog.findUnique({ where: { id } });
    if (!log) {
      throw new NotFoundException(`Email log "${id}" not found`);
    }
    return {
      id: log.id,
      type: log.type,
      to: log.to,
      subject: log.subject,
      status: log.status,
      error: log.error,
      content: log.content,
      metadata: log.metadata,
      createdAt: log.createdAt.toISOString(),
    };
  }

  async findAll(query: EmailLogQueryDto): Promise<{ data: unknown[]; total: number }> {
    const { page = 1, limit = 20, status, type } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.EmailLogWhereInput = {};
    if (status) where.status = status;
    if (type) where.type = type;

    const [logs, total] = await Promise.all([
      this.prisma.emailLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.emailLog.count({ where }),
    ]);

    const data = logs.map((log) => ({
      id: log.id,
      type: log.type,
      to: log.to,
      subject: log.subject,
      status: log.status,
      error: log.error,
      content: log.content,
      metadata: log.metadata,
      createdAt: log.createdAt.toISOString(),
    }));

    return { data, total };
  }

  async resend(id: string): Promise<{ success: boolean; message: string }> {
    const log = await this.prisma.emailLog.findUnique({ where: { id } });
    if (!log) {
      throw new NotFoundException(`Email log "${id}" not found`);
    }
    if (log.status !== 'failed') {
      throw new BadRequestException('Only failed emails can be resent');
    }

    const metadata = log.metadata as Record<string, string> | null;
    const to = log.to;

    try {
      switch (log.type) {
        case 'order-confirmation': {
          const orderId = metadata?.orderId;
          if (!orderId) throw new BadRequestException('Missing orderId in email log metadata');
          const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            include: {
              items: { include: { product: { select: { name: true } } } },
            },
          });
          if (!order) throw new NotFoundException(`Order ${orderId} not found`);
          await this.mail.sendOrderConfirmation({
            to: order.customerEmail,
            orderId: order.id,
            customerName: order.customerName ?? undefined,
            totalCents: order.totalCents,
            currency: order.currency,
            orderDate: order.createdAt.toISOString(),
            items: order.items.map((i) => ({
              productName: i.product.name,
              quantity: i.quantity,
              unitCents: i.unitCents,
            })),
          });
          break;
        }
        case 'order-status-change': {
          const orderId = metadata?.orderId;
          const status = metadata?.status;
          if (!orderId || !status) throw new BadRequestException('Missing orderId or status in email log metadata');
          const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            include: { statusHistory: { orderBy: { createdAt: 'desc' }, take: 1 } },
          });
          if (!order) throw new NotFoundException(`Order ${orderId} not found`);
          const latest = order.statusHistory[0];
          const statusUpdatedAt = latest?.createdAt.toISOString() ?? new Date().toISOString();
          await this.mail.sendOrderStatusChange({
            to: order.customerEmail,
            orderId: order.id,
            status: status as string,
            statusUpdatedAt,
            customerName: order.customerName ?? undefined,
          });
          break;
        }
        case 'welcome': {
          const user = await this.prisma.user.findFirst({ where: { email: to } });
          if (!user) throw new NotFoundException(`User with email ${to} not found`);
          await this.mail.sendWelcome({ to: user.email, name: user.name });
          break;
        }
        case 'user-created': {
          const user = await this.prisma.user.findFirst({ where: { email: to } });
          if (!user) throw new NotFoundException(`User with email ${to} not found`);
          await this.mail.sendUserCreated({ to: user.email, name: user.name });
          break;
        }
        default:
          throw new BadRequestException(`Resend not supported for type "${log.type}"`);
      }
      return { success: true, message: 'Email resent successfully' };
    } catch (err) {
      if (err instanceof NotFoundException || err instanceof BadRequestException) throw err;
      const msg = err instanceof Error ? err.message : String(err);
      throw new BadRequestException(`Resend failed: ${msg}`);
    }
  }
}
