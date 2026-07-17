import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import type { Job, Queue } from 'bullmq';
import { MAINTENANCE_QUEUE } from '../messaging/queue.tokens';
import { UsersMaintenanceService } from './users-maintenance.service';

/** Registers daily NDPA retention jobs and executes them. */
@Injectable()
@Processor(MAINTENANCE_QUEUE)
export class UsersMaintenanceProcessor extends WorkerHost implements OnModuleInit {
  private readonly logger = new Logger(UsersMaintenanceProcessor.name);

  constructor(
    private readonly svc: UsersMaintenanceService,
    @InjectQueue(MAINTENANCE_QUEUE) private readonly queue: Queue,
  ) {
    super();
  }

  async onModuleInit(): Promise<void> {
    // Idempotent repeatable schedule (daily at 03:00).
    await this.queue.add('purge-deletions', {}, { repeat: { pattern: '0 3 * * *' }, jobId: 'purge-deletions' });
    await this.queue.add(
      'downgrade-contacts',
      {},
      { repeat: { pattern: '30 3 * * *' }, jobId: 'downgrade-contacts' },
    );
  }

  async process(job: Job): Promise<void> {
    switch (job.name) {
      case 'purge-deletions': {
        const n = await this.svc.purgeDueDeletions();
        this.logger.log(`Purged ${n} accounts`);
        break;
      }
      case 'downgrade-contacts': {
        const n = await this.svc.downgradeUnderMinimumContacts();
        this.logger.log(`Flagged ${n} accounts as INCOMPLETE`);
        break;
      }
    }
  }
}
