import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import type { Job, Queue } from 'bullmq';
import { DNA_QUEUE } from '../messaging/queue.tokens';
import { IncidentDnaService } from './incident-dna.service';
import { RiskZoneService } from './risk-zone.service';

/** Scheduled DNA jobs: weekly risk clustering + 24-month raw-record purge. */
@Injectable()
@Processor(DNA_QUEUE)
export class DnaMaintenanceProcessor extends WorkerHost implements OnModuleInit {
  private readonly logger = new Logger(DnaMaintenanceProcessor.name);

  constructor(
    private readonly dna: IncidentDnaService,
    private readonly riskZones: RiskZoneService,
    @InjectQueue(DNA_QUEUE) private readonly queue: Queue,
  ) {
    super();
  }

  async onModuleInit(): Promise<void> {
    await this.queue.add('risk-cluster', {}, { repeat: { pattern: '0 4 * * 1' }, jobId: 'risk-cluster' }); // Mondays 04:00
    await this.queue.add('dna-purge', {}, { repeat: { pattern: '0 5 * * *' }, jobId: 'dna-purge' });
  }

  async process(job: Job): Promise<void> {
    if (job.name === 'risk-cluster') {
      const { zones } = await this.riskZones.recompute();
      this.logger.log(`Risk clustering complete: ${zones} zones`);
    } else if (job.name === 'dna-purge') {
      const n = await this.dna.purgeExpired();
      this.logger.log(`Purged ${n} expired incidents`);
    }
  }
}
