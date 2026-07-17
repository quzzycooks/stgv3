import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { DISPATCH_QUEUE } from '../messaging/queue.tokens';
import { TransportService } from './transport.service';

/** Drives dispatch timers: offer timeout, radius expansion, no-show. */
@Processor(DISPATCH_QUEUE, { concurrency: 20 })
export class DispatchProcessor extends WorkerHost {
  constructor(private readonly transport: TransportService) {
    super();
  }

  async process(job: Job): Promise<void> {
    switch (job.name) {
      case 'offer-timeout':
        await this.transport.onOfferTimeout(job.data.dispatchId);
        break;
      case 'no-show':
        await this.transport.onNoShow(job.data.dispatchId);
        break;
      case 'expand-radius':
        await this.transport.continueDispatch(job.data.incidentId, job.data.radiusKm);
        break;
    }
  }
}
