import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { withRetry } from '../common/retry';

export interface SmsResult {
  provider: 'sendchamp';
  messageId: string;
  status: 'sent' | 'failed';
}

const SENDCHAMP_SEND_URL = 'https://api.sendchamp.com/api/v1/sms/send';

interface SendchampSendResponse {
  status?: string;
  message?: string;
  data?: { id?: string; status?: string };
}

/**
 * Sendchamp SMS adapter (PRD 8.1 — reliable Nigerian SMS). All sends go through
 * withRetry (PRD 7.4). No secrets in code — API key comes from config/secrets.
 * "dnd" route bypasses the Do-Not-Disturb registry so transactional codes
 * still reach DND-registered numbers.
 */
@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  constructor(private readonly config: ConfigService) {}

  async send(to: string, body: string): Promise<SmsResult> {
    // Critical alert payloads are constrained (<5KB, PRD 7.4). SMS bodies are tiny
    // but we guard against accidental oversized content.
    if (Buffer.byteLength(body, 'utf8') > 1600) {
      throw new Error('SMS body exceeds safe length');
    }
    return withRetry(
      async () => {
        const apiKey = this.config.get<string>('integrations.sendchampApiKey');
        const senderName = this.config.get<string>('integrations.sendchampSenderName');
        if (!apiKey) {
          // Dev/test: no provider configured — simulate a successful send.
          this.logger.debug(`[SMS stub] to=${to} body="${body.slice(0, 40)}…"`);
          return { provider: 'sendchamp' as const, messageId: `stub-${Date.now()}`, status: 'sent' as const };
        }

        const res = await fetch(SENDCHAMP_SEND_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            to: [to],
            message: body,
            sender_name: senderName,
            route: 'dnd',
          }),
        });

        const data = (await res.json().catch(() => ({}))) as SendchampSendResponse;
        if (!res.ok || (data.status && data.status !== 'success')) {
          throw new Error(`Sendchamp send failed (${res.status}): ${data.message ?? 'unknown error'}`);
        }

        this.logger.debug(`[SMS] to=${to} messageId=${data.data?.id}`);
        return {
          provider: 'sendchamp' as const,
          messageId: data.data?.id ?? `sendchamp-${Date.now()}`,
          status: 'sent' as const,
        };
      },
      { label: 'sms.send' },
    );
  }
}
