import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { withRetry } from '../common/retry';

export interface PushResult {
  provider: 'fcm';
  messageId: string;
  status: 'sent' | 'failed';
}

/**
 * FCM push adapter (PRD 8.1). Stubbed HTTP; withRetry wrapped (7.4). Callers
 * fall back to SMS when push is unavailable (edge case: FCM down, PRD §13).
 */
@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  constructor(private readonly config: ConfigService) {}

  async send(deviceTokenOrTopic: string, title: string, body: string): Promise<PushResult> {
    return withRetry(
      async () => {
        const project = this.config.get<string>('integrations.fcmProjectId');
        if (!project) {
          this.logger.debug(`[Push stub] target=${deviceTokenOrTopic} title="${title}"`);
          return { provider: 'fcm' as const, messageId: `stub-${Date.now()}`, status: 'sent' as const };
        }
        // TODO(deploy): FCM HTTP v1 send.
        return { provider: 'fcm' as const, messageId: `fcm-${Date.now()}`, status: 'sent' as const };
      },
      { label: 'push.send' },
    );
  }
}
