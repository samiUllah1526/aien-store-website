import { Module } from '@nestjs/common';
import { EmailLogsService } from './email-logs.service';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [MailModule],
  controllers: [],
  providers: [EmailLogsService],
  exports: [EmailLogsService],
})
export class EmailLogsModule {}
