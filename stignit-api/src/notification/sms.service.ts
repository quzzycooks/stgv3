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
  // Confirmed against the live API: /sms/send returns no per-message id, only
  // a validity count for the recipient list. A "success" envelope only means
  // Sendchamp accepted and queued the request — it is NOT delivery confirmation.
  data?: { business_id?: string; total_contacts?: number; valid_count?: number };
}

/**
 * Sendchamp SMS adapter (PRD 8.1 — reliable Nigerian SMS). All sends go through
 * withRetry (PRD 7.4). No secrets in code — API key comes from config/secrets.
 *
 * "dnd" route bypasses the Do-Not-Disturb registry so transactional codes still
 * reach DND-registered numbers — but ONLY for an approved Sender ID. Without
 * `SENDCHAMP_SENDER_NAME` configured to a registered sender, the request falls
 * back to the shared default name, which carriers silently drop on this route:
 * Sendchamp's API reports "success" (it queued the message) while the SMS never
 * actually reaches the phone. Confirmed live 2026-07-20 — verified against
 * real numbers reachable on-net, response was "success" with valid_count:1, no
 * SMS received. Get an approved Sender ID from the Sendchamp dashboard and set
 * SENDCHAMP_SENDER_NAME before relying on this for production OTP delivery.
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
        if (!senderName) {
          this.logger.warn(
            `SENDCHAMP_SENDER_NAME is not set — falling back to the shared default sender, which is ` +
              `known to be silently dropped on the dnd route. to=${to}`,
          );
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
            sender_name: senderName || 'Sendchamp',
            route: 'dnd',
          }),
        });

        const data = (await res.json().catch(() => ({}))) as SendchampSendResponse;
        const validCount = data.data?.valid_count;
        if (!res.ok || (data.status && data.status !== 'success') || validCount === 0) {
          throw new Error(`Sendchamp send failed (${res.status}): ${data.message ?? JSON.stringify(data)}`);
        }

        // No per-message id is available from this endpoint (see class doc) — log
        // the full envelope so a delivery dispute can at least be timestamp-matched
        // against Sendchamp's own logs.
        this.logger.debug(`[SMS] to=${to} accepted=${JSON.stringify(data.data)}`);
        return {
          provider: 'sendchamp' as const,
          messageId: data.data?.business_id ? `${data.data.business_id}:${Date.now()}` : `sendchamp-${Date.now()}`,
          status: 'sent' as const,
        };
      },
      { label: 'sms.send' },
    );
  }
}
