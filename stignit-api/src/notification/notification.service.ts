import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import type { Queue } from 'bullmq';
import { NOTIFICATION_QUEUE } from '../messaging/queue.tokens';

export type NotificationJob =
  | { channel: 'sms'; to: string; body: string }
  | {
      channel: 'push';
      target: string;
      title: string;
      body: string;
      /** If push fails, fall back to SMS (PRD 7.4 / §13 FCM-down handling). */
      smsFallback?: { to: string; body: string };
    };

/**
 * Enqueues notifications — NEVER sends synchronously in the request path
 * (PRD 7.3: 1M pushes/hour must be queue-backed and horizontally scalable).
 */
@Injectable()
export class NotificationService {
  constructor(@InjectQueue(NOTIFICATION_QUEUE) private readonly queue: Queue) {}

  async enqueue(job: NotificationJob): Promise<void> {
    await this.queue.add(job.channel, job, { attempts: 3 });
  }

  async enqueueMany(jobs: NotificationJob[]): Promise<void> {
    await this.queue.addBulk(
      jobs.map((data) => ({ name: data.channel, data, opts: { attempts: 3 } })),
    );
  }
}
