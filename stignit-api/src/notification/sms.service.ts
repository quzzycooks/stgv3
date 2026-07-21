import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { withRetry } from '../common/retry';

export interface SmsResult {
  provider: 'africastalking';
  messageId: string;
  status: 'sent' | 'failed';
}

const AFRICASTALKING_SEND_URL = 'https://api.africastalking.com/version1/messaging';

interface AfricasTalkingRecipient {
  number: string;
  status: string;
  statusCode: number;
  cost?: string;
  messageId?: string;
}

interface AfricasTalkingSendResponse {
  SMSMessageData?: {
    Message: string;
    Recipients: AfricasTalkingRecipient[];
  };
}

/**
 * Africa's Talking SMS adapter (replaces Sendchamp — confirmed live 2026-07-20
 * that Sendchamp's /sms/send reports "success" on every call while silently
 * dropping delivery regardless of sender name or route; see git history on
 * this file for that investigation).
 *
 * A 200 response here is NOT enough on its own to mean delivered — Africa's
 * Talking can return HTTP 200 with an empty Recipients array and a top-level
 * error message (e.g. "InvalidSenderId"). The only trustworthy success signal
 * is a per-recipient statusCode of 100, which also comes with a real
 * messageId and a real deducted cost — confirmed live against a real Nigerian
 * number using the account's default sender (no `from` set).
 *
 * The custom "STIGNIT" alphanumeric sender ID is registered but not yet
 * live (rejected with InvalidSenderId as of 2026-07-21) — likely still
 * propagating through carrier approval. Once AFRICASTALKING_SENDER_ID is
 * confirmed working, set it; until then this omits `from` entirely and uses
 * the account's default shared sender, which is confirmed to deliver.
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
        const apiKey = this.config.get<string>('integrations.africastalkingApiKey');
        const username = this.config.get<string>('integrations.africastalkingUsername');
        const senderId = this.config.get<string>('integrations.africastalkingSenderId');
        if (!apiKey) {
          // Dev/test: no provider configured — simulate a successful send.
          this.logger.debug(`[SMS stub] to=${to} body="${body.slice(0, 40)}…"`);
          return { provider: 'africastalking' as const, messageId: `stub-${Date.now()}`, status: 'sent' as const };
        }

        const params = new URLSearchParams({ username: username || 'stignit', to, message: body });
        if (senderId) params.set('from', senderId);

        const res = await fetch(AFRICASTALKING_SEND_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Accept: 'application/json',
            apiKey,
          },
          body: params.toString(),
        });

        const data = (await res.json().catch(() => ({}))) as AfricasTalkingSendResponse;
        const recipient = data.SMSMessageData?.Recipients?.[0];
        if (!res.ok || !recipient || recipient.statusCode !== 100) {
          throw new Error(
            `Africa's Talking send failed (${res.status}): ${recipient?.status ?? data.SMSMessageData?.Message ?? JSON.stringify(data)}`,
          );
        }

        this.logger.debug(`[SMS] to=${to} messageId=${recipient.messageId} cost=${recipient.cost}`);
        return {
          provider: 'africastalking' as const,
          messageId: recipient.messageId ?? `africastalking-${Date.now()}`,
          status: 'sent' as const,
        };
      },
      { label: 'sms.send' },
    );
  }
}
