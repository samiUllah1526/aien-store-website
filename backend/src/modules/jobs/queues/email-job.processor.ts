import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PgbossService } from '../pgboss.service';
import { MailService } from '../../mail/mail.service';
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

type EmailJobData =
  | ({ type: typeof EMAIL_JOB_TYPES.PASSWORD_RESET } & PasswordResetEmailPayload)
  | ({ type: typeof EMAIL_JOB_TYPES.ORDER_CONFIRMATION } & OrderConfirmationEmailPayload)
  | ({ type: typeof EMAIL_JOB_TYPES.ORDER_STATUS_CHANGE } & OrderStatusEmailPayload)
  | ({ type: typeof EMAIL_JOB_TYPES.WELCOME } & WelcomeEmailPayload)
  | ({ type: typeof EMAIL_JOB_TYPES.USER_CREATED } & UserCreatedEmailPayload);

@Injectable()
export class EmailJobProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EmailJobProcessor.name);

  constructor(
    private readonly pgboss: PgbossService,
    private readonly mail: MailService,
  ) {}

  async onModuleInit(): Promise<void> {
    if (!this.pgboss.isStarted()) {
      this.logger.warn('pg-boss not started; email job processor will not run');
      return;
    }

    const boss = this.pgboss.getBoss();

    await boss.createQueue(QUEUE_EMAIL_HIGH);
    await boss.createQueue(QUEUE_EMAIL_DEFAULT);

    await boss.work<EmailJobData>(
      QUEUE_EMAIL_HIGH,
      { localConcurrency: 5 },
      (jobs) => this.processJobs(jobs),
    );
    await boss.work<EmailJobData>(
      QUEUE_EMAIL_DEFAULT,
      { localConcurrency: 3 },
      (jobs) => this.processJobs(jobs),
    );

    this.logger.log('Email job processor started (email-high: 5, email-default: 3)');
  }

  async onModuleDestroy(): Promise<void> {
    if (this.pgboss.isStarted()) {
      const boss = this.pgboss.getBoss();
      await boss.offWork(QUEUE_EMAIL_HIGH);
      await boss.offWork(QUEUE_EMAIL_DEFAULT);
    }
    this.logger.log('Email job processor stopped');
  }

  private async processJobs(
    jobs: Array<{ id: string; data: EmailJobData }>,
  ): Promise<void> {
    for (const job of jobs) {
      try {
        await this.processJob(job.data);
      } catch (err) {
        this.logger.warn(`Email job ${job.id} (${job.data.type}) failed:`, err);
        throw err;
      }
    }
  }

  private async processJob(data: EmailJobData): Promise<void> {
    switch (data.type) {
      case EMAIL_JOB_TYPES.PASSWORD_RESET:
        await this.mail.sendPasswordReset({
          to: data.to,
          name: data.name,
          resetLink: data.resetLink,
        });
        break;
      case EMAIL_JOB_TYPES.ORDER_CONFIRMATION:
        await this.mail.sendOrderConfirmation({
          to: data.to,
          orderId: data.orderId,
          customerName: data.customerName,
          totalCents: data.totalCents,
          currency: data.currency,
          orderDate: data.orderDate,
          items: data.items,
        });
        break;
      case EMAIL_JOB_TYPES.ORDER_STATUS_CHANGE:
        await this.mail.sendOrderStatusChange({
          to: data.to,
          orderId: data.orderId,
          status: data.status,
          statusUpdatedAt: data.statusUpdatedAt,
          customerName: data.customerName,
        });
        break;
      case EMAIL_JOB_TYPES.WELCOME:
        await this.mail.sendWelcome({ to: data.to, name: data.name });
        break;
      case EMAIL_JOB_TYPES.USER_CREATED:
        await this.mail.sendUserCreated({
          to: data.to,
          name: data.name,
          loginUrl: data.loginUrl,
        });
        break;
      default:
        throw new Error(`Unknown email job type: ${(data as { type: string }).type}`);
    }
  }
}
