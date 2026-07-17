import { BullModule, getQueueToken } from '@nestjs/bullmq';
import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventBus } from './event-bus.service';
import { EventRetryProcessor } from './event-retry.processor';
import {
  DISPATCH_QUEUE,
  EVENT_RETRY_QUEUE,
  DNA_QUEUE,
  INCIDENT_TIMER_QUEUE,
  INSTITUTIONAL_QUEUE,
  MAINTENANCE_QUEUE,
  NOTIFICATION_QUEUE,
  WELFARE_QUEUE,
} from './queue.tokens';

const QUEUES = [
  NOTIFICATION_QUEUE,
  INSTITUTIONAL_QUEUE,
  DISPATCH_QUEUE,
  EVENT_RETRY_QUEUE,
  MAINTENANCE_QUEUE,
  INCIDENT_TIMER_QUEUE,
  WELFARE_QUEUE,
  DNA_QUEUE,
];

/**
 * Central messaging: BullMQ queues + the failure-isolating EventBus (PRD 8.2).
 * Global so any domain module can publish/subscribe and enqueue jobs.
 */
@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get('redis.host'),
          port: config.get('redis.port'),
          password: config.get('redis.password'),
        },
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
          removeOnComplete: 1000,
          removeOnFail: 5000,
        },
      }),
    }),
    ...QUEUES.map((name) => BullModule.registerQueue({ name })),
  ],
  providers: [
    EventBus,
    EventRetryProcessor,
    // Alias the raw token so EventBus can inject the retry queue without the
    // @nestjs/bullmq decorator (keeps EventBus unit-testable).
    { provide: EVENT_RETRY_QUEUE, useExisting: getQueueToken(EVENT_RETRY_QUEUE) },
  ],
  exports: [EventBus, BullModule],
})
export class MessagingModule {}
