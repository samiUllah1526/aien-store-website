import { Injectable } from '@nestjs/common';
import { PgbossService } from '../pgboss.service';
import {
  QUEUE_EMAIL_HIGH,
  QUEUE_EMAIL_DEFAULT,
  EMAIL_JOB_TYPES,
} from '../jobs.constants';
import type {
  OrderConfirmationEmailPayload,
  OrderStatusEmailPayload,
  WelcomeEmailPayload,
  UserCreatedEmailPayload,
  PasswordResetEmailPayload,
} from '../../mail/interfaces/mail.interface';

@Injectable()
export class EmailQueueService {
  constructor(private readonly pgboss: PgbossService) {}

  /** Enqueue order confirmation email (default priority). */
  async enqueueOrderConfirmation(payload: OrderConfirmationEmailPayload): Promise<string | null> {
    return this.send(QUEUE_EMAIL_DEFAULT, EMAIL_JOB_TYPES.ORDER_CONFIRMATION, payload);
  }

  /** Enqueue order status change email (default priority). */
  async enqueueOrderStatusChange(payload: OrderStatusEmailPayload): Promise<string | null> {
    return this.send(QUEUE_EMAIL_DEFAULT, EMAIL_JOB_TYPES.ORDER_STATUS_CHANGE, payload);
  }

  /** Enqueue welcome email (default priority). */
  async enqueueWelcome(payload: WelcomeEmailPayload): Promise<string | null> {
    return this.send(QUEUE_EMAIL_DEFAULT, EMAIL_JOB_TYPES.WELCOME, payload);
  }

  /** Enqueue user-created email (default priority). */
  async enqueueUserCreated(payload: UserCreatedEmailPayload): Promise<string | null> {
    return this.send(QUEUE_EMAIL_DEFAULT, EMAIL_JOB_TYPES.USER_CREATED, payload);
  }

  /** Enqueue password reset email (high priority - token expires in 1h). */
  async enqueuePasswordReset(payload: PasswordResetEmailPayload): Promise<string | null> {
    return this.send(QUEUE_EMAIL_HIGH, EMAIL_JOB_TYPES.PASSWORD_RESET, payload);
  }

  private async send(
    queue: string,
    type: string,
    payload: object,
  ): Promise<string | null> {
    if (!this.pgboss.isStarted()) {
      return null;
    }
    try {
      const boss = this.pgboss.getBoss();
      await boss.createQueue(queue);
      const id = await boss.send(queue, { type, ...payload });
      return id ?? null;
    } catch (err) {
      console.warn(`[EmailQueueService] Failed to enqueue ${type}:`, err);
      return null;
    }
  }
}
