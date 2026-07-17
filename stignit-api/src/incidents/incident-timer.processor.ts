import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { INCIDENT_TIMER_QUEUE } from '../messaging/queue.tokens';
import { SituationRoomService } from './situation-room.service';

/** Fires the 90s proximity-silent flag if the user never confirmed (PRD 6.5.3). */
@Processor(INCIDENT_TIMER_QUEUE)
export class IncidentTimerProcessor extends WorkerHost {
  constructor(private readonly rooms: SituationRoomService) {
    super();
  }

  async process(job: Job<{ incidentId: string; userId: string }>): Promise<void> {
    if (job.name === 'proximity-silent') {
      await this.rooms.flagSilentIfUnconfirmed(job.data.incidentId, job.data.userId);
    }
  }
}
