import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { withRetry } from '../common/retry';

export interface EmailResult {
  provider: 'resend';
  messageId: string;
  status: 'sent' | 'failed';
}

const RESEND_SEND_URL = 'https://api.resend.com/emails';

interface ResendSendResponse {
  id?: string;
  message?: string;
  name?: string;
}

/**
 * Resend email adapter — used for the email-OTP signup alternative to phone
 * OTP (PRD 6.1.1 alt. flow). Mirrors SmsService's shape: no API key configured
 * simulates a send for dev/test rather than failing.
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  constructor(private readonly config: ConfigService) {}

  async send(to: string, subject: string, text: string): Promise<EmailResult> {
    return withRetry(
      async () => {
        const apiKey = this.config.get<string>('integrations.resendApiKey');
        const from = this.config.get<string>('integrations.resendFromEmail');
        if (!apiKey) {
          this.logger.debug(`[Email stub] to=${to} subject="${subject}"`);
          return { provider: 'resend' as const, messageId: `stub-${Date.now()}`, status: 'sent' as const };
        }

        const res = await fetch(RESEND_SEND_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({ from, to, subject, text }),
        });

        const data = (await res.json().catch(() => ({}))) as ResendSendResponse;
        if (!res.ok || !data.id) {
          throw new Error(`Resend send failed (${res.status}): ${data.message ?? JSON.stringify(data)}`);
        }

        this.logger.debug(`[Email] to=${to} messageId=${data.id}`);
        return { provider: 'resend' as const, messageId: data.id, status: 'sent' as const };
      },
      { label: 'email.send' },
    );
  }
}
