import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PgbossService } from './pgboss.service';
import { EmailQueueService } from './queues/email-queue.service';
import { EmailJobProcessor } from './queues/email-job.processor';
import { JobsAdminService } from './jobs-admin.service';
import { JobsAdminController } from './jobs-admin.controller';
import { MailModule } from '../mail/mail.module';

@Global()
@Module({
  imports: [ConfigModule, MailModule],
  controllers: [JobsAdminController],
  providers: [PgbossService, EmailQueueService, EmailJobProcessor, JobsAdminService],
  exports: [PgbossService, EmailQueueService],
})
export class JobsModule {}
