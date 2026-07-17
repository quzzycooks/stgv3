import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { withRetry } from '../common/retry';

export interface SmsResult {
  provider: 'termii';
  messageId: string;
  status: 'sent' | 'failed';
}

/**
 * Termii SMS adapter (PRD 8.1 — reliable Nigerian SMS). Actual HTTP call is
 * stubbed; wiring the Termii REST API is a deployment task. All sends go through
 * withRetry (PRD 7.4). No secrets in code — API key comes from config/secrets.
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
        const apiKey = this.config.get<string>('integrations.termiiApiKey');
        if (!apiKey) {
          // Dev/test: no provider configured — simulate a successful send.
          this.logger.debug(`[SMS stub] to=${to} body="${body.slice(0, 40)}…"`);
          return { provider: 'termii' as const, messageId: `stub-${Date.now()}`, status: 'sent' as const };
        }
        // TODO(deploy): POST https://api.ng.termii.com/api/sms/send with apiKey.
        this.logger.debug(`[SMS] to=${to}`);
        return { provider: 'termii' as const, messageId: `termii-${Date.now()}`, status: 'sent' as const };
      },
      { label: 'sms.send' },
    );
  }
}
