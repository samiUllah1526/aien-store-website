import { Injectable } from '@nestjs/common';
import { IMailTransport, SendMailOptions } from '../interfaces/mail.interface';

@Injectable()
export class MockMailTransport implements IMailTransport {
  async send(options: SendMailOptions): Promise<void> {
    console.log('[MailTransport] Mock send', {
      to: options.to,
      from: options.from,
      subject: options.subject,
      textPreview: options.text?.slice(0, 80) + (options.text && options.text.length > 80 ? '...' : ''),
    });
  }
}
