import { Module } from '@nestjs/common';
import { EmailLogsController } from './email-logs.controller';
import { EmailLogsService } from './email-logs.service';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [MailModule],
  controllers: [EmailLogsController],
  providers: [EmailLogsService],
})
export class EmailLogsModule {}
