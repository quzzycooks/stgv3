import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import type { Queue } from 'bullmq';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis.module';
import { EVENT_RETRY_QUEUE } from './queue.tokens';
import { DomainEvent, EventType } from './events';

export type EventHandler = (event: DomainEvent) => Promise<void>;

interface Subscription {
  name: string; // stable id so a failed handler can be re-invoked from the retry queue
  handler: EventHandler;
}

/**
 * In-process fan-out with **failure isolation** (PRD 8.2). Each subscriber runs
 * independently; one throwing does NOT stop the others (Promise.allSettled).
 * Failed subscribers are enqueued for retry with backoff so a transient outage
 * degrades gracefully instead of failing the whole critical path.
 *
 * Events are also appended to a Redis Stream for durability/replay (best-effort;
 * a stream write failure never blocks live dispatch).
 */
@Injectable()
export class EventBus {
  private readonly logger = new Logger(EventBus.name);
  private readonly subs = new Map<EventType, Subscription[]>();
  private readonly byName = new Map<string, EventHandler>();

  constructor(
    @Optional() @Inject(REDIS_CLIENT) private readonly redis?: Redis,
    @Optional() @Inject(EVENT_RETRY_QUEUE) private readonly retryQueue?: Queue,
  ) {}

  subscribe(type: EventType, name: string, handler: EventHandler): void {
    const list = this.subs.get(type) ?? [];
    list.push({ name, handler });
    this.subs.set(type, list);
    this.byName.set(name, handler);
  }

  /** Re-invoke a single named handler (used by the retry worker). */
  async invokeHandler(name: string, event: DomainEvent): Promise<void> {
    const handler = this.byName.get(name);
    if (!handler) {
      this.logger.error(`No handler registered for "${name}" — dropping retry`);
      return;
    }
    await handler(event);
  }

  async publish(event: DomainEvent): Promise<void> {
    // Durability (best-effort, non-blocking to the fan-out).
    if (this.redis) {
      try {
        await this.redis.xadd('events', '*', 'type', event.type, 'data', JSON.stringify(event));
      } catch (err) {
        this.logger.warn(`Event stream persist failed for ${event.type}: ${(err as Error).message}`);
      }
    }

    const subs = this.subs.get(event.type) ?? [];
    const results = await Promise.allSettled(subs.map((s) => s.handler(event)));

    results.forEach((res, i) => {
      if (res.status === 'rejected') {
        const sub = subs[i];
        this.logger.error(
          `Subscriber "${sub.name}" failed for ${event.type}: ${res.reason?.message ?? res.reason}`,
        );
        // Enqueue for retry; if the queue itself is unavailable we've at least
        // logged and the other subscribers already ran (graceful degradation).
        this.retryQueue
          ?.add(
            'retry',
            { handlerName: sub.name, event },
            { attempts: 3, backoff: { type: 'exponential', delay: 2000 } },
          )
          .catch((e) => this.logger.error(`Failed to enqueue retry: ${e.message}`));
      }
    });
  }
}
