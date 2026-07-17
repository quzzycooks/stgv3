import { Injectable, Logger } from '@nestjs/common';

/**
 * Email adapter for institutional partners (PRD 6.8.3). Stubbed transport;
 * wiring a provider (SES/Postmark) is a deployment task. Failures throw so the
 * queue's retry/backoff and the FLAGGED fallback engage.
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  async send(to: string, subject: string, body: string): Promise<{ messageId: string }> {
    this.logger.debug(`[Email stub] to=${to} subject="${subject}"`);
    // TODO(deploy): integrate SES/Postmark; throw on non-2xx.
    return { messageId: `stub-${Date.now()}` };
  }
}
