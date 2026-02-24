import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PgbossService } from './pgboss.service';
import { EmailQueueService } from './queues/email-queue.service';
import { EmailJobProcessor } from './queues/email-job.processor';
import { MailModule } from '../mail/mail.module';

@Global()
@Module({
  imports: [ConfigModule, MailModule],
  providers: [PgbossService, EmailQueueService, EmailJobProcessor],
  exports: [PgbossService, EmailQueueService],
})
export class JobsModule {}
