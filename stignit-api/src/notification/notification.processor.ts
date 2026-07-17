import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { NOTIFICATION_QUEUE } from '../messaging/queue.tokens';
import { NotificationJob } from './notification.service';
import { PushService } from './push.service';
import { SmsService } from './sms.service';

/** Actually delivers notifications off the request path, with SMS fallback. */
@Processor(NOTIFICATION_QUEUE, { concurrency: 50 })
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(
    private readonly sms: SmsService,
    private readonly push: PushService,
  ) {
    super();
  }

  async process(job: Job<NotificationJob>): Promise<void> {
    const data = job.data;
    if (data.channel === 'sms') {
      await this.sms.send(data.to, data.body);
      return;
    }
    // push
    try {
      await this.push.send(data.target, data.title, data.body);
    } catch (err) {
      if (data.smsFallback) {
        this.logger.warn(`Push failed, falling back to SMS: ${(err as Error).message}`);
        await this.sms.send(data.smsFallback.to, data.smsFallback.body);
      } else {
        throw err;
      }
    }
  }
}
