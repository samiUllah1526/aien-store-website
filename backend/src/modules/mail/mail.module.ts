import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MailService } from './mail.service';
import { MAIL_TRANSPORT } from './constants';
import type { IMailTransport } from './interfaces/mail.interface';
import { BrevoTransport } from './transports/brevo.transport';
import { SendgridTransport } from './transports/sendgrid.transport';
import { MockMailTransport } from './transports/mock.transport';
import type { MailProviderType } from './constants';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: MAIL_TRANSPORT,
      useFactory: (config: ConfigService): IMailTransport => {
        const provider = (config.get<string>('MAIL_PROVIDER') ?? 'mock').toLowerCase() as MailProviderType;
        switch (provider) {
          case 'brevo':
            return new BrevoTransport(config);
          case 'sendgrid':
            return new SendgridTransport(config);
          default:
            return new MockMailTransport();
        }
      },
      inject: [ConfigService],
    },
    MailService,
  ],
  exports: [MailService],
})
export class MailModule {}
