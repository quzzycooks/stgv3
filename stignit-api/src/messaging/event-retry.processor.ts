import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { EventBus } from './event-bus.service';
import { DomainEvent } from './events';
import { EVENT_RETRY_QUEUE } from './queue.tokens';

/** Re-invokes a single failed subscriber with BullMQ's backoff (PRD 8.2 recovery). */
@Processor(EVENT_RETRY_QUEUE)
export class EventRetryProcessor extends WorkerHost {
  private readonly logger = new Logger(EventRetryProcessor.name);

  constructor(private readonly bus: EventBus) {
    super();
  }

  async process(job: Job<{ handlerName: string; event: DomainEvent }>): Promise<void> {
    this.logger.log(`Retrying handler "${job.data.handlerName}" for ${job.data.event.type}`);
    await this.bus.invokeHandler(job.data.handlerName, job.data.event);
  }
}
