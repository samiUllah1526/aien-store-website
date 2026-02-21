import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  TransactionalEmailsApi,
  TransactionalEmailsApiApiKeys,
  SendSmtpEmail,
} from '@getbrevo/brevo';
import { IMailTransport, SendMailOptions } from '../interfaces/mail.interface';

@Injectable()
export class BrevoTransport implements IMailTransport {
  private readonly api: TransactionalEmailsApi;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('BREVO_API_KEY');
    if (!apiKey) {
      throw new Error('BREVO_API_KEY is required when MAIL_PROVIDER=brevo');
    }
    this.api = new TransactionalEmailsApi();
    this.api.setApiKey(TransactionalEmailsApiApiKeys.apiKey, apiKey);
  }

  async send(options: SendMailOptions): Promise<void> {
    const message = new SendSmtpEmail();
    message.sender = {
      email: options.from,
      name: options.fromName ?? 'E-Commerce',
    };
    message.to = [{ email: options.to }];
    message.subject = options.subject;
    message.textContent = options.text ?? undefined;
    // Brevo accepts either; provide minimal HTML if only text is set
    message.htmlContent = options.html ?? (options.text ? `<p>${escapeHtml(options.text)}</p>` : '<p></p>');

    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await this.api.sendTransacEmail(message);
        return;
      } catch (err) {
        const isRetryable =
          err &&
          typeof err === 'object' &&
          (String((err as { code?: string }).code) === 'ECONNRESET' ||
            String((err as { message?: string }).message).toLowerCase().includes('socket hang up'));
        if (isRetryable && attempt < maxAttempts) {
          await sleep(500 * attempt);
          continue;
        }
        throw err;
      }
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
