import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
// import * as sgMail from '@sendgrid/mail';
import { IMailTransport, SendMailOptions } from '../interfaces/mail.interface';

/** SendGrid transport — currently disabled. Uncomment code below and run: npm install @sendgrid/mail */
@Injectable()
export class SendgridTransport implements IMailTransport {
  private readonly fromEmail: string;
  private readonly fromName: string;

  constructor(private readonly configService: ConfigService) {
    // const apiKey = this.configService.get<string>('SENDGRID_API_KEY');
    // if (!apiKey) {
    //   throw new Error('SENDGRID_API_KEY is required when MAIL_PROVIDER=sendgrid');
    // }
    // sgMail.setApiKey(apiKey);
    this.fromEmail =
      this.configService.get<string>('MAIL_FROM_EMAIL') ?? 'noreply@example.com';
    this.fromName =
      this.configService.get<string>('MAIL_FROM_NAME') ?? 'E-Commerce';
  }

  async send(_options: SendMailOptions): Promise<void> {
    throw new Error(
      'SendGrid is currently disabled. Uncomment the code in sendgrid.transport.ts and run: npm install @sendgrid/mail',
    );
    // await sgMail.send({
    //   to: options.to,
    //   from: { email: options.from, name: options.fromName ?? this.fromName },
    //   subject: options.subject,
    //   text: options.text ?? '',
    //   html: options.html ?? '',
    // });
  }
}
